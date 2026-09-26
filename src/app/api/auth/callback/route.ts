import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.APP_URL || url.origin;
  const fail = (msg: string) => {
    console.error('[auth/callback] FAIL:', msg);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  };

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return fail(error === 'access_denied' ? 'You cancelled the Google sign-in.' : `Google error: ${error}`);
  }
  if (!code) {
    return fail('No authorization code received from Google.');
  }

  // Clean up the CSRF cookie via the Next.js cookies API (not on the response object)
  const jar = await cookies();
  jar.delete({ name: 'oauth_state', path: '/api/auth' });

  // Exchange code with Google directly
  const redirectUri = `${origin}/api/auth/callback`;
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
    console.error('[auth/callback] Google token exchange failed:', errBody);
    return fail('Google token exchange failed. Please try again.');
  }

  const tokens = await tokenRes.json();
  if (!tokens.id_token) {
    return fail('Google did not return an ID token.');
  }

  // Decode ID token to get user info
  const idPayload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
  console.log('[auth/callback] Google user:', idPayload.email);

  // Create Supabase session — this sets auth cookies via the cookies() API
  const supabase = await createClient();
  const { data, error: signInError } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: tokens.id_token,
    access_token: tokens.access_token,
  });

  if (signInError) {
    console.error('[auth/callback] signInWithIdToken failed:', signInError.message);
    return fail(`Supabase login failed: ${signInError.message}. Update Supabase Auth > Providers > Google Client ID to match: ${idPayload.aud}`);
  }

  if (!data.user) {
    return fail('No user returned from authentication.');
  }

  // Store Google tokens in users table for Gmail sync/send
  const user = data.user;
  await supabase.from('users').upsert({
    id: user.id,
    email: user.email ?? '',
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
    avatar_url: user.user_metadata?.avatar_url ?? '',
    google_access_token: tokens.access_token ?? null,
    google_refresh_token: tokens.refresh_token ?? null,
  }, { onConflict: 'id' });

  console.log('[auth/callback] Success! Redirecting to inbox.');
  
  // Return a plain redirect — the Supabase session cookies were already set
  // via cookies() by the createClient/signInWithIdToken call above.
  // IMPORTANT: Do NOT set any cookies on this NextResponse object, 
  // or it may conflict with the cookies set by the Supabase client.
  return NextResponse.redirect(`${origin}/`);
}
