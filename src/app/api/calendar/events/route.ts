import { NextResponse } from 'next/server';
import { getCalendarClient } from '@/lib/server/gmail';
import { randomUUID } from 'node:crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: 'timeMin and timeMax are required' }, { status: 400 });
    }

    const { calendar } = await getCalendarClient();
    const result = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });
    return NextResponse.json({ events: result.data.items || [] });
  } catch (error: unknown) {
    console.error('Calendar list error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load calendar events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { summary, description, start, end, attendeeEmail, attendeeName, location } = await request.json();
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!summary || !start || !end || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return NextResponse.json({ error: 'A title and valid start/end times are required' }, { status: 400 });
    }

    const { calendar } = await getCalendarClient();
    const result = await calendar.events.insert({
      calendarId: 'primary',
      sendUpdates: attendeeEmail ? 'all' : 'none',
      conferenceDataVersion: 1,
      requestBody: {
        summary,
        description: description || undefined,
        location: location || undefined,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
        attendees: attendeeEmail ? [{ email: attendeeEmail, displayName: attendeeName || undefined }] : undefined,
        conferenceData: {
          createRequest: {
            requestId: `calendar-${randomUUID()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });
    return NextResponse.json({ event: result.data }, { status: 201 });
  } catch (error: unknown) {
    console.error('Calendar create error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create calendar event' }, { status: 500 });
  }
}
