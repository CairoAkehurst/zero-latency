import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { configProblems, env } from '@/lib/server/env';
import { createClient } from '@/utils/supabase/server';
import { MailApp } from '@/components/MailApp';

export const metadata = { title: 'ZeroLatency' };

export default async function MailPage() {
  await connection();
  if (configProblems().length) redirect('/login');
  if (!env().demo) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
  }
  return <MailApp />;
}
