import 'server-only';
// Offline demo mailbox (ZL_DEMO=1). Fictional people and companies; state lives in memory for the process.
import type {
  Address, BusyInterval, GmailFilter, Label, MessageDetail, OutgoingMessage, SendAs, ThreadDetail, ThreadPage, ThreadSummary,
} from '../shared/types';
import { htmlToText } from './mime';
import { ProviderError, type DraftRef, type MailProvider, type NewFilter, type NewLabel } from './provider';
import { matches, type SearchDoc } from './search';

export const DEMO_ACCOUNT = { id: 'demo', email: 'alex@northwind.io', name: 'Alex Morgan', picture: null } as const;
const ME: Address = { name: DEMO_ACCOUNT.name, email: DEMO_ACCOUNT.email };

interface DemoMessage extends MessageDetail { draftId?: string }
interface DemoState {
  messages: DemoMessage[];
  labels: Label[];
  filters: GmailFilter[];
  seq: number;
}

const H = 3_600_000;
const D = 24 * H;

function p(...paras: string[]): { html: string; text: string } {
  return { html: paras.map((x) => `<p>${x}</p>`).join(''), text: paras.join('\n\n') };
}

function seed(): DemoState {
  const now = Date.now();
  const labels: Label[] = [
    ...['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'STARRED', 'IMPORTANT', 'UNREAD', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS']
      .map((id) => ({ id, name: id, type: 'system' as const, color: null })),
    { id: 'Label_1', name: 'Action required', type: 'user', color: null },
    { id: 'Label_2', name: 'Finance', type: 'user', color: null },
    { id: 'Label_3', name: 'Travel', type: 'user', color: null },
    { id: 'Label_4', name: 'Receipts', type: 'user', color: null },
    { id: 'Label_5', name: 'Hiring', type: 'user', color: null },
  ];
  const msgs: DemoMessage[] = [];
  let n = 0;
  const add = (o: {
    thread: string; from: Address; to?: Address[]; cc?: Address[]; subject: string; ago: number; body: { html: string; text: string };
    labels: string[]; attachments?: { filename: string; mimeType: string; size: number }[];
  }) => {
    n++;
    msgs.push({
      id: `m${n}`, threadId: o.thread, labelIds: o.labels, from: o.from, to: o.to ?? [ME], cc: o.cc ?? [], bcc: [], replyTo: [],
      subject: o.subject, date: now - o.ago, snippet: o.body.text.slice(0, 140), html: o.body.html, text: o.body.text,
      attachments: (o.attachments ?? []).map((a, i) => ({ attachmentId: `att_${n}_${i}`, partId: String(i + 1), filename: a.filename, mimeType: a.mimeType, size: a.size, inline: false })),
      messageIdHeader: `<demo-${n}@northwind.io>`, references: null, listUnsubscribe: null,
    });
  };
  const priya = { name: 'Priya Raman', email: 'priya@raman.co' };
  const jonas = { name: 'Jonas Beck', email: 'jonas@beckstudio.de' };
  const mina = { name: 'Mina Okafor', email: 'mina@northwind.io' };
  const ops = { name: 'Ops Weekly', email: 'ops@northwind.io' };
  const cloud = { name: 'CloudNest Billing', email: 'billing@cloudnest.dev' };
  const air = { name: 'Skylark Air', email: 'noreply@skylark-air.com' };
  const lena = { name: 'Lena Duarte', email: 'lena.duarte@fieldnote.org' };
  const news = { name: 'The Build Log', email: 'hello@buildlog.news' };
  const social = { name: 'Linkfolk', email: 'notifications@linkfolk.com' };
  const promo = { name: 'Paperlane', email: 'offers@paperlane.shop' };
  const cal = { name: 'Sam Whitaker', email: 'sam@whitaker.vc' };
  const git = { name: 'Codeharbor', email: 'noreply@codeharbor.dev' };

  add({ thread: 't1', from: priya, subject: 'Term sheet redlines', ago: 2 * H, labels: ['INBOX', 'UNREAD', 'IMPORTANT', 'Label_1', 'Label_2', 'CATEGORY_PERSONAL'],
    body: p('Hi Alex,', 'Two open points on the option pool before we can sign. I’ve marked both in the doc and suggested wording for the vesting clause.', 'Could you look before Thursday’s call? Happy to walk through it live.', '— Priya'),
    attachments: [{ filename: 'Term sheet v3 (redlined).pdf', mimeType: 'application/pdf', size: 248_000 }] });
  add({ thread: 't1', from: ME, to: [priya], subject: 'Re: Term sheet redlines', ago: 90 * 60_000, labels: ['SENT'], body: p('Thanks Priya, I’ll go through both tonight.') });
  add({ thread: 't1', from: priya, subject: 'Re: Term sheet redlines', ago: 40 * 60_000, labels: ['INBOX', 'UNREAD', 'IMPORTANT', 'Label_1', 'Label_2', 'CATEGORY_PERSONAL'], body: p('Perfect. One more thing: legal wants the signed copy by Friday noon.') });
  add({ thread: 't2', from: jonas, subject: 'Can we move Thursday?', ago: 3 * H, labels: ['INBOX', 'UNREAD', 'Label_1', 'CATEGORY_PERSONAL'],
    body: p('Hey Alex,', 'Something came up on Thursday afternoon. Could we move our session to Friday morning, or early next week?', 'Jonas') });
  add({ thread: 't3', from: ops, subject: 'Vendor renewal due Friday', ago: 5 * H, labels: ['INBOX', 'Label_1', 'Label_2', 'CATEGORY_UPDATES'],
    body: p('The CloudNest contract renews on Friday. Approve or flag changes in the vendor sheet by Thursday EOD.') });
  add({ thread: 't4', from: mina, cc: [priya], subject: 'Offsite venue shortlist', ago: 26 * H, labels: ['INBOX', 'Label_3', 'CATEGORY_PERSONAL'],
    body: p('Hi both,', 'Attached are the three venues that fit our dates and budget. My favourite is the lake house: 18 rooms, a big workshop space and it’s 90 minutes from the office.', 'Can you vote by Wednesday?'),
    attachments: [{ filename: 'Venue shortlist.pdf', mimeType: 'application/pdf', size: 1_420_000 }, { filename: 'lakehouse.jpg', mimeType: 'image/jpeg', size: 820_000 }] });
  add({ thread: 't5', from: cloud, subject: 'Your invoice for September is ready', ago: 30 * H, labels: ['INBOX', 'Label_4', 'CATEGORY_UPDATES'],
    body: p('Invoice INV-20931 for $1,284.00 is now available. Payment will be taken on 1 October.'), attachments: [{ filename: 'INV-20931.pdf', mimeType: 'application/pdf', size: 64_000 }] });
  add({ thread: 't6', from: air, subject: 'Your trip to Lisbon: booking confirmed', ago: 3 * D, labels: ['INBOX', 'Label_3', 'CATEGORY_UPDATES'],
    body: p('Booking reference QX7L2M. Outbound Thu 16 Oct, 07:40 → 10:05. Return Sun 19 Oct, 18:20 → 22:30.', 'Check-in opens 24 hours before departure.') });
  add({ thread: 't7', from: cal, subject: 'Invitation: Board prep @ Tue 3pm', ago: 2 * D, labels: ['INBOX', 'UNREAD', 'CATEGORY_PERSONAL'],
    body: p('Sam Whitaker has invited you to Board prep on Tuesday at 3:00 PM – 4:00 PM.', 'Join with Meet: meet.example.com/abc-defg-hij'), attachments: [{ filename: 'invite.ics', mimeType: 'text/calendar', size: 2_100 }] });
  add({ thread: 't8', from: lena, subject: 'Intro: Lena ↔ Alex (design hire)', ago: 4 * D, labels: ['INBOX', 'Label_5', 'CATEGORY_PERSONAL'],
    body: p('Hi Alex, great to be introduced by Mina. I’ve led product design at two email and productivity startups and would love to hear about the role.', 'Portfolio: fieldnote.org/lena') });
  add({ thread: 't8', from: ME, to: [lena], subject: 'Re: Intro: Lena ↔ Alex (design hire)', ago: 3.5 * D, labels: ['SENT'], body: p('Hi Lena, thanks! Could you do a 30 minute call next week?') });
  add({ thread: 't8', from: lena, subject: 'Re: Intro: Lena ↔ Alex (design hire)', ago: 3 * D, labels: ['INBOX', 'Label_5', 'CATEGORY_PERSONAL'], body: p('Absolutely. Tuesday or Wednesday afternoon works best for me.') });
  add({ thread: 't9', from: news, subject: 'The Build Log #142: shipping faster with smaller PRs', ago: 1.5 * D, labels: ['INBOX', 'CATEGORY_FORUMS'], body: p('This week: small pull requests, a teardown of three onboarding flows, and five tools we tried.') });
  add({ thread: 't10', from: social, subject: 'You appeared in 12 searches this week', ago: 2.2 * D, labels: ['INBOX', 'CATEGORY_SOCIAL'], body: p('See who’s looking at your profile.') });
  add({ thread: 't11', from: promo, subject: '30% off notebooks this weekend', ago: 2.5 * D, labels: ['INBOX', 'CATEGORY_PROMOTIONS'], body: p('Our autumn sale starts now. Free shipping over $40.') });
  add({ thread: 't12', from: git, subject: '[northwind/web] Build failed on main', ago: 6 * H, labels: ['INBOX', 'UNREAD', 'CATEGORY_UPDATES'], body: p('Run #4812 failed: 2 tests failed in thread-list.spec.ts.') });
  add({ thread: 't13', from: jonas, subject: 'Moodboard for the launch video', ago: 9 * D, labels: ['INBOX', 'STARRED', 'CATEGORY_PERSONAL'], body: p('Here’s the moodboard. Calm, lots of white, one accent colour.'), attachments: [{ filename: 'moodboard.png', mimeType: 'image/png', size: 2_300_000 }] });
  add({ thread: 't14', from: ops, subject: 'Q3 numbers are in', ago: 12 * D, labels: ['Label_2', 'CATEGORY_UPDATES'], body: p('Revenue up 18% quarter on quarter. Full deck in the drive.') });
  add({ thread: 't15', from: cloud, subject: 'Your invoice for August is ready', ago: 32 * D, labels: ['Label_4', 'CATEGORY_UPDATES'], body: p('Invoice INV-19877 for $1,190.00 is now available.') });
  add({ thread: 't16', from: priya, subject: 'Coffee next week?', ago: 40 * D, labels: ['CATEGORY_PERSONAL'], body: p('Would be great to catch up outside of deal stuff.') });
  add({ thread: 't17', from: ME, to: [ops], subject: 'Headcount plan draft', ago: 20 * H, labels: ['DRAFT'], body: p('Draft: proposing two hires in Q4…') });
  msgs[msgs.length - 1]!.draftId = 'r1';
  add({ thread: 't18', from: { name: 'Prize Center', email: 'winner@lucky-prize.biz' }, subject: 'You won!!!', ago: 1 * D, labels: ['SPAM'], body: p('Claim now.') });

  return { messages: msgs, labels, filters: [], seq: 1000 };
}

