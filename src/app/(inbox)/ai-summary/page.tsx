import { redirect } from 'next/navigation';
import { AiSummaryClient } from '@/components/AiSummaryClient';
import { createClient } from '@/utils/supabase/server';

export default async function AiSummaryPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  // Load directly from the unread, latest-message priority query on the client.
  // The previous server preload could show read or already-replied messages
  // before the Gmail priority rules had been applied.
  return (
    <div className="h-full flex-1 overflow-hidden">
      <AiSummaryClient />
    </div>
  );
}
