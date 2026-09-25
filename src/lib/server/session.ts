import 'server-only';
import { createClient } from '@/utils/supabase/server';
import type { AccountInfo } from '../shared/types';

export const SCOPE_GMAIL_MODIFY = 'https://www.googleapis.com/auth/gmail.modify';
export const SCOPE_GMAIL_SETTINGS = 'https://www.googleapis.com/auth/gmail.settings.basic';
export const SCOPE_FREEBUSY = 'https://www.googleapis.com/auth/calendar.freebusy';
/** Extra Google scopes requested through Supabase's Google provider (openid, email and profile are always included). */
export const GOOGLE_SCOPES = [SCOPE_GMAIL_MODIFY, SCOPE_GMAIL_SETTINGS, SCOPE_FREEBUSY];

/** The signed-in Supabase user's Google account and tokens (from the public.users table). */
export interface StoredAccount {
  /** Supabase auth user id. */
  id: string;
  email: string;
  name: string;
  picture: string | null;
  refreshToken: string;
  accessToken: string;
  /** Epoch ms when accessToken expires (0 = unknown). */
  expiresAt: number;
  scopes: string[];
}

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expires_at: string | null;
  google_scopes: string[] | null;
}

/**
 * Loads the current user from the Supabase session cookie and their Google tokens from public.users.
 * Returns null when nobody is signed in.
 */
export async function loadAccount(): Promise<StoredAccount | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, google_access_token, google_refresh_token, google_token_expires_at, google_scopes')
    .eq('id', user.id)
    .maybeSingle<UserRow>();
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: data?.email || user.email || '',
    name: data?.full_name || meta.full_name || meta.name || user.email || '',
    picture: data?.avatar_url || meta.avatar_url || meta.picture || null,
    accessToken: data?.google_access_token ?? '',
    refreshToken: data?.google_refresh_token ?? '',
    expiresAt: data?.google_token_expires_at ? Date.parse(data.google_token_expires_at) : 0,
    // Older rows (before google_scopes existed) are assumed to have the scopes requested at sign-in.
    scopes: data?.google_scopes ?? GOOGLE_SCOPES,
  };
}

/** Persists refreshed Google tokens. */
export async function saveTokens(a: StoredAccount): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('users').update({
    google_access_token: a.accessToken,
    google_refresh_token: a.refreshToken,
    google_token_expires_at: a.expiresAt ? new Date(a.expiresAt).toISOString() : null,
  }).eq('id', a.id);
  if (error) console.error('[zl] could not save refreshed Google tokens', error.message);
}

export function publicAccount(a: StoredAccount): AccountInfo {
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    picture: a.picture,
    canReadFreeBusy: a.scopes.includes(SCOPE_FREEBUSY),
  };
}

/** Only allow same-site relative return paths. */
export function safeReturnTo(v: string | null | undefined): string {
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return '/mail';
  return v;
}
