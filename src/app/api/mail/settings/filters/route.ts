import { z } from 'zod';
import { body, withMail } from '@/lib/server/api';

const Criteria = z.object({
  from: z.string().max(500).optional(), to: z.string().max(500).optional(), subject: z.string().max(500).optional(),
  query: z.string().max(1000).optional(), negatedQuery: z.string().max(1000).optional(), hasAttachment: z.boolean().optional(),
}).refine((c) => Object.values(c).some((v) => v !== undefined && v !== ''), 'Add at least one condition.');
const Action = z.object({ addLabelIds: z.array(z.string().max(128)).max(10).optional(), removeLabelIds: z.array(z.string().max(128)).max(10).optional() })
  .refine((a) => (a.addLabelIds?.length ?? 0) + (a.removeLabelIds?.length ?? 0) > 0, 'Choose at least one action.');

export async function GET(req: Request) {
  return withMail(req, async ({ provider }) => ({ filters: await provider.listFilters() }));
}

export async function POST(req: Request) {
  return withMail(req, async ({ provider }) => {
    const b = await body(req, z.object({ criteria: Criteria, action: Action }));
    return { filter: await provider.createFilter(b) };
  });
}
