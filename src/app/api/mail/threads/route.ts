import { NextResponse } from 'next/server';
import { getGmailClient, extractEmailDetails } from '@/lib/server/gmail';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || 'in:inbox';
    const maxResults = Number(searchParams.get('maxResults')) || 20;
    const pageToken = searchParams.get('pageToken') || undefined;

    const { gmail, user } = await getGmailClient();
    const supabase = await createClient();

    // 1. Fetch from Gmail
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q,
      pageToken
    });

    const messagesList = response.data.messages || [];
    if (messagesList.length === 0) {
      return NextResponse.json({ emails: [], nextPageToken: null });
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

    // 3. Fetch user custom labels from Gmail to only show existing labels
    let userLabelsMap = new Map<string, { id: string; name: string; color: string }>();
    try {
      const labelsRes = await gmail.users.labels.list({ userId: 'me' });
      const rawLabels = labelsRes.data.labels || [];
      const userLabels = rawLabels.filter((l: any) => 
        l.type === 'user' && 
        !['CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_SOCIAL', 'CATEGORY_FORUMS'].includes(l.name)
      );
      for (const l of userLabels) {
        if (l.id && l.name) {
          const color = l.color?.backgroundColor || '#4a86e8';
          userLabelsMap.set(l.id, { id: l.id, name: l.name, color });
        }
      }
    } catch (lErr) {
      console.error('Failed to fetch user labels in threads route:', lErr);
    }

    // 4. Fetch AI summary metadata (TLDR / suggested reply)
    const messageIds = validMessages.map(m => m.google_message_id);
    const { data: aiMetadata } = await supabase
      .from('email_ai_metadata')
      .select('google_message_id, tldr, suggested_reply')
      .in('google_message_id', messageIds)
      .eq('user_id', user.id);

    const aiMap = new Map();
    if (aiMetadata) {
      for (const meta of aiMetadata) {
        aiMap.set(meta.google_message_id, meta);
      }
    }

    // 5. Merge only real existing labels from Gmail
    const mappedEmails = validMessages.map(email => {
      const meta = aiMap.get(email.google_message_id);
      
      // Find the first matching custom user label that actually exists in Gmail
      let matchedLabel: { name: string; color: string } | null = null;
      if (email.labelIds && Array.isArray(email.labelIds)) {
        for (const lId of email.labelIds) {
          if (userLabelsMap.has(lId)) {
            const found = userLabelsMap.get(lId)!;
            matchedLabel = { name: found.name, color: found.color };
            break;
          }
        }
      }

      return {
        ...email,
        summary: meta?.tldr || email.snippet,
        category: matchedLabel ? matchedLabel.name : null,
        categoryColor: matchedLabel ? matchedLabel.color : 'gray',
        suggestedReply: meta?.suggested_reply,
        hasAiMetadata: !!meta
      };
    });

    return NextResponse.json({ 
      emails: mappedEmails, 
      nextPageToken: response.data.nextPageToken || null 
    });

  } catch (error: any) {
    console.error('Mail Threads API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
