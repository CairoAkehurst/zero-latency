import { body, HttpError, withMail } from '@/lib/server/api';
import { zOutgoing } from '@/lib/server/schemas';
import { z } from 'zod';

export async function POST(req: Request) {
  return withMail(req, async ({ provider, me }) => {
    const b = await body(req, z.object({ message: zOutgoing, draftId: z.string().max(128).nullable().optional(), fromName: z.string().max(200).optional() }));
    if (!b.message.to.length && !b.message.cc.length && !b.message.bcc.length) throw new HttpError('Add at least one recipient.', 400);
    const from = { name: b.fromName ?? me.name, email: me.email };
    const sent = await provider.send(b.message, from);
    if (b.draftId) await provider.deleteDraft(b.draftId).catch(() => undefined);
    return sent;
  });
}
