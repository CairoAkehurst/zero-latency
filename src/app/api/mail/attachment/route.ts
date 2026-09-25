import { HttpError, withMail } from '@/lib/server/api';

// Only these types may render inline on our origin; everything else is forced to download.
const INLINE_SAFE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'application/pdf']);

export async function GET(req: Request) {
  return withMail(req, async ({ provider }) => {
    const p = new URL(req.url).searchParams;
    const messageId = p.get('messageId');
    const attachmentId = p.get('attachmentId');
    if (!messageId || !attachmentId) throw new HttpError('messageId and attachmentId are required.', 400);
    const filename = (p.get('filename') ?? 'attachment').replace(/[\r\n"\\]/g, '_').slice(0, 200);
    const mime = (p.get('mimeType') ?? '').toLowerCase();
    const inline = p.get('inline') === '1' && INLINE_SAFE.has(mime);
    const data = await provider.attachment(messageId, attachmentId);
    return new Response(Buffer.from(data), {
      headers: {
        'Content-Type': inline ? mime : 'application/octet-stream',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  });
}
