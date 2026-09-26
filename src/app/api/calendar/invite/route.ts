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

    const meetLink = res.data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || res.data.htmlLink || '';

    // Format human-friendly meeting date/time (e.g., "Friday, Oct 24, 2026, 3:00 PM – 3:30 PM")
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    const dateFormatted = startDt.toLocaleDateString('en-US', dateOptions);
    const startTimeFormatted = startDt.toLocaleTimeString('en-US', timeOptions);
    const endTimeFormatted = endDt.toLocaleTimeString('en-US', timeOptions);
    const fullTimeStr = `${dateFormatted} · ${startTimeFormatted} - ${endTimeFormatted}`;

    const inviteCardHtml = `
<div style="margin-top: 24px; margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); background-color: #ffffff;">
  <div style="background-color: #2563eb; padding: 14px 18px; color: #ffffff; display: flex; align-items: center;">
    <span style="font-size: 16px; font-weight: 600; letter-spacing: -0.01em;">📅 Google Calendar Invitation</span>
  </div>
  <div style="padding: 18px 20px; color: #374151;">
    <h3 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 700; color: #111827;">${event.summary}</h3>
    <div style="font-size: 14px; color: #4b5563; margin-bottom: 6px;">
      <strong>When:</strong> ${fullTimeStr}
    </div>
    ${meetLink ? `
    <div style="font-size: 14px; color: #4b5563; margin-bottom: 16px;">
      <strong>Where:</strong> <a href="${meetLink}" style="color: #2563eb; text-decoration: underline;" target="_blank">Join with Google Meet</a>
    </div>` : ''}
    <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #f3f4f6; display: flex; gap: 10px;">
      ${res.data.htmlLink ? `
      <a href="${res.data.htmlLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 6px;" target="_blank">
        View on Google Calendar
      </a>` : ''}
      ${meetLink ? `
      <a href="${meetLink}" style="display: inline-block; background-color: #f3f4f6; color: #1f2937; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 6px; border: 1px solid #e5e7eb;" target="_blank">
        Join Video Call
      </a>` : ''}
    </div>
  </div>
</div>`;

    const inviteCardText = `\n\n----------------------------------------\n📅 Google Calendar Invitation\nEvent: ${event.summary}\nWhen: ${fullTimeStr}${meetLink ? `\nMeeting Link: ${meetLink}` : ''}${res.data.htmlLink ? `\nCalendar: ${res.data.htmlLink}` : ''}\n----------------------------------------\n`;

    return NextResponse.json({
      created: true,
      eventId: res.data.id,
      htmlLink: res.data.htmlLink,
      summary: res.data.summary,
      start: res.data.start?.dateTime,
      end: res.data.end?.dateTime,
      meetLink,
      fullTimeStr,
      inviteCardHtml,
      inviteCardText,
    });
  } catch (error: any) {
    console.error('Calendar invite error:', error);
    return NextResponse.json({ 
      created: false, 
      error: error.message || 'Failed to create calendar invite' 
    }, { status: 500 });
  }
}
