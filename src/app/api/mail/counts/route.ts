import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';
import { mapLimit } from '@/lib/server/gmail';

export async function POST(req: Request) {
  return withMail(req, async ({ provider }) => {
    const b = await body(req, z.object({ queries: z.array(z.string().max(2000)).max(40) }));
    const counts = await mapLimit(b.queries, 4, (q) => provider.countThreads(q, 100).catch(() => -1));
    return { counts };
  });
}
