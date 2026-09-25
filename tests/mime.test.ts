import { describe, expect, it } from 'vitest';
import { buildMime, encodeWords, formatAddress, htmlToText, parseAddressList, parseMessage, sanitizeHeaderValue, stripQuoted, type GmailMessage } from '@/lib/server/mime';

const b64u = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

describe('parseAddressList', () => {
  it('handles quoted names with commas, bare addresses and angle brackets', () => {
    expect(parseAddressList('"Beck, Jonas" <jonas@beck.de>, priya@raman.co, Mina Okafor <mina@northwind.io>')).toEqual([
      { name: 'Beck, Jonas', email: 'jonas@beck.de' },
      { name: '', email: 'priya@raman.co' },
      { name: 'Mina Okafor', email: 'mina@northwind.io' },
    ]);
  });
  it('ignores garbage entries', () => {
    expect(parseAddressList('undisclosed-recipients:;')).toEqual([]);
    expect(parseAddressList(null)).toEqual([]);
  });
});

describe('parseMessage', () => {
  const msg: GmailMessage = {
    id: 'm1', threadId: 't1', labelIds: ['INBOX', 'UNREAD'], snippet: 'Hi &amp; welcome', internalDate: '1700000000000',
    payload: {
      mimeType: 'multipart/mixed',
      headers: [
        { name: 'From', value: 'Priya Raman <priya@raman.co>' }, { name: 'To', value: 'alex@northwind.io' },
        { name: 'Subject', value: 'Term sheet' }, { name: 'Message-ID', value: '<abc@raman.co>' },
      ],
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', headers: [{ name: 'Content-Type', value: 'text/plain; charset="UTF-8"' }], body: { data: b64u('Hello — plain') } },
            {
              mimeType: 'multipart/related',
              parts: [
                { mimeType: 'text/html', headers: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: { data: b64u('<p>Hello — <b>html</b></p>') } },
                { mimeType: 'image/png', filename: 'logo.png', headers: [{ name: 'Content-ID', value: '<logo@x>' }, { name: 'Content-Disposition', value: 'inline' }], body: { attachmentId: 'A1', size: 10 } },
              ],
            },
          ],
        },
        { partId: '2', mimeType: 'application/pdf', filename: 'deck.pdf', headers: [{ name: 'Content-Disposition', value: 'attachment; filename="deck.pdf"' }], body: { attachmentId: 'A2', size: 2048 } },
      ],
    },
  };

  it('extracts html, text, headers and attachments', () => {
    const m = parseMessage(msg);
    expect(m.from).toEqual({ name: 'Priya Raman', email: 'priya@raman.co' });
    expect(m.html).toBe('<p>Hello — <b>html</b></p>');
    expect(m.text).toBe('Hello — plain');
    expect(m.snippet).toBe('Hi & welcome');
    expect(m.date).toBe(1700000000000);
    expect(m.messageIdHeader).toBe('<abc@raman.co>');
    expect(m.attachments.map((a) => [a.filename, a.inline, a.contentId])).toEqual([['logo.png', true, 'logo@x'], ['deck.pdf', false, undefined]]);
  });

  it('decodes non-UTF-8 charsets', () => {
    const latin1 = Buffer.from([0x63, 0x61, 0x66, 0xe9]).toString('base64url'); // "café" in ISO-8859-1
    const m = parseMessage({ id: 'x', threadId: 'x', payload: { mimeType: 'text/plain', headers: [{ name: 'Content-Type', value: 'text/plain; charset=ISO-8859-1' }], body: { data: latin1 } } });
    expect(m.text).toBe('café');
  });
});

describe('encoding', () => {
  it('leaves ASCII alone and encodes UTF-8 subjects as RFC 2047 words ≤ 75 chars', () => {
    expect(encodeWords('Hello')).toBe('Hello');
    const enc = encodeWords('Réunion — ' + 'é'.repeat(60));
    for (const w of enc.split('\r\n ')) {
      expect(w.length).toBeLessThanOrEqual(75);
      expect(w).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
    }
    const decoded = enc.split('\r\n ').map((w) => Buffer.from(w.slice(10, -2), 'base64').toString('utf8')).join('');
    expect(decoded).toBe('Réunion — ' + 'é'.repeat(60));
  });

  it('quotes display names and strips header injection', () => {
    expect(formatAddress({ name: 'Beck, "J"', email: 'j@b.de' })).toBe('"Beck, \\"J\\"" <j@b.de>');
    expect(sanitizeHeaderValue('Hi\r\nBcc: evil@x.com')).toBe('Hi Bcc: evil@x.com');
  });
});

describe('buildMime', () => {
  const from = { name: 'Alex Morgan', email: 'alex@northwind.io' };
  it('builds a multipart/alternative message with threading headers', () => {
    const raw = buildMime({ to: [{ name: 'Priya', email: 'priya@raman.co' }], cc: [], bcc: [{ name: '', email: 'b@x.io' }], subject: 'Re: Term sheet', html: '<p>Hi — ok</p>', text: 'Hi — ok', attachments: [], inReplyTo: '<abc@raman.co>', references: '<abc@raman.co>' }, from, new Date(Date.UTC(2026, 0, 2, 3, 4, 5)));
    const head = raw.slice(0, raw.indexOf('\r\n\r\n'));
    const rest = raw.slice(head.length + 4);
    expect(head).toContain('From: "Alex Morgan" <alex@northwind.io>');
    expect(head).toContain('To: "Priya" <priya@raman.co>');
    expect(head).toContain('Bcc: b@x.io');
    expect(head).toContain('In-Reply-To: <abc@raman.co>');
    expect(head).toContain('Date: Fri, 02 Jan 2026 03:04:05 +0000');
    expect(head).toMatch(/Content-Type: multipart\/alternative; boundary="(zl_[a-z0-9]+)"/);
    const boundary = /boundary="([^"]+)"/.exec(head)![1];
    expect(rest).toContain(`--${boundary}--`);
    const htmlB64 = rest.split('Content-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n')[1]!.split('\r\n--')[0]!;
    expect(Buffer.from(htmlB64.replace(/\r\n/g, ''), 'base64').toString('utf8')).toBe('<p>Hi — ok</p>');
  });

  it('wraps attachments in multipart/mixed with RFC 2231 filenames', () => {
    const raw = buildMime({ to: [{ name: '', email: 'a@b.c' }], cc: [], bcc: [], subject: 'Files', html: '<p>x</p>', text: 'x', attachments: [{ filename: 'Résumé.pdf', mimeType: 'application/pdf', data: Buffer.from('%PDF').toString('base64') }] }, from);
    expect(raw).toMatch(/Content-Type: multipart\/mixed; boundary=/);
    expect(raw).toContain(`filename*=UTF-8''R%C3%A9sum%C3%A9.pdf`);
    expect(raw).toContain('Content-Disposition: attachment; filename="R_sum_.pdf"');
    for (const line of raw.split('\r\n')) expect(line.length).toBeLessThanOrEqual(998);
  });
});

describe('text helpers', () => {
  it('converts html to text and strips quoted history', () => {
    expect(htmlToText('<style>p{}</style><p>Hello&nbsp;there</p><ul><li>one</li><li>two</li></ul>')).toBe('Hello there\n• one\n• two');
    expect(stripQuoted('New text\n\nOn Mon, 1 Jan 2026 at 10:00, Priya wrote:\n> old')).toBe('New text');
  });
});
