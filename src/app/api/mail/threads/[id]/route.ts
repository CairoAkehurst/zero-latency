import { withMail } from '@/lib/server/api';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withMail(req, async ({ provider }) => provider.getThread(id));
}
