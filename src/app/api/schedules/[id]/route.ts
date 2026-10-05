import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await db.deleteSchedule(id);
  return NextResponse.json({ success: true });
}
