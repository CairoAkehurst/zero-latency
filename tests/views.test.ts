import { describe, expect, it } from 'vitest';
import { compileView, dateBucket, defaultViews, groupThreads, labelTerm, quoteTerm, type FilterRule } from '@/lib/shared/views';
import { matches, type SearchDoc } from '@/lib/server/search';
import type { ThreadSummary } from '@/lib/shared/types';

describe('compileView', () => {
  it('compiles filters into Gmail search syntax', () => {
    const filters: FilterRule[] = [
      { id: '1', field: 'mailbox', op: 'isNot', values: ['spam', 'trash'] },
      { id: '2', field: 'from', op: 'contains', values: ['ali@example.com', 'Matt Frank'] },
      { id: '3', field: 'category', op: 'isNot', values: ['promotions', 'social'] },
      { id: '4', field: 'read', value: 'unread' },
      { id: '5', field: 'label', op: 'is', values: ['Action required', 'Clients/Acme'] },
      { id: '6', field: 'date', op: 'after', value: '2026-09-01' },
      { id: '7', field: 'date', op: 'newerThan', value: '7d' },
    ];
    expect(compileView(filters)).toBe(
      '-in:spam -in:trash {from:ali@example.com from:"Matt Frank"} -category:promotions -category:social is:unread {label:Action-required label:Clients-Acme} after:2026/09/01 newer_than:7d',
    );
  });
  it('drops invalid date values and empty terms', () => {
    expect(compileView([{ id: 'x', field: 'date', op: 'after', value: 'yesterday' }, { id: 'y', field: 'subject', op: 'contains', values: ['  '] }])).toBe('');
  });
  it('quotes terms with spaces and strips quotes', () => {
    expect(quoteTerm('a "b" c')).toBe('"a b c"');
    expect(labelTerm('Team / Ops')).toBe('label:Team-Ops');
  });
});

describe('default views', () => {
  it('excludes unchecked onboarding categories from the inbox and gives each its own view', () => {
    const views = defaultViews(['calendar', 'notifications']);
    const inbox = views[0]!;
    expect(inbox.name).toBe('Inbox');
    expect(compileView(inbox.filters)).toBe('in:inbox -category:forums -category:social -category:promotions');
    expect(views.map((v) => v.name)).toEqual(['Inbox', 'Unread', 'Labels', 'Mailing lists', 'Social', 'Promotions']);
  });
});

const doc = (p: Partial<SearchDoc>): SearchDoc => ({ labels: ['INBOX'], labelNames: [], from: '', to: '', cc: '', bcc: '', subject: '', body: '', date: Date.now(), hasAttachment: false, hasIcs: false, ...p });

describe('demo search evaluator', () => {
  it('supports OR groups, negation, labels and categories', () => {
    const d = doc({ labels: ['INBOX', 'UNREAD', 'CATEGORY_UPDATES'], labelNames: ['Action required'], from: 'Priya priya@raman.co' });
    expect(matches('in:inbox is:unread', d)).toBe(true);
    expect(matches('{from:jonas from:priya}', d)).toBe(true);
    expect(matches('-category:updates', d)).toBe(false);
    expect(matches('label:action-required', d)).toBe(true);
    expect(matches('has:userlabels', d)).toBe(true);
    expect(matches('is:read', d)).toBe(false);
  });
  it('hides spam and trash unless asked', () => {
    expect(matches('', doc({ labels: ['SPAM'] }))).toBe(false);
    expect(matches('in:spam', doc({ labels: ['SPAM'] }))).toBe(true);
  });
  it('handles relative and absolute dates', () => {
    const old = doc({ date: Date.now() - 10 * 86_400_000 });
    expect(matches('newer_than:7d', old)).toBe(false);
    expect(matches('older_than:7d', old)).toBe(true);
  });
});

const t = (id: string, p: Partial<ThreadSummary>): ThreadSummary => ({
  id, historyId: '1', subject: '', snippet: '', participants: [], recipients: [], lastDate: Date.now(), messageCount: 1, labelIds: [], unread: false, starred: false,
  important: false, hasAttachment: false, hasCalendar: false, hasDraft: false, ...p,
});

describe('groupThreads', () => {
  const now = new Date(2026, 8, 25, 12).getTime();
  it('buckets by date in order', () => {
    const groups = groupThreads([t('a', { lastDate: now - 3600_000 }), t('b', { lastDate: now - 30 * 3600_000 }), t('c', { lastDate: now - 5 * 86_400_000 }), t('d', { lastDate: now - 90 * 86_400_000 })], { kind: 'date' }, { me: 'me@x.io', labels: [], now });
    expect(groups.map((g) => g.title)).toEqual(['Today', 'Yesterday', 'Last 7 days', 'June']);
    expect(dateBucket(new Date(2025, 5, 1).getTime(), now).title).toBe('June 2025');
  });
  it('groups by keyword in keyword order with Other last', () => {
    const threads = [
      t('1', { participants: [{ name: 'Ali', email: 'ali@aliabdaal.com' }] }),
      t('2', { participants: [{ name: 'Matthias', email: 'blog@matthiasfrank.de' }] }),
      t('3', { participants: [{ name: 'X', email: 'x@y.z' }] }),
    ];
    const g = groupThreads(threads, { kind: 'keywords', keywords: ['matthiasfrank.de', 'ali@aliabdaal.com'] }, { me: 'me@x.io', labels: [] });
    expect(g.map((x) => [x.title, x.threads.map((y) => y.id)])).toEqual([['matthiasfrank.de', ['2']], ['ali@aliabdaal.com', ['1']], ['Other', ['3']]]);
  });
  it('groups by label using user labels only', () => {
    const g = groupThreads([t('1', { labelIds: ['INBOX', 'L1'] }), t('2', { labelIds: ['INBOX'] })], { kind: 'label' }, { me: 'me', labels: [{ id: 'L1', name: 'Finance', type: 'user', color: null }, { id: 'INBOX', name: 'INBOX', type: 'system', color: null }] });
    expect(g.map((x) => x.title)).toEqual(['Finance', 'No label']);
  });
});
