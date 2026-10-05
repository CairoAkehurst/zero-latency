import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { google } from 'googleapis';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const schedule = await db.getScheduleBySlug(slug);
  if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(schedule);
}
