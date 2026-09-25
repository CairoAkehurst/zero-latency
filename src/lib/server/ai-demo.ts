import 'server-only';
// Canned AI output for the offline demo when no OPENAI_API_KEY is configured. Never used with a real account.
import type { ThreadDetail, ThreadSummary } from '../shared/types';
import type { AutoLabelRule, ThreadAISummary, ThreadCard } from './ai';

export function demoSummary(t: ThreadDetail): ThreadAISummary {
  const people = [...new Set(t.messages.map((m) => m.from?.name || m.from?.email).filter(Boolean))].join(', ');
  return {
    summary: `${people} discussed “${t.subject}” across ${t.messages.length} message${t.messages.length === 1 ? '' : 's'}. (Demo summary: connect OpenAI for real summaries.)`,
    keyPoints: t.messages.slice(-3).map((m) => m.snippet.slice(0, 90)),
    actionItems: [],
  };
}

export function demoDraft(t: ThreadDetail): string {
  const first = t.messages[t.messages.length - 1]?.from?.name?.split(' ')[0] ?? 'there';
  return `Hi ${first},\n\nThanks for the note. I’ll take a look and get back to you by tomorrow.\n\n(Demo draft: connect OpenAI for real drafts.)`;
}

export function demoWrite(prompt: string, draft: string): string {
  return draft ? `${draft}\n\n[Demo edit for: ${prompt}]` : `[Demo text for: ${prompt}]`;
}

export function demoClassify(rules: AutoLabelRule[], threads: ThreadSummary[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const t of threads) {
    const hay = `${t.subject} ${t.snippet} ${t.participants.map((p) => p.email).join(' ')}`.toLowerCase();
    const hits = rules.filter((r) => `${r.name} ${r.description}`.toLowerCase().split(/\W+/).filter((w) => w.length > 3).some((w) => hay.includes(w)));
    out.set(t.id, hits.map((r) => r.id));
  }
  return out;
}

export function demoCards(threads: ThreadDetail[]): ThreadCard[] {
  return threads.map((t) => {
    const last = [...t.messages].reverse().find((m) => !m.labelIds.includes('DRAFT'));
    const who = last?.from?.name || last?.from?.email || 'Someone';
    const automated = /no-?reply|notifications?@|billing|newsletter|digest/i.test(last?.from?.email ?? '') || t.messages.some((m) => m.listUnsubscribe);
    return {
      threadId: t.id,
      summary: `${who}: ${(last?.snippet ?? t.subject).slice(0, 140)}${(last?.snippet.length ?? 0) > 140 ? '…' : ''}`,
      replies: automated ? [] : [
        { label: 'Sounds good', body: 'Sounds good, thanks for the update.' },
        { label: 'Will review', body: 'Thanks, I’ll take a look and get back to you by tomorrow.' },
        { label: 'Let’s talk', body: 'Could we jump on a quick call to go over this?' },
      ],
    };
  });
}
