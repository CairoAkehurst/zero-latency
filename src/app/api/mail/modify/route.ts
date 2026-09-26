import { NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/server/gmail';

export async function POST(request: Request) {
  try {
    const { messageIds, addLabelIds, removeLabelIds, action } = await request.json();
    const { gmail } = await getGmailClient();
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'Missing messageIds' }, { status: 400 });
    }

    if (action === 'trash') {
      // Inbox rows represent Gmail conversations. Trash the whole thread so
      // older messages in that conversation cannot keep it in the inbox.
      const threadIds = await Promise.all(messageIds.map(async (id: string) => {
        const message = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'minimal',
        });
        return message.data.threadId;
      }));
      await Promise.all(
        [...new Set(threadIds.filter((id): id is string => Boolean(id)))].map(id =>
          gmail.users.threads.trash({ userId: 'me', id })
        )
      );
      return NextResponse.json({ success: true, action: 'trash' });
    }

    if (action === 'untrash') {
      await Promise.all(
        messageIds.map(id => gmail.users.messages.untrash({ userId: 'me', id }))
      );
      return NextResponse.json({ success: true, action: 'untrash' });
    }

    if (addLabelIds?.length > 0 || removeLabelIds?.length > 0) {
      // Use batchModify
      await gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: {
          ids: messageIds,
          addLabelIds: addLabelIds || [],
          removeLabelIds: removeLabelIds || []
        }
      });
      return NextResponse.json({ success: true, action: 'modify' });
    }

    return NextResponse.json({ error: 'No valid action provided' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
