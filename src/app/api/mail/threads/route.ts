import { withMail } from '@/lib/server/api';

export async function GET(req: Request) {
  return withMail(req, async ({ provider }) => {
    const p = new URL(req.url).searchParams;
    const q = (p.get('q') ?? '').slice(0, 2000);
    const max = Math.min(Math.max(Number(p.get('max') ?? 40) || 40, 1), 100);
    return provider.listThreads(q, { pageToken: p.get('pageToken') ?? undefined, maxResults: max });
  });
}