const g = globalThis as unknown as { __zlDemo?: DemoState };
function state(): DemoState {
  if (!g.__zlDemo) g.__zlDemo = seed();
  return g.__zlDemo;
}

function threadMessages(id: string): DemoMessage[] {
  return state().messages.filter((m) => m.threadId === id).sort((a, b) => a.date - b.date);
}

function labelName(id: string): string | null {
  const l = state().labels.find((x) => x.id === id);
  return l && l.type === 'user' ? l.name : null;
}

function docFor(threadId: string): SearchDoc {
  const ms = threadMessages(threadId);
  const labels = [...new Set(ms.flatMap((m) => m.labelIds))];
  const addr = (as: Address[]) => as.map((a) => `${a.name} ${a.email}`).join(' ');
  return {
    labels,
    labelNames: labels.map(labelName).filter((x): x is string => !!x),
    from: ms.map((m) => (m.from ? `${m.from.name} ${m.from.email}` : '')).join(' '),
    to: ms.map((m) => addr(m.to)).join(' '),
    cc: ms.map((m) => addr(m.cc)).join(' '),
    bcc: '',
    subject: ms.map((m) => m.subject).join(' '),
    body: ms.map((m) => m.text ?? '').join(' '),
    date: Math.max(...ms.map((m) => m.date)),
    hasAttachment: ms.some((m) => m.attachments.some((a) => !a.inline)),
    hasIcs: ms.some((m) => m.attachments.some((a) => a.filename.endsWith('.ics'))),
  };
}

