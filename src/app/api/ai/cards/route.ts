import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';
import { summarizeCards } from '@/lib/server/ai';
import { demoCards } from '@/lib/server/ai-demo';
import { isDemoAI } from '@/lib/server/ai-mode';
import { mapLimit } from '@/lib/server/gmail';

export async function POST(req: Request) {
  return withMail(req, async ({ provider, me }) => {
    const b = await body(req, z.object({ threadIds: z.array(z.string().min(1).max(64)).min(1).max(12) }));
    const ids = [...new Set(b.threadIds)];
    const threads = await mapLimit(ids, 4, (id) => provider.getThread(id));
    const cards = isDemoAI() ? demoCards(threads) : await summarizeCards(threads, me);
    // Echo each thread's historyId so the client can cache per version of the thread.
    const history = Object.fromEntries(threads.map((t) => [t.id, t.historyId]));
    return { cards: cards.map((c) => ({ ...c, historyId: history[c.threadId] ?? '' })) };
  });
}

// AI calls can take a while on reasoning models; allow up to two minutes on Vercel.
export const maxDuration = 120;
