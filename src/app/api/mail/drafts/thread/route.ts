import { HttpError, withMail } from '@/lib/server/api';

export async function GET(req: Request) {
  return withMail(req, async ({ provider }) => {
    const threadId = new URL(req.url).searchParams.get('threadId');
    if (!threadId) throw new HttpError('threadId is required.', 400);
    return { draft: await provider.draftForThread(threadId) };
  });
}