function summaryFor(id: string): ThreadSummary {
  const all = threadMessages(id);
  const real = all.filter((m) => !m.labelIds.includes('DRAFT'));
  const ms = real.length ? real : all;
  const seen = new Set<string>();
  const participants: Address[] = [];
  for (const m of ms) if (m.from && !seen.has(m.from.email)) { seen.add(m.from.email); participants.push(m.from); }
  const recipients: Address[] = [];
  const seenTo = new Set<string>();
  for (const m of ms) for (const a of m.to) if (!seenTo.has(a.email)) { seenTo.add(a.email); recipients.push(a); }
  const labels = new Set<string>();
  all.forEach((m) => m.labelIds.forEach((l) => { if (l !== 'DRAFT' || !real.length) labels.add(l); }));
  const doc = docFor(id);
  return {
    id, historyId: String(state().seq), subject: ms[0]?.subject ?? '', snippet: ms[ms.length - 1]?.snippet ?? '', participants, recipients,
    lastDate: Math.max(...ms.map((m) => m.date)), messageCount: ms.length, labelIds: [...labels],
    unread: ms.some((m) => m.labelIds.includes('UNREAD')), starred: all.some((m) => m.labelIds.includes('STARRED')),
    important: all.some((m) => m.labelIds.includes('IMPORTANT')), hasAttachment: doc.hasAttachment, hasCalendar: doc.hasIcs,
    hasDraft: all.some((m) => m.labelIds.includes('DRAFT')),
  };
}

