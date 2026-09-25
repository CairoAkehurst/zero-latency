import { withMail } from '@/lib/server/api';

export async function GET(req: Request) {
  return withMail(req, async ({ provider }) => ({ contacts: await provider.recentContacts() }));
}
