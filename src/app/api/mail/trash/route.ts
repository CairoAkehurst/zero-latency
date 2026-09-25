import { z } from 'zod';
import { body, withMail, zIds } from '@/lib/server/api';

export async function POST(req: Request) {
  return withMail(req, async ({ provider }) => {
    const b = await body(req, z.object({ ids: zIds, undo: z.boolean().default(false) }));
    if (b.undo) await provider.untrashThreads(b.ids); else await provider.trashThreads(b.ids);
    return { ok: true };
  });
}