export class DemoProvider implements MailProvider {
  readonly email = DEMO_ACCOUNT.email;

  async listThreads(q: string, opts: { pageToken?: string; maxResults?: number } = {}): Promise<ThreadPage> {
    const ids = [...new Set(state().messages.map((m) => m.threadId))].filter((id) => matches(q, docFor(id)));
    const sorted = ids.map(summaryFor).sort((a, b) => b.lastDate - a.lastDate);
    const start = Number(opts.pageToken ?? 0);
    const size = opts.maxResults ?? 40;
    const page = sorted.slice(start, start + size);
    return { threads: page, nextPageToken: start + size < sorted.length ? String(start + size) : null, resultSizeEstimate: sorted.length };
  }

  async countThreads(q: string, cap = 100): Promise<number> {
    return Math.min(cap, (await this.listThreads(q, { maxResults: 500 })).threads.length);
  }

  async getThread(id: string): Promise<ThreadDetail> {
    const ms = threadMessages(id);
    if (!ms.length) throw new ProviderError('Thread not found', 404);
    return { id, historyId: String(state().seq), subject: ms[0]!.subject, labelIds: [...new Set(ms.flatMap((m) => m.labelIds))], messages: ms.map((m) => { const copy: MessageDetail & { draftId?: string } = { ...m }; delete copy.draftId; return copy; }) };
  }

  async modifyThreads(ids: string[], add: string[], remove: string[]): Promise<void> {
    for (const m of state().messages) {
      if (!ids.includes(m.threadId)) continue;
      // Drafts keep their own labels; everything else follows Gmail's thread-wide modify.
      if (m.draftId) continue;
      const set = new Set(m.labelIds.filter((l) => !remove.includes(l)));
      for (const a of add) set.add(a);
      m.labelIds = [...set];
    }
    state().seq++;
  }

  async trashThreads(ids: string[]): Promise<void> {
    await this.modifyThreads(ids, ['TRASH'], ['INBOX']);
  }

  async untrashThreads(ids: string[]): Promise<void> {
    await this.modifyThreads(ids, ['INBOX'], ['TRASH']);
  }

  async send(msg: OutgoingMessage, from: Address): Promise<{ id: string; threadId: string }> {
    const s = state();
    const id = `m${++s.seq}`;
    const threadId = msg.threadId ?? `t${s.seq}`;
    s.messages.push({
      id, threadId, labelIds: ['SENT'], from, to: msg.to, cc: msg.cc, bcc: msg.bcc, replyTo: [], subject: msg.subject, date: Date.now(),
      snippet: htmlToText(msg.html).slice(0, 140), html: msg.html, text: msg.text,
      attachments: msg.attachments.map((a, i) => ({ attachmentId: `sent_${id}_${i}`, partId: String(i + 1), filename: a.filename, mimeType: a.mimeType, size: Math.floor((a.data.length * 3) / 4), inline: false })),
      messageIdHeader: `<demo-${id}@northwind.io>`, references: msg.references ?? null, listUnsubscribe: null,
    });
    return { id, threadId };
  }

  async saveDraft(draftId: string | null, msg: OutgoingMessage, from: Address): Promise<DraftRef> {
    const s = state();
    if (draftId) s.messages = s.messages.filter((m) => m.draftId !== draftId);
    const id = `m${++s.seq}`;
    const newDraftId = draftId ?? `r${s.seq}`;
    const threadId = msg.threadId ?? `t${s.seq}`;
    s.messages.push({
      id, threadId, labelIds: ['DRAFT'], from, to: msg.to, cc: msg.cc, bcc: msg.bcc, replyTo: [], subject: msg.subject, date: Date.now(),
      snippet: htmlToText(msg.html).slice(0, 140), html: msg.html, text: msg.text, attachments: [], messageIdHeader: null, references: msg.references ?? null,
      listUnsubscribe: null, draftId: newDraftId,
    });
    return { draftId: newDraftId, messageId: id, threadId };
  }

