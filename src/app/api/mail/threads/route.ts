import { NextResponse } from 'next/server';
import { getGmailClient, extractEmailDetails } from '@/lib/server/gmail';
import { createClient } from '@/utils/supabase/server';

type GmailMessage = {
  id?: string | null;
  threadId?: string | null;
  internalDate?: string | null;
  labelIds?: string[] | null;
  payload?: any;
  snippet?: string | null;
};

function messageTime(message: GmailMessage) {
  const fromInternalDate = Number(message.internalDate || 0);
  return fromInternalDate || Date.parse(extractEmailDetails(message.payload).timestamp) || 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const priority = searchParams.get('priority') === 'true';
    const q = priority ? 'in:inbox is:unread' : searchParams.get('q') || 'in:inbox';
    const maxResults = Math.min(100, Math.max(1, Number(searchParams.get('maxResults')) || 20));
    const pageToken = searchParams.get('pageToken') || undefined;

    const { gmail, user } = await getGmailClient();
    const supabase = await createClient();

    let myEmail = '';
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      myEmail = profile.data.emailAddress?.toLowerCase() || '';
    } catch (_) {}

    const response = await gmail.users.messages.list({ userId: 'me', maxResults, q, pageToken });
    const listedMessages = response.data.messages || [];
    if (listedMessages.length === 0) {
      return NextResponse.json({ emails: [], nextPageToken: response.data.nextPageToken || null });
    }

    let validMessages: any[] = [];

    if (priority) {
      // Gmail's unread search is message based. Resolve each matching conversation
      // and show only its newest message when that message itself is unread and
      // inbound. This keeps old unread messages from resurfacing after a reply.
      const threadIds = [...new Set(listedMessages.map((message) => message.threadId).filter(Boolean))] as string[];
      const threads = await Promise.all(threadIds.map(async (threadId) => {
        try {
          const result = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
          return result.data;
        } catch (error) {
          console.error('Failed to fetch priority thread', threadId, error);
          return null;
        }
      }));

      validMessages = threads.flatMap((thread) => {
        if (!thread?.id) return [];
        const messages = [...(thread?.messages || [])] as GmailMessage[];
        if (messages.length === 0) return [];
        messages.sort((a, b) => messageTime(b) - messageTime(a));
        const latest = messages[0];
        const labelIds = latest.labelIds || [];
        if (!latest.id || labelIds.includes('SENT') || !labelIds.includes('UNREAD') || !labelIds.includes('INBOX')) return [];

        const parsed = extractEmailDetails(latest.payload);
        if (myEmail && parsed.sender_email.toLowerCase() === myEmail) return [];
        return [{
          id: latest.id,
          google_message_id: latest.id,
          google_thread_id: thread.id,
          snippet: latest.snippet,
          is_unread: true,
          labelIds,
          ...parsed,
        }];
      });
      validMessages.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    } else {
      const sentFolder = /(?:^|\s)in:sent(?:\s|$)/i.test(q);
      const detailedMessages = await Promise.all(listedMessages.map(async (message) => {
        if (!message.id) return null;
        try {
          const detail = await gmail.users.messages.get({ userId: 'me', id: message.id, format: 'full' });
          const parsed = extractEmailDetails(detail.data.payload);
          const labelIds = detail.data.labelIds || [];
          if (!sentFolder && labelIds.includes('SENT')) return null;
          if (!sentFolder && myEmail && parsed.sender_email.toLowerCase() === myEmail) return null;
          return {
            id: message.id,
            google_message_id: message.id,
            google_thread_id: detail.data.threadId,
            snippet: detail.data.snippet,
            is_unread: labelIds.includes('UNREAD'),
            labelIds,
            _sortTime: Number(detail.data.internalDate || 0) || Date.parse(parsed.timestamp),
            ...parsed,
          };
        } catch (error) {
          console.error('Failed to fetch message detail for id', message.id, error);
          return null;
        }
      }));

      // Inbox rows represent conversations. Keep the newest matching message for
      // each conversation so a newly received reply updates the existing row.
      const newestByThread = new Map<string, any>();
      for (const email of detailedMessages.filter(Boolean) as any[]) {
        const key = email.google_thread_id || email.id;
        const existing = newestByThread.get(key);
        if (!existing || email._sortTime > existing._sortTime) newestByThread.set(key, email);
      }
      validMessages = [...newestByThread.values()]
        .sort((a, b) => b._sortTime - a._sortTime)
        .map(({ _sortTime, ...email }) => email);
    }

    let userLabelsMap = new Map<string, { id: string; name: string; color: string }>();
    try {
      const labelsRes = await gmail.users.labels.list({ userId: 'me' });
      const userLabels = (labelsRes.data.labels || []).filter((label: any) =>
        label.type === 'user' &&
        !['CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_SOCIAL', 'CATEGORY_FORUMS'].includes(label.name)
      );
      for (const label of userLabels) {
        if (label.id && label.name) {
          userLabelsMap.set(label.id, {
            id: label.id,
            name: label.name,
            color: label.color?.backgroundColor || '#4a86e8',
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch user labels in threads route:', error);
    }

    const messageIds = validMessages.map((email) => email.google_message_id);
    const { data: aiMetadata } = messageIds.length
      ? await supabase.from('email_ai_metadata')
          .select('google_message_id, tldr, suggested_reply')
          .in('google_message_id', messageIds)
          .eq('user_id', user.id)
      : { data: [] };
    const aiMap = new Map((aiMetadata || []).map((metadata: any) => [metadata.google_message_id, metadata]));

    const mappedEmails = validMessages.map((email) => {
      const metadata: any = aiMap.get(email.google_message_id);
      const matchedLabel = (email.labelIds || []).map((labelId: string) => userLabelsMap.get(labelId)).find(Boolean);
      return {
        ...email,
        summary: metadata?.tldr || email.snippet,
        category: matchedLabel?.name || null,
        categoryColor: matchedLabel?.color || 'gray',
        suggestedReply: metadata?.suggested_reply,
        hasAiMetadata: !!metadata,
      };
    });

    return NextResponse.json({ emails: mappedEmails, nextPageToken: response.data.nextPageToken || null });
  } catch (error: any) {
    console.error('Mail Threads API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
