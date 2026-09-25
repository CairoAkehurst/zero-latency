import { z } from 'zod';
import { body, HttpError, withMail, zAddress } from '@/lib/server/api';
import { classifyThreads } from '@/lib/server/ai';
import { demoClassify } from '@/lib/server/ai-demo';
import { isDemoAI } from '@/lib/server/ai-mode';
import type { ThreadSummary } from '@/lib/shared/types';

const Rule = z.object({ id: z.string().min(1).max(64), name: z.string().min(1).max(100), description: z.string().min(1).max(1000), labelId: z.string().min(1).max(128) });
const Thread = z.object({ id: z.string().min(1).max(64), subject: z.string().max(998), snippet: z.string().max(1000), participants: z.array(zAddress).max(50) });
const Body = z.object({ rules: z.array(Rule).min(1).max(30), threads: z.array(Thread).min(1).max(100), apply: z.boolean().default(true) });

export async function POST(req: Request) {
  return withMail(req, async ({ provider, me }) => {
    const b = await body(req, Body);
    const labels = await provider.listLabels();
    const userLabels = new Set(labels.filter((l) => l.type === 'user').map((l) => l.id));
    for (const r of b.rules) if (!userLabels.has(r.labelId)) throw new HttpError(`The Gmail label for “${r.name}” no longer exists.`, 409, 'missing_label');

    const threads: ThreadSummary[] = b.threads.map((t) => ({
      id: t.id, historyId: '', subject: t.subject, snippet: t.snippet, participants: t.participants, recipients: [], lastDate: 0, messageCount: 1, labelIds: [],
      unread: false, starred: false, important: false, hasAttachment: false, hasCalendar: false, hasDraft: false,
    }));
    const rules = b.rules.map(({ id, name, description }) => ({ id, name, description }));
    const result = isDemoAI() ? demoClassify(rules, threads) : await classifyThreads(rules, threads, me.email);

    const byLabel = new Map<string, string[]>();
    for (const [threadId, ruleIds] of result) {
      for (const rid of ruleIds) {
        const labelId = b.rules.find((r) => r.id === rid)!.labelId;
        byLabel.set(labelId, [...(byLabel.get(labelId) ?? []), threadId]);
      }
    }
    if (b.apply) for (const [labelId, ids] of byLabel) await provider.modifyThreads(ids, [labelId], []);
    return { assignments: Object.fromEntries(result), processed: threads.map((t) => t.id) };
  });
}

// AI calls can take a while on reasoning models; allow up to two minutes on Vercel.
export const maxDuration = 120;
