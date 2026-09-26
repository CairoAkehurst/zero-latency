import { NextResponse } from 'next/server';
import { getCalendarClient } from '@/lib/server/gmail';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const { 
      emailSubject, 
      emailBody, 
      recipientEmail, 
      recipientName, 
      replyText 
    } = await request.json();

    if (!recipientEmail) {
      return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const now = new Date();
    const isoNow = now.toISOString();

    const systemPrompt = `You are an intelligent calendar assistant for Zero Latency.
Analyze the email conversation and reply to detect if a meeting, call, appointment, or calendar event is being scheduled, accepted, or confirmed.
Current date/time (ISO): ${isoNow}.

If a meeting is required or agreed upon:
Extract:
1. "shouldCreateInvite": true (set to true ONLY if a specific meeting/call is being scheduled, proposed, or agreed upon; set to false if it's declining, or purely informational).
2. "summary": Concise title of the calendar event (e.g. "Catch-up: Cairo & Sarah", "Project Sync", "Intro Call").
3. "description": Brief context or agenda from the email.
4. "startTime": ISO 8601 string for start of event (resolve relative times like "tomorrow at 4pm", "Friday at 10am" using current ISO: ${isoNow}).
5. "endTime": ISO 8601 string for end of event (default to 30 or 60 minutes after startTime if duration isn't specified).
6. "location": Physical location or "Google Meet" / virtual link if mentioned.

If no meeting needs to be scheduled on calendar, return:
{
  "shouldCreateInvite": false
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Subject: ${emailSubject || ''}
Recipient: ${recipientName || ''} <${recipientEmail}>
Email Content:
${emailBody || ''}

Reply Being Sent:
${replyText || ''}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 400,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');

    if (!parsed.shouldCreateInvite || !parsed.startTime) {
      return NextResponse.json({ created: false, message: 'No calendar invite required.' });
    }

    const { calendar } = await getCalendarClient();

    // Default duration to 30 mins if endTime is missing or invalid
    const startDt = new Date(parsed.startTime);
    if (isNaN(startDt.getTime())) {
      return NextResponse.json({ created: false, message: 'Invalid start time generated.' });
    }

    let endDt = parsed.endTime ? new Date(parsed.endTime) : new Date(startDt.getTime() + 30 * 60 * 1000);
    if (isNaN(endDt.getTime()) || endDt <= startDt) {
      endDt = new Date(startDt.getTime() + 30 * 60 * 1000);
    }

    const event = {
      summary: parsed.summary || emailSubject || 'Meeting',
      description: `${parsed.description || ''}\n\nScheduled via Zero Latency AI`,
      start: {
        dateTime: startDt.toISOString(),
      },
      end: {
        dateTime: endDt.toISOString(),
      },
      attendees: [
        { email: recipientEmail, displayName: recipientName || undefined },
      ],
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: true,
      },
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // Auto-sends Google Calendar email invite to attendees!
      conferenceDataVersion: 1,
    });

    return NextResponse.json({
      created: true,
      eventId: res.data.id,
      htmlLink: res.data.htmlLink,
      summary: res.data.summary,
      start: res.data.start?.dateTime,
      end: res.data.end?.dateTime,
    });
  } catch (error: any) {
    console.error('Calendar invite error:', error);
    return NextResponse.json({ 
      created: false, 
      error: error.message || 'Failed to create calendar invite' 
    }, { status: 500 });
  }
}
