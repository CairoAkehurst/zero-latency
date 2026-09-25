import { describe, expect, it } from 'vitest';
import { formatSlots, freeSlots, linkify, parseTypedAddress, participantLabel, replyRecipients, subjectWithPrefix, textToHtml, escapeHtml, referencesFor } from '@/lib/shared/compose';
import type { MessageDetail } from '@/lib/shared/types';

const msg = (p: Partial<MessageDetail>): MessageDetail => ({
  id: 'm', threadId: 't', labelIds: [], from: null, to: [], cc: [], bcc: [], replyTo: [], subject: 'Hi', date: 0, snippet: '', html: null, text: null,
  attachments: [], messageIdHeader: null, references: null, listUnsubscribe: null, ...p,
});

describe('replyRecipients', () => {
  const me = 'alex@northwind.io';
  it('replies to the sender, and reply-all copies everyone except me', () => {
    const m = msg({ from: { name: 'Priya', email: 'priya@raman.co' }, to: [{ name: 'Alex', email: me }, { name: 'Mina', email: 'mina@northwind.io' }], cc: [{ name: '', email: 'legal@raman.co' }] });
    expect(replyRecipients(m, me, false)).toEqual({ to: [{ name: 'Priya', email: 'priya@raman.co' }], cc: [] });
    expect(replyRecipients(m, me, true)).toEqual({ to: [{ name: 'Priya', email: 'priya@raman.co' }], cc: [{ name: 'Mina', email: 'mina@northwind.io' }, { name: '', email: 'legal@raman.co' }] });
  });
  it('honours Reply-To and replying to my own message goes to the original recipients', () => {
    expect(replyRecipients(msg({ from: { name: 'List', email: 'list@x.io' }, replyTo: [{ name: '', email: 'reply@x.io' }], to: [{ name: '', email: me }] }), me, false).to).toEqual([{ name: '', email: 'reply@x.io' }]);
    expect(replyRecipients(msg({ from: { name: 'Alex', email: me }, to: [{ name: 'Jonas', email: 'jonas@b.de' }] }), me, false).to).toEqual([{ name: 'Jonas', email: 'jonas@b.de' }]);
  });
});

describe('subjects and references', () => {
  it('adds Re:/Fwd: once', () => {
    expect(subjectWithPrefix('Hello', 'Re')).toBe('Re: Hello');
    expect(subjectWithPrefix('RE: Hello', 'Re')).toBe('RE: Hello');
    expect(subjectWithPrefix('Fw: Hello', 'Fwd')).toBe('Fw: Hello');
  });
  it('chains References', () => {
    expect(referencesFor(msg({ messageIdHeader: '<b@x>', references: '<a@x>' }))).toBe('<a@x> <b@x>');
    expect(referencesFor(msg({ messageIdHeader: '<b@x>' }))).toBe('<b@x>');
  });
});

describe('html helpers', () => {
  it('escapes and linkifies safely', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(linkify('see https://example.com/a?b=1.')).toBe('see <a href="https://example.com/a?b=1" target="_blank" rel="noopener noreferrer">https://example.com/a?b=1</a>.');
    expect(textToHtml('a <b>\n\nc')).toBe('<p>a &lt;b&gt;</p><p>c</p>');
  });
});

describe('addresses', () => {
  it('parses typed recipients', () => {
    expect(parseTypedAddress('Priya Raman <priya@raman.co>')).toEqual({ name: 'Priya Raman', email: 'priya@raman.co' });
    expect(parseTypedAddress('priya@raman.co,')).toEqual({ name: '', email: 'priya@raman.co' });
    expect(parseTypedAddress('priya')).toBeNull();
  });
  it('labels participants like "Priya, me"', () => {
    expect(participantLabel([{ name: 'Priya Raman', email: 'p@r.co' }, { name: 'Alex', email: 'me@x.io' }], 'me@x.io', 3)).toEqual({ names: 'Priya, me', count: 3 });
    expect(participantLabel([{ name: 'Priya Raman', email: 'p@r.co' }], 'me@x.io', 1)).toEqual({ names: 'Priya Raman', count: null });
  });
});

describe('availability', () => {
  const monday9 = new Date(2026, 8, 28, 8, 0).getTime(); // Mon 28 Sep 2026, 08:00
  it('skips weekends, busy blocks and the past', () => {
    const busy = [{ start: new Date(2026, 8, 28, 10, 0).getTime(), end: new Date(2026, 8, 28, 11, 0).getTime() }];
    const slots = freeSlots(busy, { from: monday9, days: 1, startHour: 9, endHour: 12, slotMinutes: 30 });
    expect(slots.map((s) => new Date(s.start).getHours() + new Date(s.start).getMinutes() / 60)).toEqual([9, 9.5, 11, 11.5]);
    const fri = new Date(2026, 9, 2, 17, 0).getTime();
    const next = freeSlots([], { from: fri, days: 2, startHour: 9, endHour: 10, slotMinutes: 30 }); // today counts as day 1 even when its slots are past
    expect(new Date(next[0]!.start).getDay()).toBe(1);
  });
  it('merges adjacent picks', () => {
    const a = new Date(2026, 8, 28, 9, 0).getTime();
    const lines = formatSlots([{ start: a, end: a + 1_800_000 }, { start: a + 1_800_000, end: a + 3_600_000 }], 'UTC');
    expect(lines).toHaveLength(1);
  });
});
