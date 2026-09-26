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

    // Get the user's own email address so we can filter out self-sent messages
    let myEmail = '';
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      myEmail = profile.data.emailAddress?.toLowerCase() || '';
    } catch (_) {}

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
          const labelIds = detail.data.labelIds || [];

          // Skip messages sent by the user — SENT label present means it's an outgoing email
          if (labelIds.includes('SENT')) return null;

          // Also skip if the From address is the user's own email
          const senderEmailLower = (parsed.sender_email || '').toLowerCase();
          if (myEmail && senderEmailLower === myEmail) return null;

          return {
            id: msg.id,
            google_message_id: msg.id,
            google_thread_id: detail.data.threadId,
            snippet: detail.data.snippet,
            is_unread: labelIds.includes('UNREAD'),
            labelIds,
            ...parsed
          };
        } catch (e) {
          console.error("Failed to fetch message detail for id", msg.id, e);
          return null;
        }
      })
    );
    let validMessages = detailedMessages.filter(Boolean) as any[];

    // 3. Thread-level filter: if the user has already replied (i.e. the most recent
    //    message in the thread has the SENT label), skip this thread from priority inbox.
    //    We deduplicate by threadId and keep only the first (latest-fetched) occurrence.
    const seenThreadIds = new Set<string>();
    const threadFilteredMessages: any[] = [];

    for (const email of validMessages) {
      const threadId = email.google_thread_id;
      if (!threadId || seenThreadIds.has(threadId)) continue;
      seenThreadIds.add(threadId);

      try {
        const threadRes = await gmail.users.threads.get({
          userId: 'me',
          id: threadId,
          format: 'metadata',
          metadataHeaders: ['From']
        });
        const messages = threadRes.data.messages || [];
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          const lastLabelIds = lastMsg.labelIds || [];
          // If the most recent message in the thread is SENT, user already replied → skip
          if (lastLabelIds.includes('SENT')) continue;
        }
      } catch (_) {
        // If thread fetch fails, include it anyway (fail open)
      }

      threadFilteredMessages.push(email);
    }
    validMessages = threadFilteredMessages;

    // 4. Fetch user custom labels from Gmail to only show existing labels
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

    // 5. Fetch AI summary metadata (TLDR / suggested reply)
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

    // 6. Merge only real existing labels from Gmail
    const mappedEmails = validMessages.map(email => {
      const meta = aiMap.get(email.google_message_id);
      
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

