import { NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/server/gmail';

export async function POST(request: Request) {
  try {
    const { messageIds = [], threadIds = [], addLabelIds, removeLabelIds, action } = await request.json();
    const { gmail } = await getGmailClient();

    if (!Array.isArray(messageIds) || !Array.isArray(threadIds)) {
      return NextResponse.json({ error: 'messageIds and threadIds must be arrays' }, { status: 400 });
    }
    const uniqueMessageIds = [...new Set(messageIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))];
    const uniqueThreadIds = [...new Set(threadIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))];
    if (uniqueMessageIds.length === 0 && uniqueThreadIds.length === 0) {
      return NextResponse.json({ error: 'Missing messageIds or threadIds' }, { status: 400 });
    }

    if (action === 'trash' || action === 'archive') {
      // Inbox rows represent Gmail conversations. Apply destructive inbox
      // actions to the whole thread so older messages cannot keep it visible.
      const resolvedThreadIds = await Promise.all(uniqueMessageIds.map(async (id: string) => {
        const message = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'minimal',
        });
        return message.data.threadId;
      }));
      const allThreadIds = [...new Set([...uniqueThreadIds, ...resolvedThreadIds.filter((id): id is string => Boolean(id))])];
      if (allThreadIds.length === 0) return NextResponse.json({ error: 'No Gmail conversations found' }, { status: 404 });
      if (action === 'trash') {
        await Promise.all(allThreadIds.map(id => gmail.users.threads.trash({ userId: 'me', id })));
      } else {
        await Promise.all(allThreadIds.map(id => gmail.users.threads.modify({
          userId: 'me',
          id,
          requestBody: { removeLabelIds: ['INBOX'] },
        })));
      }
      return NextResponse.json({ success: true, action });
    }

    if (action === 'untrash') {
      await Promise.all(
        uniqueMessageIds.map(id => gmail.users.messages.untrash({ userId: 'me', id }))
      );
      return NextResponse.json({ success: true, action: 'untrash' });
    }

    if (action === 'markRead') {
      if (uniqueMessageIds.length === 0) {
        return NextResponse.json({ error: 'messageIds are required to mark a message read' }, { status: 400 });
      }
      await gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: { ids: uniqueMessageIds, removeLabelIds: ['UNREAD'] },
      });
      return NextResponse.json({ success: true, action: 'markRead' });
    }

    if (addLabelIds?.length > 0 || removeLabelIds?.length > 0) {
      if (uniqueThreadIds.length > 0) {
        await Promise.all(uniqueThreadIds.map(id => gmail.users.threads.modify({
          userId: 'me',
          id,
          requestBody: { addLabelIds: addLabelIds || [], removeLabelIds: removeLabelIds || [] },
        })));
      } else {
        await gmail.users.messages.batchModify({
          userId: 'me',
          requestBody: {
            ids: uniqueMessageIds,
            addLabelIds: addLabelIds || [],
            removeLabelIds: removeLabelIds || []
          }
        });
      }
      return NextResponse.json({ success: true, action: 'modify' });
    }

    return NextResponse.json({ error: 'No valid action provided' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
