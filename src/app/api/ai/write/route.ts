import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';
import { threadForPrompt, writeWithAI } from '@/lib/server/ai';
import { demoWrite } from '@/lib/server/ai-demo';
import { isDemoAI } from '@/lib/server/ai-mode';

const Body = z.object({
  prompt: z.string().trim().min(1).max(4000),
  draft: z.string().max(40_000).default(''),
  subject: z.string().max(998).default(''),
  to: z.array(z.string().max(320)).max(100).default([]),
  threadId: z.string().max(64).optional(),
  /** Extra context the user @-mentioned (e.g. snippet or note text). */
  context: z.string().max(20_000).optional(),
});

export async function POST(req: Request) {
  return withMail(req, async ({ provider, me }) => {
    const b = await body(req, Body);
    if (isDemoAI()) return { body: demoWrite(b.prompt, b.draft) };
    const threadContext = b.threadId ? threadForPrompt(await provider.getThread(b.threadId), 8000) : undefined;
    const samples = await provider.sentSamples(5).catch(() => []);
    const context = [threadContext, b.context ? `Reference notes the user attached:\n${b.context}` : ''].filter(Boolean).join('\n\n') || undefined;
    return { body: await writeWithAI({ prompt: b.prompt, draft: b.draft, subject: b.subject, to: b.to, threadContext: context, me, samples }) };
  });
}

// AI calls can take a while on reasoning models; allow up to two minutes on Vercel.
export const maxDuration = 120;
