// Pure helpers for the composer and thread list (no DOM, unit-tested).
import type { Address, MessageDetail } from './types';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Plain text (blank-line paragraphs) → safe HTML paragraphs with links. */
export function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${linkify(escapeHtml(para)).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function linkify(escaped: string): string {
  return escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

export function formatAddressShort(a: Address | null, me?: string): string {
  if (!a) return '';
  if (me && a.email.toLowerCase() === me.toLowerCase()) return 'me';
  return a.name || a.email;
}

export function subjectWithPrefix(subject: string, prefix: 'Re' | 'Fwd'): string {
  const s = subject.trim();
  const re = prefix === 'Re' ? /^re:/i : /^(fwd?|fw):/i;
  return re.test(s) ? s : `${prefix}: ${s}`;
}

function dedupe(list: Address[], exclude: string[]): Address[] {
  const seen = new Set(exclude.map((e) => e.toLowerCase()));
  const out: Address[] = [];
  for (const a of list) {
    const k = a.email.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

/** Recipients for reply / reply all, following common client behaviour. */
export function replyRecipients(m: MessageDetail, me: string, all: boolean): { to: Address[]; cc: Address[] } {
  const fromMe = m.from?.email.toLowerCase() === me.toLowerCase();
  const primary = fromMe ? m.to : m.replyTo.length ? m.replyTo : m.from ? [m.from] : [];
  const to = dedupe(primary, fromMe ? [] : [me]);
  if (!all) return { to, cc: [] };
  const cc = dedupe([...(fromMe ? [] : m.to), ...m.cc], [me, ...to.map((a) => a.email)]);
  return { to, cc };
}

export function referencesFor(m: MessageDetail): string | undefined {
  if (!m.messageIdHeader) return m.references ?? undefined;
  return [m.references, m.messageIdHeader].filter(Boolean).join(' ').trim();
}

export function formatLongDate(ts: number): string {
  return new Date(ts).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** HTML for the quoted original under a reply. */
export function quoteHtml(m: MessageDetail): string {
  const who = m.from ? `${escapeHtml(m.from.name || m.from.email)} &lt;${escapeHtml(m.from.email)}&gt;` : 'someone';
  const inner = m.html ?? textToHtml(m.text ?? m.snippet);
  return `<div class="zl_quote"><div>On ${escapeHtml(formatLongDate(m.date))}, ${who} wrote:</div><blockquote style="margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex">${inner}</blockquote></div>`;
}

export function forwardHtml(m: MessageDetail): string {
  const line = (k: string, v: string) => (v ? `<div>${k}: ${escapeHtml(v)}</div>` : '');
  const list = (as: Address[]) => as.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(', ');
  return `<div class="zl_fwd"><div>---------- Forwarded message ---------</div>${line('From', m.from ? list([m.from]) : '')}${line('Date', formatLongDate(m.date))}${line('Subject', m.subject)}${line('To', list(m.to))}${line('Cc', list(m.cc))}<br>${m.html ?? textToHtml(m.text ?? m.snippet)}</div>`;
}

export function quoteText(m: MessageDetail, body: string): string {
  const who = m.from ? `${m.from.name || m.from.email} <${m.from.email}>` : 'someone';
  return `On ${formatLongDate(m.date)}, ${who} wrote:\n${body.split('\n').map((l) => `> ${l}`).join('\n')}`;
}

// ---------- list formatting ----------

export function formatListDate(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (d.getFullYear() === n.getFullYear()) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** "Priya, me 3" style participant label. */
export function participantLabel(participants: Address[], me: string, count: number): { names: string; count: number | null } {
  const names = participants.map((p) => (p.email.toLowerCase() === me.toLowerCase() ? 'me' : (p.name || p.email).split(/\s+/)[0]!));
  let label: string;
  if (participants.length === 1) label = participants[0]!.email.toLowerCase() === me.toLowerCase() ? 'me' : participants[0]!.name || participants[0]!.email;
  else label = names.slice(-3).join(', ');
  return { names: label, count: count > 1 ? count : null };
}

/** Parse "Name <a@b>" / "a@b" text typed into a recipient field. */
export function parseTypedAddress(s: string): Address | null {
  const t = s.trim().replace(/[,;]+$/, '');
  const m = /^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>$/.exec(t);
  if (m) return { name: m[1]!.trim().replace(/^"|"$/g, ''), email: m[2]! };
  return /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/.test(t) ? { name: '', email: t } : null;
}

// ---------- availability ----------

export interface Slot {
  start: number;
  end: number;
}

/** Merge adjacent picked slots and format them as lines like "Tue, Oct 7 · 2:00 – 3:00 PM". */
export function formatSlots(slots: Slot[], timeZone?: string): string[] {
  const sorted = [...slots].sort((a, b) => a.start - b.start);
  const merged: Slot[] = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.end === s.start) last.end = s.end;
    else merged.push({ ...s });
  }
  const tz = timeZone ? { timeZone } : {};
  return merged.map((s) => {
    const day = new Date(s.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...tz });
    const t = (ts: number) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', ...tz });
    return `${day} · ${t(s.start)} – ${t(s.end)}`;
  });
}

/** Free half-hour slots on the next `days` weekdays between startHour and endHour, excluding busy intervals and the past. */
export function freeSlots(busy: Slot[], opts: { from: number; days: number; startHour: number; endHour: number; slotMinutes: number }): Slot[] {
  const out: Slot[] = [];
  const day = new Date(opts.from);
  day.setHours(0, 0, 0, 0);
  let found = 0;
  while (found < opts.days) {
    const dow = day.getDay();
    if (dow !== 0 && dow !== 6) {
      found++;
      for (let m = opts.startHour * 60; m + opts.slotMinutes <= opts.endHour * 60; m += opts.slotMinutes) {
        const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60).getTime();
        const end = start + opts.slotMinutes * 60_000;
        if (start < opts.from) continue;
        if (busy.some((b) => b.start < end && b.end > start)) continue;
        out.push({ start, end });
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return out;
}
