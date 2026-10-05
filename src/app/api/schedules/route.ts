import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const schedules = await db.getSchedules(user.id);
  // hide tokens from response
  return NextResponse.json(schedules.map(s => {
    const { googleRefreshToken, googleAccessToken, ...rest } = s;
    return rest;
  }));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase
    .from('users')
    .select('google_access_token, google_refresh_token')
    .eq('id', user.id)
    .single();

  const body = await req.json();
  const schedule = {
    id: crypto.randomUUID(),
    userId: user.id,
    ...body,
    googleAccessToken: userData?.google_access_token,
    googleRefreshToken: userData?.google_refresh_token,
  };
  await db.createSchedule(schedule);
  return NextResponse.json(schedule);
}
