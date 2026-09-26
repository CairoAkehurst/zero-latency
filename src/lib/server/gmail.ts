import { google } from 'googleapis';
import { createClient } from '@/utils/supabase/server';

export async function getGmailClient() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('google_access_token, google_refresh_token')
    .eq('id', user.id)
    .single();

  if (userError || !userData?.google_refresh_token) {
    throw new Error('Google tokens not found');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: userData.google_access_token,
    refresh_token: userData.google_refresh_token,
  });

  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    user,
    userId: 'me'
  };
}

export function extractEmailDetails(payload: any) {
  const headers = payload.headers || [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
  const from = headers.find((h: any) => h.name === 'From')?.value || '';
  const to = headers.find((h: any) => h.name === 'To')?.value || '';
  const cc = headers.find((h: any) => h.name === 'Cc')?.value || '';
  const bcc = headers.find((h: any) => h.name === 'Bcc')?.value || '';
  const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || '';
  
  let senderName = from;
  let senderEmail = from;
  const match = from.match(/(.*)<(.*)>/);
  if (match) {
    senderName = match[1].trim().replace(/^"|"$/g, '');
    senderEmail = match[2].trim();
  }

  let bodyText = '';
  let bodyHtml = '';

  function parseParts(part: any) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.parts) {
      for (const p of part.parts) {
        parseParts(p);
      }
    }
  }
  parseParts(payload);

  return {
    subject,
    senderName,
    senderEmail,
    toEmail: to,
    cc,
    bcc,
    timestamp: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
    bodyText,
    bodyHtml
  };
}
