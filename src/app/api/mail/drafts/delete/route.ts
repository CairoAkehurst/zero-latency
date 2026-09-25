import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';

export async function POST(req: Request) {
  return withMail(req, async ({ provider }) => {
    const b = await body(req, z.object({ draftId: z.string().min(1).max(128) }));
    await provider.deleteDraft(b.draftId);
    return { ok: true };
  });
}
