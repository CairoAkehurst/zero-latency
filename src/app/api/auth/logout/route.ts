import { z } from 'zod';
import { google } from 'googleapis';
import { body, withErrors } from '@/lib/server/api';
import { loadAccount } from '@/lib/server/session';
import { createClient } from '@/utils/supabase/server';

const Body = z.object({ revoke: z.boolean().optional() });

/** Signs out of Supabase. With `revoke`, also revokes ZeroLatency's Google access and forgets the stored tokens. */
export async function POST(req: Request) {
  return withErrors(req, async () => {
    const b = await body(req, Body);
    const supabase = await createClient();
    if (b.revoke) {
      const a = await loadAccount();
      if (a) {
        const token = a.refreshToken || a.accessToken;
        if (token) await new google.auth.OAuth2().revokeToken(token).catch(() => undefined);
        await supabase.from('users').update({ google_access_token: null, google_refresh_token: null, google_token_expires_at: null, google_scopes: null }).eq('id', a.id);
      }
    }
    await supabase.auth.signOut();
    return { ok: true, remaining: 0 };
  });
}
