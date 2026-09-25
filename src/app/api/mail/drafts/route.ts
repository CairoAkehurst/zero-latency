import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';
import { zOutgoing } from '@/lib/server/schemas';

export async function POST(req: Request) {
  return withMail(req, async ({ provider, me }) => {
    const b = await body(req, z.object({ message: zOutgoing, draftId: z.string().max(128).nullable().optional(), fromName: z.string().max(200).optional() }));
    return provider.saveDraft(b.draftId ?? null, b.message, { name: b.fromName ?? me.name, email: me.email });
  });
}
