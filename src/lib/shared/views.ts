// View model: a view is a saved Gmail query (compiled from filters) + grouping + visible properties.
import type { ThreadSummary, Label } from './types';

export const INKS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'] as const;
export type Ink = (typeof INKS)[number];

export const GLYPHS = [
  'inbox', 'alert', 'bolt', 'tag', 'book', 'archive', 'cal', 'mail', 'layers', 'bell', 'chat', 'basket', 'star', 'list', 'cart', 'plane', 'phone', 'flag', 'heart', 'briefcase',
] as const;
export type Glyph = (typeof GLYPHS)[number];

export type MailboxKey = 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'starred' | 'snoozed';
export type GmailCategory = 'primary' | 'social' | 'promotions' | 'updates' | 'forums';

export type FilterRule =
  | { id: string; field: 'mailbox'; op: 'is' | 'isNot'; values: MailboxKey[] }
  | { id: string; field: 'read'; value: 'unread' | 'read' }
  | { id: string; field: 'attachment' }
  | { id: string; field: 'calendar' }
  | { id: string; field: 'starred' }
  | { id: string; field: 'important' }
  | { id: string; field: 'label'; op: 'is' | 'isNot'; values: string[] }
  | { id: string; field: 'from' | 'to' | 'cc' | 'bcc' | 'subject'; op: 'contains' | 'notContains'; values: string[] }
  | { id: string; field: 'date'; op: 'newerThan' | 'olderThan' | 'after' | 'before'; value: string }
  | { id: string; field: 'category'; op: 'is' | 'isNot'; values: GmailCategory[] }
  | { id: string; field: 'query'; value: string };

export type FilterField = FilterRule['field'];

export type GroupBy =
  | { kind: 'none' }
  | { kind: 'date' }
  | { kind: 'starred' }
  | { kind: 'important' }
  | { kind: 'sender' }
  | { kind: 'domain' }
  | { kind: 'label' }
  | { kind: 'unread' }
  | { kind: 'keywords'; keywords: string[] }
  | { kind: 'property'; propertyId: string };

export type BuiltinProp = 'from' | 'subject' | 'snippet' | 'labels' | 'date' | 'files';
export const BUILTIN_PROPS: BuiltinProp[] = ['from', 'subject', 'snippet', 'labels', 'date', 'files'];

export type HoverAction = 'archive' | 'trash' | 'read' | 'remind' | 'label' | 'star';
export const ALL_HOVER_ACTIONS: HoverAction[] = ['archive', 'trash', 'read', 'remind', 'label', 'star'];

export interface View {
  id: string;
  name: string;
  glyph: Glyph;
  ink: Ink;
  filters: FilterRule[];
  groupBy: GroupBy;
  /** Ordered list of visible properties: builtin keys or custom property ids ("prop:<id>"). */
  shown: string[];
  hoverActions: HoverAction[];
  notify: boolean;
  /** Set when the view was created from an auto label. */
  autoLabelId?: string;
}

// ---------- Gmail query compilation ----------

