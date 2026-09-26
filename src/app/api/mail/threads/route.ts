import { NextResponse } from 'next/server';
import { getGmailClient, extractEmailDetails } from '@/lib/server/gmail';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || 'in:inbox';
    const maxResults = Number(searchParams.get('maxResults')) || 20;

    const { gmail, user } = await getGmailClient();
    const supabase = await createClient();

    // 1. Fetch from Gmail
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q
    });

    const messagesList = response.data.messages || [];
    if (messagesList.length === 0) {
      return NextResponse.json({ emails: [] });
    }

    // 2. Fetch full details for these messages (in parallel)
    const detailedMessages = await Promise.all(
      messagesList.map(async (msg) => {
        if (!msg.id) return null;
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full'
          });
          const parsed = extractEmailDetails(detail.data.payload);
          return {
            id: msg.id, // Using Gmail message ID as our primary ID in the UI
            google_message_id: msg.id,
            google_thread_id: detail.data.threadId,
            snippet: detail.data.snippet,
            is_unread: detail.data.labelIds?.includes('UNREAD') ?? false,
            labelIds: detail.data.labelIds || [],
            ...parsed
          };
        } catch (e) {
          console.error("Failed to fetch message detail for id", msg.id, e);
          return null;
        }
      })
    );
    const validMessages = detailedMessages.filter(Boolean) as any[];

    // 3. Fetch AI Metadata from Supabase
    const messageIds = validMessages.map(m => m.google_message_id);
    const { data: aiMetadata } = await supabase
      .from('email_ai_metadata')
      .select(`
        google_message_id,
        tldr,
        action_required,
        suggested_reply,
        categories (
          name,
          color
        )
      `)
      .in('google_message_id', messageIds)
      .eq('user_id', user.id);

    // 4. Merge
    const aiMap = new Map();
    if (aiMetadata) {
      for (const meta of aiMetadata) {
        aiMap.set(meta.google_message_id, meta);
      }
    }

    const mappedEmails = validMessages.map(email => {
      const meta = aiMap.get(email.google_message_id);
      const category = meta?.categories;

      return {
        ...email,
        summary: meta?.tldr || email.snippet,
        category: category?.name || null,
        categoryColor: category?.color || 'gray',
        suggestedReply: meta?.suggested_reply,
        hasAiMetadata: !!meta
      };
    });

    return NextResponse.json({ emails: mappedEmails });

  } catch (error: any) {
    console.error('Mail Threads API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
