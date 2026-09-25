import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { google } from 'googleapis';

export async function POST() {
  const supabase = await createClient();

  // In a real polling scenario, you might iterate over all users 
  // or accept a userId from the webhook payload.
  // For this MVP, let's assume we're syncing for the currently authenticated user.
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch user's Google tokens from our users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('google_access_token, google_refresh_token')
    .eq('id', user.id)
    .single();

  if (userError || !userData?.google_refresh_token) {
    return NextResponse.json({ error: 'Google tokens not found' }, { status: 400 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: userData.google_access_token,
      refresh_token: userData.google_refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch latest 10 messages (for MVP polling)
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'in:inbox' // Only fetch inbox emails
    });

    const messages = response.data.messages || [];
    let syncedCount = 0;

    for (const msg of messages) {
      if (!msg.id) continue;

      // Check if email already exists in DB
      const { data: existingEmail } = await supabase
        .from('emails')
        .select('id')
        .eq('google_message_id', msg.id)
        .single();

      if (existingEmail) continue;

      // Fetch full email details
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });

      const headers = detail.data.payload?.headers;
      const subject = headers?.find(h => h.name === 'Subject')?.value || '';
      const from = headers?.find(h => h.name === 'From')?.value || '';
      const dateHeader = headers?.find(h => h.name === 'Date')?.value || '';
      
      // Parse sender name and email
      let senderName = from;
      let senderEmail = from;
      const match = from.match(/(.*)<(.*)>/);
      if (match) {
        senderName = match[1].trim();
        senderEmail = match[2].trim();
      }

      // Simple body extraction (can be expanded to handle multipart properly)
      const bodyText = detail.data.snippet || '';

      // Insert into Supabase
      const { error: insertError } = await supabase.from('emails').insert({
        user_id: user.id,
        google_message_id: msg.id,
        google_thread_id: detail.data.threadId,
        sender_name: senderName,
        sender_email: senderEmail,
        subject: subject,
        snippet: detail.data.snippet,
        body_text: bodyText,
        is_unread: detail.data.labelIds?.includes('UNREAD') ?? false,
        received_at: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString()
      });

      if (!insertError) {
        syncedCount++;
      }
    }

    // Trigger AI processing asynchronously (or return and let the client trigger it)
    // For simplicity, we'll return success and the client can call /api/ai/process
    return NextResponse.json({ success: true, syncedCount });

  } catch (error: unknown) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
