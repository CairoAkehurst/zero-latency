import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';
import { draftReply } from '@/lib/server/ai';
import { demoDraft } from '@/lib/server/ai-demo';
import { isDemoAI } from '@/lib/server/ai-mode';

export async function POST(req: Request) {
  return withMail(req, async ({ provider, me }) => {
    const b = await body(req, z.object({ threadId: z.string().min(1).max(64), instruction: z.string().max(2000).optional() }));
    const thread = await provider.getThread(b.threadId);
    if (isDemoAI()) return { body: demoDraft(thread) };
    const samples = await provider.sentSamples(5).catch(() => []);
    return { body: await draftReply({ thread, me, instruction: b.instruction, samples }) };
  });
}

// AI calls can take a while on reasoning models; allow up to two minutes on Vercel.
export const maxDuration = 120;