/** Quote a value for Gmail search when it contains spaces or operators. */
export function quoteTerm(v: string): string {
  const t = v.trim().replace(/"/g, '');
  if (!t) return '';
  return /[\s(){}:]/.test(t) ? `"${t}"` : t;
}

const MAILBOX_Q: Record<MailboxKey, string> = {
  inbox: 'in:inbox', sent: 'in:sent', drafts: 'in:drafts', spam: 'in:spam', trash: 'in:trash', starred: 'is:starred', snoozed: 'in:snoozed',
};

function anyOf(parts: string[]): string {
  const p = parts.filter(Boolean);
  if (p.length === 0) return '';
  return p.length === 1 ? p[0]! : `{${p.join(' ')}}`;
}

/** Gmail label names in search use dashes for spaces and slashes; quoting handles the rest. */
export function labelTerm(name: string): string {
  return `label:${quoteTerm(name.trim().replace(/[\s/]+/g, '-'))}`;
}

export function compileRule(r: FilterRule): string {
  switch (r.field) {
    case 'mailbox': {
      const terms = r.values.map((v) => MAILBOX_Q[v]);
      return r.op === 'is' ? anyOf(terms) : terms.map((t) => `-${t}`).join(' ');
    }
    case 'read': return r.value === 'unread' ? 'is:unread' : 'is:read';
    case 'attachment': return 'has:attachment';
    case 'calendar': return 'filename:ics';
    case 'starred': return 'is:starred';
    case 'important': return 'is:important';
    case 'label': {
      const terms = r.values.map(labelTerm);
      return r.op === 'is' ? anyOf(terms) : terms.map((t) => `-${t}`).join(' ');
    }
    case 'from': case 'to': case 'cc': case 'bcc': case 'subject': {
      const terms = r.values.map(quoteTerm).filter(Boolean).map((v) => `${r.field}:${v}`);
      return r.op === 'contains' ? anyOf(terms) : terms.map((t) => `-${t}`).join(' ');
    }
    case 'date': {
      if (r.op === 'newerThan') return /^\d+[dmy]$/.test(r.value) ? `newer_than:${r.value}` : '';
      if (r.op === 'olderThan') return /^\d+[dmy]$/.test(r.value) ? `older_than:${r.value}` : '';
      const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(r.value);
      return d ? `${r.op}:${d[1]}/${d[2]}/${d[3]}` : '';
    }
    case 'category': {
      const terms = r.values.map((c) => `category:${c}`);
      return r.op === 'is' ? anyOf(terms) : terms.map((t) => `-${t}`).join(' ');
    }
    case 'query': return r.value.trim() ? `(${r.value.trim()})` : '';
  }
}

export function compileView(filters: FilterRule[], extra?: string): string {
  const parts = filters.map(compileRule).filter(Boolean);
  if (extra?.trim()) parts.push(`(${extra.trim()})`);
  return parts.join(' ');
}

// ---------- Grouping ----------

export interface ThreadGroup {
  key: string;
  title: string;
  /** Optional monogram shown before the title (sender/domain/keyword groups). */
  monogram?: string;
  threads: ThreadSummary[];
}

const DAY = 86_400_000;

export function dateBucket(ts: number, now = Date.now()): { key: string; title: string } {
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  if (ts >= t0) return { key: '0-today', title: 'Today' };
  if (ts >= t0 - DAY) return { key: '1-yesterday', title: 'Yesterday' };
  if (ts >= t0 - 7 * DAY) return { key: '2-week', title: 'Last 7 days' };
  if (ts >= t0 - 30 * DAY) return { key: '3-month', title: 'Last 30 days' };
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  const title = d.toLocaleString('en-US', sameYear ? { month: 'long' } : { month: 'long', year: 'numeric' });
  const key = `4-${String(9999 - d.getFullYear()).padStart(4, '0')}-${String(99 - d.getMonth()).padStart(2, '0')}`;
  return { key, title };
}

export function monogramOf(s: string): string {
  const clean = s.replace(/@.*$/, '').replace(/[^A-Za-z0-9 ._-]/g, ' ').trim();
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

export function domainOf(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : email.toLowerCase();
}

/** The newest external sender of a thread, falling back to the last participant. */
export function primarySender(t: ThreadSummary, me: string): { name: string; email: string } {
  const others = t.participants.filter((p) => p.email.toLowerCase() !== me.toLowerCase());
  return others[others.length - 1] ?? t.participants[t.participants.length - 1] ?? { name: '', email: '' };
}

export function groupThreads(
  threads: ThreadSummary[],
  groupBy: GroupBy,
  opts: { me: string; labels: Label[]; propertyValue?: (threadId: string) => string | null; propertyOptions?: string[]; now?: number },
): ThreadGroup[] {
  const map = new Map<string, ThreadGroup>();
  const order: string[] = [];
  const push = (key: string, title: string, t: ThreadSummary, monogram?: string) => {
    let g = map.get(key);
    if (!g) { g = { key, title, threads: [], monogram }; map.set(key, g); order.push(key); }
    g.threads.push(t);
  };
  switch (groupBy.kind) {
    case 'none':
      return [{ key: 'all', title: '', threads }];
    case 'date': {
      for (const t of threads) { const b = dateBucket(t.lastDate, opts.now); push(b.key, b.title, t); }
      return order.sort().map((k) => map.get(k)!);
    }
    case 'starred':
      for (const t of threads) push(t.starred ? '0' : '1', t.starred ? 'Starred' : 'Not starred', t);
      return order.sort().map((k) => map.get(k)!);
    case 'important':
      for (const t of threads) push(t.important ? '0' : '1', t.important ? 'Important' : 'Other', t);
      return order.sort().map((k) => map.get(k)!);
    case 'unread':
      for (const t of threads) push(t.unread ? '0' : '1', t.unread ? 'Unread' : 'Read', t);
      return order.sort().map((k) => map.get(k)!);
    case 'sender':
      for (const t of threads) { const s = primarySender(t, opts.me); push(s.email.toLowerCase(), s.name || s.email, t, monogramOf(s.name || s.email)); }
      return order.map((k) => map.get(k)!);
    case 'domain':
      for (const t of threads) { const d = domainOf(primarySender(t, opts.me).email); push(d, d, t, monogramOf(d)); }
      return order.map((k) => map.get(k)!);
    case 'label': {
      const user = new Map(opts.labels.filter((l) => l.type === 'user').map((l) => [l.id, l.name]));
      for (const t of threads) {
        const ls = t.labelIds.filter((id) => user.has(id));
        if (ls.length === 0) push('~none', 'No label', t);
        else for (const id of ls) push(id, user.get(id)!, t);
      }
      const keys = order.filter((k) => k !== '~none').sort((a, b) => map.get(a)!.title.localeCompare(map.get(b)!.title));
      if (map.has('~none')) keys.push('~none');
      return keys.map((k) => map.get(k)!);
    }
    case 'keywords': {
      const kws = groupBy.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
      for (const t of threads) {
        const hay = t.participants.map((p) => `${p.email} ${p.name}`.toLowerCase()).join(' ');
        const hit = kws.find((k) => hay.includes(k));
        if (hit) push(`k:${hit}`, groupBy.keywords.find((k) => k.trim().toLowerCase() === hit)!.trim(), t, monogramOf(hit));
        else push('~other', 'Other', t);
      }
      const keys = kws.map((k) => `k:${k}`).filter((k) => map.has(k));
      if (map.has('~other')) keys.push('~other');
      return keys.map((k) => map.get(k)!);
    }
    case 'property': {
      const optionsOrder = opts.propertyOptions ?? [];
      for (const t of threads) { const v = opts.propertyValue?.(t.id) ?? null; push(v ?? '~empty', v ?? 'Empty', t); }
      const keys = [...optionsOrder.filter((o) => map.has(o)), ...order.filter((k) => !optionsOrder.includes(k) && k !== '~empty')];
      if (map.has('~empty')) keys.push('~empty');
      return keys.map((k) => map.get(k)!);
    }
  }
}

// ---------- Presets ----------

export function uid(prefix = ''): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '').slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return prefix + rnd;
}

