import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withMail(req, async ({ provider }) => {
    const b = await body(req, z.object({ name: z.string().trim().min(1).max(225) }));
    return { label: await provider.updateLabel(id, { name: b.name }) };
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withMail(req, async ({ provider }) => {
    await provider.deleteLabel(id);
    return { ok: true };
  });
}
