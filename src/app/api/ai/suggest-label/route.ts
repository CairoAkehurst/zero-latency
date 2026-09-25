import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';
import { suggestAutoLabel } from '@/lib/server/ai';
import { isDemoAI } from '@/lib/server/ai-mode';

export async function POST(req: Request) {
  return withMail(req, async ({ provider }) => {
    const b = await body(req, z.object({ threadId: z.string().min(1).max(64) }));
    const thread = await provider.getThread(b.threadId);
    if (isDemoAI()) return { name: thread.subject.split(/\s+/).slice(0, 2).join(' ') || 'Similar', description: `Emails like “${thread.subject}”.` };
    return await suggestAutoLabel(thread);
  });
}

// AI calls can take a while on reasoning models; allow up to two minutes on Vercel.
export const maxDuration = 120;
