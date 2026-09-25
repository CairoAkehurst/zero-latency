import { z } from 'zod';
import { body, HttpError, withMail } from '@/lib/server/api';

export async function POST(req: Request) {
  return withMail(req, async ({ provider }) => {
    const b = await body(req, z.object({ timeMin: z.number().int(), timeMax: z.number().int() }));
    if (b.timeMax <= b.timeMin || b.timeMax - b.timeMin > 31 * 86_400_000) throw new HttpError('Choose a range of up to 31 days.', 400);
    return { busy: await provider.freeBusy(b.timeMin, b.timeMax) };
  });
}