export function baseView(partial: Partial<View> & Pick<View, 'name'>): View {
  return {
    id: uid('v_'), glyph: 'inbox', ink: 'gray', filters: [], groupBy: { kind: 'date' },
    shown: ['from', 'subject', 'labels', 'date', 'files'], hoverActions: ['archive', 'trash', 'read', 'remind', 'label'], notify: false,
    ...partial,
  };
}

/** Onboarding categories: each maps to a Gmail search (Gmail categories and attachments are the closest real signals). */
export const ONBOARDING_CATEGORIES = [
  { key: 'calendar', name: 'Calendar', glyph: 'cal', ink: 'orange', rule: { field: 'calendar' } },
  { key: 'notifications', name: 'Notifications', glyph: 'bell', ink: 'purple', rule: { field: 'category', op: 'is', values: ['updates'] } },
  { key: 'lists', name: 'Mailing lists', glyph: 'list', ink: 'pink', rule: { field: 'category', op: 'is', values: ['forums'] } },
  { key: 'social', name: 'Social', glyph: 'chat', ink: 'blue', rule: { field: 'category', op: 'is', values: ['social'] } },
  { key: 'promotions', name: 'Promotions', glyph: 'basket', ink: 'green', rule: { field: 'category', op: 'is', values: ['promotions'] } },
] as const;

export type OnboardingKey = (typeof ONBOARDING_CATEGORIES)[number]['key'];

function negate(rule: (typeof ONBOARDING_CATEGORIES)[number]['rule']): FilterRule {
  if (rule.field === 'calendar') return { id: uid('f_'), field: 'query', value: '-filename:ics' };
  return { id: uid('f_'), field: 'category', op: 'isNot', values: [...rule.values] };
}

export function defaultViews(included: OnboardingKey[]): View[] {
  const excluded = ONBOARDING_CATEGORIES.filter((c) => !included.includes(c.key));
  const inbox = baseView({
    name: 'Inbox', glyph: 'inbox', ink: 'red', notify: true,
    filters: [{ id: uid('f_'), field: 'mailbox', op: 'is', values: ['inbox'] }, ...excluded.map((c) => negate(c.rule))],
  });
  const labels = baseView({ name: 'Labels', glyph: 'tag', ink: 'green', filters: [{ id: uid('f_'), field: 'query', value: 'has:userlabels' }], groupBy: { kind: 'label' } });
  const unread = baseView({ name: 'Unread', glyph: 'alert', ink: 'orange', filters: [{ id: uid('f_'), field: 'mailbox', op: 'is', values: ['inbox'] }, { id: uid('f_'), field: 'read', value: 'unread' }] });
  const cats = excluded.map((c) => baseView({ name: c.name, glyph: c.glyph, ink: c.ink, filters: [{ id: uid('f_'), ...c.rule } as FilterRule] }));
  return [inbox, unread, labels, ...cats];
}

