import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';

export async function GET(req: Request) {
  return withMail(req, async ({ provider }) => ({ labels: await provider.listLabels() }));
}

export async function POST(req: Request) {
  return withMail(req, async ({ provider }) => {
    const b = await body(req, z.object({ name: z.string().trim().min(1).max(225) }));
    return { label: await provider.createLabel({ name: b.name }) };
  });
}
