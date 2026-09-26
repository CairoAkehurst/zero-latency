import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Direct Google OAuth callback — exchanges the authorization code with Google
 * directly, then creates a valid Supabase session. Also stores Google tokens
 * in the users table for Gmail API access.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.APP_URL || url.origin;
  const fail = (msg: string) => {
    console.error('[auth/callback] FAIL:', msg);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  };

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return fail(error === 'access_denied' ? 'You cancelled the Google sign-in.' : `Google error: ${error}`);
  }

  if (!code) {
    return fail('No authorization code received from Google.');
  }

  // Verify CSRF state
  const cookieHeader = request.headers.get('cookie') || '';
  const stateMatch = cookieHeader.match(/(?:^|;\s*)oauth_state=([^;]+)/);
  const savedState = stateMatch ? stateMatch[1] : null;
  if (!savedState || savedState !== state) {
    return fail('Session expired. Please try signing in again.');
  }

  // Exchange authorization code for tokens with Google directly
  const redirectUri = `${origin}/api/auth/callback`;
  console.log('[auth/callback] Exchanging code with Google, redirect_uri:', redirectUri);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error('[auth/callback] Token exchange failed:', errBody);
    return fail('Google token exchange failed. Please try again.');
  }

  const tokens = await tokenRes.json();
  console.log('[auth/callback] Got tokens from Google. Has id_token:', !!tokens.id_token, 'Has refresh_token:', !!tokens.refresh_token);

  if (!tokens.id_token) {
    return fail('Google did not return an ID token.');
  }

  // Decode the ID token to get user info (it's a JWT, middle part is the payload)
  const idPayload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
  console.log('[auth/callback] Google user:', idPayload.email, 'sub:', idPayload.sub);

  // Try to create a Supabase session via signInWithIdToken
  const supabase = await createClient();
  let userId: string | null = null;

  const { data, error: signInError } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: tokens.id_token,
    access_token: tokens.access_token,
  });

  if (signInError) {
    console.error('[auth/callback] signInWithIdToken failed:', signInError.message);
    console.error('[auth/callback] This usually means the Google Client ID in Supabase Auth settings does not match the one used to generate this token.');
    console.error('[auth/callback] Token aud:', idPayload.aud);

    // Fallback: try signing in with email/password or create user via admin
    // For now, return an actionable error
    return fail(`Supabase auth failed: ${signInError.message}. Make sure the Google Client ID in Supabase Auth > Providers > Google matches: ${idPayload.aud}`);
  }

  userId = data.user?.id ?? null;
  console.log('[auth/callback] Supabase session created for user:', userId);

  if (!userId) {
    return fail('Authentication succeeded but no user ID was returned.');
  }

  // Store Google tokens in the users table for Gmail API access (sync/send routes need these)
  const user = data.user!;
  const { error: upsertError } = await supabase.from('users').upsert({
    id: user.id,
    email: user.email ?? '',
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
    avatar_url: user.user_metadata?.avatar_url ?? '',
    google_access_token: tokens.access_token ?? null,
    google_refresh_token: tokens.refresh_token ?? null,
  }, { onConflict: 'id' });

  if (upsertError) {
    console.error('[auth/callback] Failed to store Google tokens:', upsertError);
  }

  // Clear the CSRF state cookie and redirect to inbox
  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.set('oauth_state', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  });

  return response;
}
