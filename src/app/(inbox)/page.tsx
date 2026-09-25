import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { InboxClient } from "@/components/InboxClient";

export default async function InboxPage() {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Fetch emails with their AI metadata and categories
  const { data: emails } = await supabase
    .from('emails')
    .select(`
      *,
      email_ai_metadata (
        tldr,
        action_required,
        suggested_reply,
        categories (
          name,
          color
        )
      )
    `)
    .eq('user_id', user.id)
    .order('received_at', { ascending: false });

  // Map the nested Supabase data into a flatter structure for the client
  const mappedEmails = (emails || []).map(email => {
    const meta = Array.isArray(email.email_ai_metadata) ? email.email_ai_metadata[0] : email.email_ai_metadata;
    const category = meta?.categories;

    return {
      ...email,
      summary: meta?.tldr || email.snippet,
      category: category?.name || null,
      categoryColor: category?.color || 'gray',
      suggestedReply: meta?.suggested_reply,
      hasAiMetadata: !!meta,
      timestamp: new Date(email.received_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
  });

  return (
    <div className="flex-1 h-full overflow-hidden">
      <InboxClient initialEmails={mappedEmails} />
    </div>
  );
}
