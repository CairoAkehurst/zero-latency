import { NextResponse } from 'next/server';
import { getGmailClient, extractEmailDetails } from '@/lib/server/gmail';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json({ error: 'Missing threadId' }, { status: 400 });
    }

    const { gmail } = await getGmailClient();

    // Fetch the full thread including all messages in order
    const threadRes = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full'
    });

    const messages = threadRes.data.messages || [];

    const parsedMessages = messages.map((msg) => {
      const parsed = extractEmailDetails(msg.payload);
      return {
        id: msg.id,
        google_message_id: msg.id,
        google_thread_id: threadRes.data.id || threadId,
        snippet: msg.snippet,
        labelIds: msg.labelIds || [],
        is_unread: msg.labelIds?.includes('UNREAD') ?? false,
        is_sent: msg.labelIds?.includes('SENT') ?? false,
        ...parsed
      };
    });

    return NextResponse.json({
      threadId: threadRes.data.id || threadId,
      messages: parsedMessages
    });
  } catch (error: any) {
    console.error('Thread API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
