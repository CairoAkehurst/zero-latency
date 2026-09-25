import { google } from 'googleapis';
import { SCOPE_GMAIL_MODIFY, safeReturnTo } from '@/lib/server/session';
import { createClient } from '@/utils/supabase/server';

function go(origin: string, path: string): Response {
  return new Response(null, { status: 303, headers: { Location: new URL(path, origin).toString(), 'Cache-Control': 'no-store' } });
}

/** Supabase redirects here after Google sign-in. Exchanges the code and stores the Google tokens for Gmail access. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const forwardedHost = req.headers.get('x-forwarded-host');
  const origin = process.env.NODE_ENV !== 'development' && forwardedHost ? `https://${forwardedHost}` : url.origin;
  const fail = (reason: string) => go(origin, `/login?error=${encodeURIComponent(reason)}`);

  const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (oauthError) return fail(/access_denied/i.test(oauthError) ? 'You cancelled the Google sign-in.' : `Google sign-in failed: ${oauthError}`);
  const code = url.searchParams.get('code');
  if (!code) return fail('Your sign-in session expired. Please try again.');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session?.user) return fail(`Google sign-in failed: ${error?.message ?? 'no session'}`);

  const { user, provider_token: accessToken, provider_refresh_token: refreshToken } = data.session;
  if (!accessToken) return fail('Google did not return an access token. Please try again.');

  // Ask Google which scopes were granted (the user can untick boxes on the consent screen).
  let scopes: string[] = [];
  let expiresAt = Date.now() + 3500_000;
  try {
    const info = await new google.auth.OAuth2().getTokenInfo(accessToken);
    scopes = info.scopes ?? [];
    if (info.expiry_date) expiresAt = info.expiry_date;
  } catch {
    // Keep going; Gmail calls will report a missing permission if needed.
  }
  if (scopes.length && !scopes.includes(SCOPE_GMAIL_MODIFY)) {
    await supabase.auth.signOut();
    return fail('ZeroLatency needs permission to read and organise your Gmail. Tick the Gmail access box when signing in.');
  }

  const meta = user.user_metadata ?? {};
  const row: Record<string, unknown> = {
    id: user.id,
    email: user.email ?? '',
    full_name: meta.full_name ?? meta.name ?? '',
    avatar_url: meta.avatar_url ?? meta.picture ?? '',
    google_access_token: accessToken,
    google_token_expires_at: new Date(expiresAt).toISOString(),
    google_scopes: scopes.length ? scopes : null,
  };
  // Google only returns a refresh token on consent; keep the stored one otherwise.
  if (refreshToken) row.google_refresh_token = refreshToken;
  const { error: dbError } = await supabase.from('users').upsert(row, { onConflict: 'id' });
  if (dbError) {
    console.error('[zl] could not store Google tokens', dbError.message);
    return fail(`Signed in, but saving your Google access failed: ${dbError.message}. Did you run supabase_schema.sql?`);
  }
  return go(origin, safeReturnTo(url.searchParams.get('next')));
}
