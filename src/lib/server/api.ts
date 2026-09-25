import 'server-only';
import { z } from 'zod';
import { ConfigError, env } from './env';
import { ProviderError, type MailProvider } from './provider';
import { AIError } from './openai';
import { GmailProvider } from './gmail';
import { DEMO_ACCOUNT, DemoProvider } from './demo';
import { loadAccount, saveTokens, type StoredAccount } from './session';
import type { Address } from '../shared/types';

export class HttpError extends Error {
  constructor(message: string, public readonly status: number, public readonly code = 'error') {
    super(message);
  }
}

export interface Ctx {
  provider: MailProvider;
  me: Address;
  accountId: string;
}

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...init?.headers } });
}

function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return json({ error: e.message, code: e.code }, { status: e.status });
  if (e instanceof ProviderError) return json({ error: e.message, code: e.code }, { status: e.status >= 400 && e.status < 600 ? e.status : 502 });
  if (e instanceof AIError) return json({ error: e.message, code: 'ai_error' }, { status: e.status });
  if (e instanceof z.ZodError) return json({ error: 'Invalid request.', code: 'bad_request', issues: e.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }, { status: 400 });
  if (e instanceof ConfigError) return json({ error: e.message, code: 'config' }, { status: 500 });
  console.error('[zl] unexpected error', e);
  return json({ error: 'Something went wrong. Try again.', code: 'internal' }, { status: 500 });
}

/** Rejects cross-site state-changing requests (defence in depth on top of SameSite=Lax cookies). */
function assertSameOrigin(req: Request) {
  if (req.method === 'GET' || req.method === 'HEAD') return;
  const origin = req.headers.get('origin');
  const site = req.headers.get('sec-fetch-site');
  const self = new URL(req.url).origin;
  const allowed = new Set([self, env().appUrl].filter(Boolean));
  if (origin ? !allowed.has(origin) : site && site !== 'same-origin' && site !== 'none') {
    throw new HttpError('Cross-site request blocked.', 403, 'csrf');
  }
}

/** Wraps a route: resolves the Supabase user and their Gmail provider, persists refreshed tokens, maps errors to JSON. */
export async function withMail(req: Request, fn: (ctx: Ctx) => Promise<Response | unknown>): Promise<Response> {
  try {
    assertSameOrigin(req);
    if (env().demo) {
      const res = await fn({ provider: new DemoProvider(), me: { name: DEMO_ACCOUNT.name, email: DEMO_ACCOUNT.email }, accountId: DEMO_ACCOUNT.id });
      return res instanceof Response ? res : json(res ?? { ok: true });
    }
    const account = await loadAccount();
    if (!account) throw new HttpError('Not signed in.', 401, 'unauthenticated');
    if (!account.refreshToken && !account.accessToken) throw new HttpError('Google access is missing. Sign in again.', 401, 'reauth');
    let updated: StoredAccount | null = null;
    const provider = new GmailProvider(account, (a) => { updated = a; });
    try {
      const res = await fn({ provider, me: { name: account.name, email: account.email }, accountId: account.id });
      return res instanceof Response ? res : json(res ?? { ok: true });
    } finally {
      if (updated) await saveTokens(updated);
    }
  } catch (e) {
    return errorResponse(e);
  }
}

/** Wraps a route that needs no mailbox (auth, AI without mail access). */
export async function withErrors(req: Request, fn: () => Promise<Response | unknown>): Promise<Response> {
  try {
    assertSameOrigin(req);
    const res = await fn();
    return res instanceof Response ? res : json(res ?? { ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try { raw = await req.json(); } catch { throw new HttpError('Request body must be JSON.', 400, 'bad_request'); }
  return schema.parse(raw);
}

export const zAddress = z.object({ name: z.string().max(200).default(''), email: z.email().max(320) });
export const zIds = z.array(z.string().min(1).max(64)).min(1).max(500);
