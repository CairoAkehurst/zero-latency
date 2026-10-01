import { redirect } from 'next/navigation';
import { LaunchClient } from '@/components/LaunchClient';
import { createClient } from '@/utils/supabase/server';

export default async function LaunchPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  return (
    <div className="h-full flex-1 overflow-hidden">
      <LaunchClient />
    </div>
  );
}