  async sendDraft(draftId: string): Promise<{ id: string; threadId: string }> {
    const m = state().messages.find((x) => x.draftId === draftId);
    if (!m) throw new ProviderError('Draft not found', 404);
    m.labelIds = ['SENT']; m.date = Date.now(); delete m.draftId;
    state().seq++;
    return { id: m.id, threadId: m.threadId };
  }

  async deleteDraft(draftId: string): Promise<void> {
    state().messages = state().messages.filter((m) => m.draftId !== draftId);
  }

  async draftForThread(threadId: string): Promise<{ draftId: string; message: MessageDetail } | null> {
    const m = state().messages.find((x) => x.threadId === threadId && x.draftId);
    if (!m) return null;
    const { draftId, ...message } = m;
    return { draftId: draftId!, message };
  }

  async listLabels(): Promise<Label[]> {
    const s = state();
    return s.labels.map((l) => {
      const threads = [...new Set(s.messages.filter((m) => m.labelIds.includes(l.id)).map((m) => m.threadId))];
      return { ...l, threadsTotal: threads.length, threadsUnread: threads.filter((t) => summaryFor(t).unread).length };
    });
  }

  async createLabel(l: NewLabel): Promise<Label> {
    const s = state();
    if (s.labels.some((x) => x.name.toLowerCase() === l.name.toLowerCase())) throw new ProviderError('Label name exists or conflicts', 409);
    const label: Label = { id: `Label_${++s.seq}`, name: l.name, type: 'user', color: l.color ?? null };
    s.labels.push(label);
    return label;
  }

  async updateLabel(id: string, l: Partial<NewLabel>): Promise<Label> {
    const label = state().labels.find((x) => x.id === id);
    if (!label) throw new ProviderError('Label not found', 404);
    if (l.name) label.name = l.name;
    if (l.color !== undefined) label.color = l.color ?? null;
    return label;
  }

  async deleteLabel(id: string): Promise<void> {
    const s = state();
    s.labels = s.labels.filter((x) => x.id !== id);
    s.messages.forEach((m) => { m.labelIds = m.labelIds.filter((x) => x !== id); });
  }

  async attachment(): Promise<Uint8Array> {
    return new TextEncoder().encode('This is a demo attachment. Connect a Google account to download real files.\n');
  }

  async sendAs(): Promise<SendAs[]> {
    return [{ email: ME.email, name: ME.name, signature: '<div>Alex Morgan<br>Northwind · northwind.io</div>', isDefault: true }];
  }

  async listFilters(): Promise<GmailFilter[]> {
    return state().filters;
  }

  async createFilter(f: NewFilter): Promise<GmailFilter> {
    const filter = { id: `f${++state().seq}`, ...f };
    state().filters.push(filter);
    return filter;
  }

  async deleteFilter(id: string): Promise<void> {
    state().filters = state().filters.filter((f) => f.id !== id);
  }

  async freeBusy(timeMin: number, timeMax: number): Promise<BusyInterval[]> {
    const out: BusyInterval[] = [];
    for (let day = new Date(timeMin); day.getTime() < timeMax; day.setDate(day.getDate() + 1)) {
      const at = (h: number, m = 0) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime();
      out.push({ start: at(10), end: at(11) }, { start: at(13), end: at(14, 30) });
    }
    return out.filter((b) => b.end > timeMin && b.start < timeMax);
  }

  async recentContacts(): Promise<Address[]> {
    return [
      { name: 'Priya Raman', email: 'priya@raman.co' }, { name: 'Jonas Beck', email: 'jonas@beckstudio.de' }, { name: 'Mina Okafor', email: 'mina@northwind.io' },
      { name: 'Ops Weekly', email: 'ops@northwind.io' }, { name: 'Lena Duarte', email: 'lena.duarte@fieldnote.org' },
    ];
  }

  async sentSamples(): Promise<string[]> {
    return ['Thanks Priya, I’ll go through both tonight.', 'Hi Lena, thanks! Could you do a 30 minute call next week?'];
  }
}
