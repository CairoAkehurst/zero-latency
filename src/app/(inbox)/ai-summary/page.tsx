import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AiSummaryClient } from "@/components/AiSummaryClient";
import { getGmailClient, extractEmailDetails } from "@/lib/server/gmail";

export default async function AiSummaryPage() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  let initialEmails: any[] = [];
  let initialNextPageToken: string | null = null;

  try {
    const { gmail } = await getGmailClient();
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'in:inbox'
    });

    initialNextPageToken = response.data.nextPageToken || null;
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
              id: msg.id,
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

      // Fetch user custom labels that actually exist in Gmail
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
            const color = l.color?.backgroundColor ? `bg-[${l.color.backgroundColor}]` : 'blue';
            userLabelsMap.set(l.id, { id: l.id, name: l.name, color });
          }
        }
      } catch (lErr) {
        console.error('Failed to fetch user labels in ai-summary/page.tsx:', lErr);
      }

      // Fetch AI Metadata (only tldr & suggested_reply)
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

      initialEmails = validMessages.map(email => {
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
    }
  } catch (err) {
    console.error("Failed to load preloaded priority emails", err);
  }

  return (
    <div className="flex-1 h-full overflow-hidden">
      <AiSummaryClient initialEmails={initialEmails} initialNextPageToken={initialNextPageToken} />
    </div>
  );
}
