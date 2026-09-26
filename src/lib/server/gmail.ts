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

  oauth2Client.on('tokens', async (tokens) => {
    try {
      const updateData: Record<string, any> = {};
      if (tokens.access_token) updateData.google_access_token = tokens.access_token;
      if (tokens.refresh_token) updateData.google_refresh_token = tokens.refresh_token;
      if (Object.keys(updateData).length > 0) {
        await supabase.from('users').update(updateData).eq('id', user.id);
      }
    } catch (err) {
      console.error('Failed to update refreshed tokens:', err);
    }
  });

  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    user,
    userId: 'me'
  };
}

export function extractEmailDetails(payload: any) {
  const headers = payload.headers || [];
  
  // Gmail header names can sometimes vary in case
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
  
  const subject = getHeader('Subject');
  const from = getHeader('From');
  const to = getHeader('To');
  const cc = getHeader('Cc');
  const bcc = getHeader('Bcc');
  const dateHeader = getHeader('Date');
  const message_id_header = getHeader('Message-ID');
  const references_header = getHeader('References') || getHeader('In-Reply-To') || '';
  
  let sender_name = from;
  let sender_email = from;
  const match = from.match(/(.*)<(.*)>/);
  if (match) {
    sender_name = match[1].trim().replace(/^"|"$/g, '');
    sender_email = match[2].trim();
  } else if (from) {
    // If it's just an email without name
    sender_name = from.trim();
    sender_email = from.trim();
  } else {
    sender_name = "Unknown";
    sender_email = "unknown@example.com";
  }

  let body_text = '';
  let body_html = '';

  function parseParts(part: any) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) {
      body_text = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      body_html = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.parts) {
      for (const p of part.parts) {
        parseParts(p);
      }
    } else if (part.body?.data) {
      // Fallback for when there are no parts but the main payload has data
      if (part.mimeType === 'text/html') {
        body_html = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else {
        body_text = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  }
  parseParts(payload);

  return {
    subject,
    sender_name,
    sender_email,
    to_email: to,
    cc,
    bcc,
    message_id_header,
    references_header,
    timestamp: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
    body_text,
    body_html
  };
}
