import { z } from 'zod';
import { body, withMail, zIds } from '@/lib/server/api';

const LabelId = z.string().min(1).max(128);
const Body = z.object({ ids: zIds, add: z.array(LabelId).max(20).default([]), remove: z.array(LabelId).max(20).default([]) });

export async function POST(req: Request) {
  return withMail(req, async ({ provider }) => {
    const b = await body(req, Body);
    await provider.modifyThreads(b.ids, b.add, b.remove);
    return { ok: true };
  });
}
