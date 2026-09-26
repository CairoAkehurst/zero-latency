import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { InboxClient } from "@/components/InboxClient";
import { getGmailClient, extractEmailDetails } from "@/lib/server/gmail";

export default async function InboxPage() {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  let mappedEmails: any[] = [];
  try {
    const { gmail } = await getGmailClient();
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      q: 'in:inbox'
    });

    const messagesList = response.data.messages || [];
    
    if (messagesList.length > 0) {
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
          } catch (e) { return null; }
        })
      );
      
      const validMessages = detailedMessages.filter(Boolean) as any[];
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

      const aiMap = new Map();
      if (aiMetadata) {
        for (const meta of aiMetadata) {
          aiMap.set(meta.google_message_id, meta);
        }
      }

      mappedEmails = validMessages.map(email => {
        const meta = aiMap.get(email.google_message_id);
        const category = meta?.categories;

        return {
          ...email,
          sender_name: email.senderName,
          sender_email: email.senderEmail,
          body_html: email.bodyHtml,
          body_text: email.bodyText,
          summary: meta?.tldr || email.snippet,
          category: category?.name || null,
          categoryColor: category?.color || 'gray',
          suggestedReply: meta?.suggested_reply,
          hasAiMetadata: !!meta
        };
      });
    }
  } catch (err) {
    console.error("Failed to load initial emails from Gmail", err);
  }

  return (
    <div className="flex-1 h-full overflow-hidden">
      <InboxClient initialEmails={mappedEmails} />
    </div>
  );
}
