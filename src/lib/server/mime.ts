// Gmail payload parsing and RFC 5322 / MIME message building.
import type { Address, AttachmentInfo, MessageDetail, OutgoingMessage } from '../shared/types';

// ---------- Gmail API shapes ----------

export interface GmailHeader { name: string; value: string }
export interface GmailPart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { attachmentId?: string; size?: number; data?: string };
  parts?: GmailPart[];
}
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailPart;
  sizeEstimate?: number;
}

// ---------- Headers & addresses ----------

export function header(headers: GmailHeader[] | undefined, name: string): string | null {
  const n = name.toLowerCase();
  const h = headers?.find((x) => x.name.toLowerCase() === n);
  return h ? h.value : null;
}

/** Split an address list on commas that are outside quotes and angle brackets. */
function splitAddresses(v: string): string[] {
  const out: string[] = [];
  let cur = '', quoted = false, angle = 0, escape = false;
  for (const ch of v) {
    if (escape) { cur += ch; escape = false; continue; }
    if (ch === '\\' && quoted) { cur += ch; escape = true; continue; }
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === '<') angle++;
    else if (!quoted && ch === '>') angle = Math.max(0, angle - 1);
    if ((ch === ',' || ch === ';') && !quoted && angle === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const EMAIL_RE = /^[^\s@<>()",;]+@[^\s@<>()",;]+$/;

export function parseAddress(raw: string): Address | null {
  const s = raw.trim();
  if (!s) return null;
  const m = /^(.*?)<\s*([^<>\s]+)\s*>\s*$/.exec(s);
  if (m) {
    let name = m[1]!.trim();
    if (name.startsWith('"') && name.endsWith('"') && name.length >= 2) name = name.slice(1, -1).replace(/\\(.)/g, '$1');
    return { name: name.trim(), email: m[2]!.trim() };
  }
  const bare = s.replace(/^mailto:/i, '').replace(/\s*\(.*\)\s*$/, '');
  return EMAIL_RE.test(bare) ? { name: '', email: bare } : null;
}

export function parseAddressList(v: string | null): Address[] {
  if (!v) return [];
  return splitAddresses(v).map(parseAddress).filter((a): a is Address => a !== null);
}

// ---------- Body decoding ----------

export function base64UrlToBytes(data: string): Uint8Array {
  return new Uint8Array(Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
}

function charsetOf(part: GmailPart): string {
  const ct = header(part.headers, 'Content-Type') ?? '';
  const m = /charset\s*=\s*"?([^";\s]+)"?/i.exec(ct);
  return (m?.[1] ?? 'utf-8').toLowerCase();
}

export function decodeText(bytes: Uint8Array, charset: string): string {
  const cs = charset === 'us-ascii' || charset === 'ascii' ? 'utf-8' : charset;
  try {
    return new TextDecoder(cs, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

interface Walked { html: string[]; text: string[]; attachments: AttachmentInfo[] }

function walk(part: GmailPart, acc: Walked, inAlternative = false): void {
  const mime = (part.mimeType ?? '').toLowerCase();
  const disposition = (header(part.headers, 'Content-Disposition') ?? '').toLowerCase();
  const contentIdRaw = header(part.headers, 'Content-ID');
  const contentId = contentIdRaw ? contentIdRaw.replace(/^<|>$/g, '').trim() : undefined;

  if (part.parts?.length) {
    if (mime === 'multipart/alternative') {
      // Prefer HTML; keep the plain text too. Only the last html/text alternative is meaningful.
      const sub: Walked = { html: [], text: [], attachments: acc.attachments };
      for (const p of part.parts) walk(p, sub, true);
      if (sub.html.length) acc.html.push(sub.html[sub.html.length - 1]!);
      if (sub.text.length) acc.text.push(sub.text[sub.text.length - 1]!);
      return;
    }
    for (const p of part.parts) walk(p, acc, inAlternative);
    return;
  }

  const isAttachment = !!part.filename || disposition.startsWith('attachment');
  if (isAttachment && part.body?.attachmentId) {
    acc.attachments.push({
      attachmentId: part.body.attachmentId,
      partId: part.partId ?? '',
      filename: part.filename || 'attachment',
      mimeType: part.mimeType ?? 'application/octet-stream',
      size: part.body.size ?? 0,
      contentId,
      inline: !disposition.startsWith('attachment') && !!contentId,
    });
    return;
  }
  if (!part.body?.data) {
    // Inline image without filename but with an attachment id.
    if (part.body?.attachmentId && mime.startsWith('image/')) {
      acc.attachments.push({ attachmentId: part.body.attachmentId, partId: part.partId ?? '', filename: 'image', mimeType: mime, size: part.body.size ?? 0, contentId, inline: true });
    }
    return;
  }
  const text = decodeText(base64UrlToBytes(part.body.data), charsetOf(part));
  if (mime === 'text/html') acc.html.push(text);
  else if (mime === 'text/plain' || (!mime && !inAlternative)) acc.text.push(text);
  else if (mime === 'text/calendar') { /* invitations are surfaced via hasCalendar */ }
}

export function parseMessage(m: GmailMessage): MessageDetail {
  const headers = m.payload?.headers;
  const acc: Walked = { html: [], text: [], attachments: [] };
  if (m.payload) walk(m.payload, acc);
  const dateHeader = header(headers, 'Date');
  const internal = m.internalDate ? Number(m.internalDate) : NaN;
  const parsedDate = dateHeader ? Date.parse(dateHeader) : NaN;
  return {
    id: m.id,
    threadId: m.threadId,
    labelIds: m.labelIds ?? [],
    from: parseAddressList(header(headers, 'From'))[0] ?? null,
    to: parseAddressList(header(headers, 'To')),
    cc: parseAddressList(header(headers, 'Cc')),
    bcc: parseAddressList(header(headers, 'Bcc')),
    replyTo: parseAddressList(header(headers, 'Reply-To')),
    subject: header(headers, 'Subject') ?? '',
    date: Number.isFinite(internal) ? internal : Number.isFinite(parsedDate) ? parsedDate : 0,
    snippet: decodeEntities(m.snippet ?? ''),
    html: acc.html.length ? acc.html.join('<hr>') : null,
    text: acc.text.length ? acc.text.join('\n\n') : null,
    attachments: acc.attachments,
    messageIdHeader: header(headers, 'Message-ID') ?? header(headers, 'Message-Id'),
    references: header(headers, 'References'),
    listUnsubscribe: header(headers, 'List-Unsubscribe'),
  };
}

/** Gmail snippets are HTML-escaped. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

// ---------- Building ----------

const CRLF = '\r\n';

/** Remove characters that could inject headers. */
export function sanitizeHeaderValue(v: string): string {
  return v.replace(/[\r\n\u0000]+/g, ' ').trim();
}

function isAscii(s: string): boolean {
  return /^[\x20-\x7e]*$/.test(s);
}

/** RFC 2047 encoded words (B encoding), split so each word stays within 75 chars and never splits a code point. */
export function encodeWords(s: string): string {
  if (isAscii(s)) return s;
  const words: string[] = [];
  let chunk = '';
  for (const ch of s) {
    const next = chunk + ch;
    if (Buffer.byteLength(next, 'utf8') > 45) { words.push(chunk); chunk = ch; } else chunk = next;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${Buffer.from(w, 'utf8').toString('base64')}?=`).join(`${CRLF} `);
}

export function formatAddress(a: Address): string {
  const email = sanitizeHeaderValue(a.email);
  const name = sanitizeHeaderValue(a.name);
  if (!name) return email;
  if (isAscii(name)) return `"${name.replace(/(["\\])/g, '\\$1')}" <${email}>`;
  return `${encodeWords(name)} <${email}>`;
}

function chunk76(b64: string): string {
  return b64.replace(/(.{76})/g, `$1${CRLF}`).replace(/\r\n$/, '');
}

function filenameParams(name: string): string {
  const clean = sanitizeHeaderValue(name).replace(/["\\]/g, '_');
  if (isAscii(clean)) return `filename="${clean}"`;
  const fallback = clean.replace(/[^\x20-\x7e]/g, '_');
  return `filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

function nameParam(name: string): string {
  const clean = sanitizeHeaderValue(name).replace(/["\\]/g, '_');
  return isAscii(clean) ? `name="${clean}"` : `name="${encodeWords(clean)}"`;
}

function boundary(): string {
  return `zl_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function buildMime(msg: OutgoingMessage, from: Address, date = new Date()): string {
  const lines: string[] = [];
  const list = (as: Address[]) => as.map(formatAddress).join(', ');
  lines.push(`From: ${formatAddress(from)}`);
  if (msg.to.length) lines.push(`To: ${list(msg.to)}`);
  if (msg.cc.length) lines.push(`Cc: ${list(msg.cc)}`);
  if (msg.bcc.length) lines.push(`Bcc: ${list(msg.bcc)}`);
  lines.push(`Subject: ${encodeWords(sanitizeHeaderValue(msg.subject))}`);
  lines.push(`Date: ${date.toUTCString().replace('GMT', '+0000')}`);
  if (msg.inReplyTo) lines.push(`In-Reply-To: ${sanitizeHeaderValue(msg.inReplyTo)}`);
  if (msg.references) lines.push(`References: ${sanitizeHeaderValue(msg.references)}`);
  lines.push('MIME-Version: 1.0');

  const alt = boundary();
  const altBody = [
    `--${alt}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    chunk76(Buffer.from(msg.text, 'utf8').toString('base64')),
    `--${alt}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    chunk76(Buffer.from(msg.html, 'utf8').toString('base64')),
    `--${alt}--`,
  ].join(CRLF);

  if (!msg.attachments.length) {
    lines.push(`Content-Type: multipart/alternative; boundary="${alt}"`);
    return lines.join(CRLF) + CRLF + CRLF + altBody + CRLF;
  }
  const mixed = boundary();
  lines.push(`Content-Type: multipart/mixed; boundary="${mixed}"`);
  const parts = [`--${mixed}`, `Content-Type: multipart/alternative; boundary="${alt}"`, '', altBody];
  for (const a of msg.attachments) {
    const type = /^[\w.+-]+\/[\w.+-]+$/.test(a.mimeType) ? a.mimeType : 'application/octet-stream';
    parts.push(
      `--${mixed}`,
      `Content-Type: ${type}; ${nameParam(a.filename)}`,
      `Content-Disposition: attachment; ${filenameParams(a.filename)}`,
      'Content-Transfer-Encoding: base64',
      '',
      chunk76(a.data.replace(/\s+/g, '')),
    );
  }
  parts.push(`--${mixed}--`);
  return lines.join(CRLF) + CRLF + CRLF + parts.join(CRLF) + CRLF;
}

export function toBase64Url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

/** Minimal HTML → text for the plain-text alternative and AI prompts. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Strip quoted history from a reply so AI prompts focus on the new content. */
export function stripQuoted(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (/^On .+ wrote:$/.test(line.trim()) || /^-{2,}\s*Original Message\s*-{2,}$/i.test(line.trim())) break;
    if (line.startsWith('>')) continue;
    out.push(line);
  }
  return out.join('\n').trim();
}
