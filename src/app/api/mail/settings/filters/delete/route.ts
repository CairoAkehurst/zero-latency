import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';

export async function POST(req: Request) {
  return withMail(req, async ({ provider }) => {
    const b = await body(req, z.object({ id: z.string().min(1).max(256) }));
    await provider.deleteFilter(b.id);
    return { ok: true };
  });
}
