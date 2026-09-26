import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('google_access_token, google_refresh_token')
    .eq('id', user.id)
    .single();

  if (userError || !userData?.google_refresh_token) {
    return NextResponse.json({ error: 'Google tokens not found' }, { status: 400 });
  }

  try {
    const { toEmail, ccEmail, bccEmail, subject, body, threadId, messageId, references } = await request.json();

    if (!toEmail || !body) {
      return NextResponse.json({ error: 'Missing toEmail or body' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: userData.google_access_token,
      refresh_token: userData.google_refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Construct raw RFC 2822 email
    const messageParts = [
      `To: ${toEmail}`,
      `Subject: ${subject || 'Re: Reply'}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
    ];

    if (ccEmail) messageParts.push(`Cc: ${ccEmail}`);
    if (bccEmail) messageParts.push(`Bcc: ${bccEmail}`);

    if (threadId) {
      if (messageId) messageParts.push(`In-Reply-To: ${messageId}`);
      const refStr = [references, messageId].filter(Boolean).join(' ');
      if (refStr) messageParts.push(`References: ${refStr}`);
    }

    messageParts.push('', body); // empty line before body

    const rawMessage = messageParts.join('\r\n');
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: threadId || undefined,
      },
    });

    return NextResponse.json({ success: true, messageId: sendRes.data.id });
  } catch (error: unknown) {
    console.error('Send Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
