import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';
import { summarizeThread } from '@/lib/server/ai';
import { demoSummary } from '@/lib/server/ai-demo';
import { isDemoAI } from '@/lib/server/ai-mode';

export async function POST(req: Request) {
  return withMail(req, async ({ provider, me }) => {
    const b = await body(req, z.object({ threadId: z.string().min(1).max(64) }));
    const thread = await provider.getThread(b.threadId);
    return { summary: isDemoAI() ? demoSummary(thread) : await summarizeThread(thread, me.email) };
  });
}

// AI calls can take a while on reasoning models; allow up to two minutes on Vercel.
export const maxDuration = 120;
