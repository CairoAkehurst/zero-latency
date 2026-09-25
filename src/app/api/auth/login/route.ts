import { configProblems, env } from '@/lib/server/env';
import { GOOGLE_SCOPES, safeReturnTo } from '@/lib/server/session';
import { createClient } from '@/utils/supabase/server';

/** Starts Google sign-in through Supabase Auth (Google provider), asking for Gmail and Calendar access. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
  if (configProblems().length) return Response.redirect(new URL('/login', url.origin), 303);
  if (env().demo) return Response.redirect(new URL(returnTo, url.origin), 303);
  // Start sign-in on the canonical host so the PKCE cookie and the callback land on the same domain.
  const canonical = env().appUrl;
  if (canonical && new URL(canonical).origin !== url.origin) {
    return Response.redirect(new URL(`/api/auth/login${url.search}`, canonical), 303);
  }
  const origin = canonical ?? url.origin;
  const hint = url.searchParams.get('hint');
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
      scopes: GOOGLE_SCOPES.join(' '),
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent select_account',
        include_granted_scopes: 'true',
        ...(hint ? { login_hint: hint } : {}),
      },
    },
  });
  if (error || !data.url) {
    return Response.redirect(new URL(`/login?error=${encodeURIComponent(error?.message ?? 'Could not start Google sign-in.')}`, url.origin), 303);
  }
  return new Response(null, { status: 303, headers: { Location: data.url, 'Cache-Control': 'no-store' } });
}
