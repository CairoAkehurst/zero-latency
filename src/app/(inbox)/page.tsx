import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { InboxClient } from "@/components/InboxClient";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Render immediately from the client cache. Gmail is queried by the
  // background poll in InboxClient rather than during page navigation.
  return (
    <div className="flex-1 h-full overflow-hidden">
      <InboxClient initialEmails={[]} initialNextPageToken={null} />
    </div>
  );
}