export interface ViewTemplate {
  key: string;
  name: string;
  description: string;
  glyph: Glyph;
  ink: Ink;
  make: () => View;
}

export const VIEW_TEMPLATES: ViewTemplate[] = [
  { key: 'priority', name: 'Priority', description: 'Starred and important email', glyph: 'flag', ink: 'red', make: () => baseView({ name: 'Priority', glyph: 'flag', ink: 'red', filters: [{ id: uid('f_'), field: 'query', value: 'is:starred OR is:important' }, { id: uid('f_'), field: 'mailbox', op: 'is', values: ['inbox'] }], groupBy: { kind: 'starred' } }) },
  { key: 'unread', name: 'Unread', description: 'Everything you haven’t read yet', glyph: 'alert', ink: 'orange', make: () => baseView({ name: 'Unread', glyph: 'alert', ink: 'orange', filters: [{ id: uid('f_'), field: 'read', value: 'unread' }] }) },
  { key: 'calendar', name: 'Calendar', description: 'Invitations and event updates', glyph: 'cal', ink: 'orange', make: () => baseView({ name: 'Calendar', glyph: 'cal', ink: 'orange', filters: [{ id: uid('f_'), field: 'calendar' }] }) },
  { key: 'categories', name: 'Categories', description: 'Group email by Gmail category', glyph: 'layers', ink: 'purple', make: () => baseView({ name: 'Categories', glyph: 'layers', ink: 'purple', filters: [{ id: uid('f_'), field: 'mailbox', op: 'is', values: ['inbox'] }], groupBy: { kind: 'label' } }) },
  { key: 'attachments', name: 'Files', description: 'Threads with attachments', glyph: 'briefcase', ink: 'brown', make: () => baseView({ name: 'Files', glyph: 'briefcase', ink: 'brown', filters: [{ id: uid('f_'), field: 'attachment' }], groupBy: { kind: 'date' } }) },
  { key: 'people', name: 'People', description: 'Group recent mail by sender', glyph: 'chat', ink: 'blue', make: () => baseView({ name: 'People', glyph: 'chat', ink: 'blue', filters: [{ id: uid('f_'), field: 'mailbox', op: 'is', values: ['inbox'] }, { id: uid('f_'), field: 'date', op: 'newerThan', value: '30d' }], groupBy: { kind: 'sender' } }) },
  { key: 'newsletters', name: 'Newsletters', description: 'Mailing lists and updates', glyph: 'book', ink: 'yellow', make: () => baseView({ name: 'Newsletters', glyph: 'book', ink: 'yellow', filters: [{ id: uid('f_'), field: 'category', op: 'is', values: ['forums', 'updates'] }], groupBy: { kind: 'domain' } }) },
  { key: 'promotions', name: 'Promotions', description: 'Deals and marketing email', glyph: 'basket', ink: 'green', make: () => baseView({ name: 'Promotions', glyph: 'basket', ink: 'green', filters: [{ id: uid('f_'), field: 'category', op: 'is', values: ['promotions'] }], groupBy: { kind: 'domain' } }) },
  { key: 'travel', name: 'Travel', description: 'Bookings and itineraries', glyph: 'plane', ink: 'blue', make: () => baseView({ name: 'Travel', glyph: 'plane', ink: 'blue', filters: [{ id: uid('f_'), field: 'query', value: 'flight OR itinerary OR booking OR reservation OR "boarding pass"' }] }) },
  { key: 'receipts', name: 'Receipts', description: 'Invoices, orders and payments', glyph: 'cart', ink: 'green', make: () => baseView({ name: 'Receipts', glyph: 'cart', ink: 'green', filters: [{ id: uid('f_'), field: 'query', value: 'receipt OR invoice OR "order confirmation" OR "payment received"' }], groupBy: { kind: 'domain' } }) },
  { key: 'minimal', name: 'Minimalist', description: 'A stripped-down view of your inbox', glyph: 'list', ink: 'gray', make: () => baseView({ name: 'Minimalist', glyph: 'list', ink: 'gray', filters: [{ id: uid('f_'), field: 'mailbox', op: 'is', values: ['inbox'] }], groupBy: { kind: 'none' }, shown: ['from', 'subject', 'date'] }) },
];
