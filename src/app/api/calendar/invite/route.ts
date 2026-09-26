import { NextResponse } from 'next/server';
import { getCalendarClient } from '@/lib/server/gmail';
import OpenAI from 'openai';
import { createHash } from 'node:crypto';
import type { calendar_v3 } from 'googleapis';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]!));

function googleEventId(value: string) {
  const bytes = createHash('sha256').update(value).digest();
  const alphabet = '0123456789abcdefghijklmnopqrstuv';
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let encoded = '';
  for (let i = 0; i < bits.length; i += 5) {
    encoded += alphabet[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  }
  return encoded;
}

export async function POST(request: Request) {
  try {
    const { 
      emailSubject, 
      emailBody, 
      recipientEmail, 
      recipientName, 
      replyText,
      dedupeKey,
    } = await request.json();

    if (!recipientEmail) {
      return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 });
    }
    const attendeeEmail = String(recipientEmail).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    if (!attendeeEmail) {
      return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const now = new Date();
    const isoNow = now.toISOString();

    const systemPrompt = `You are an intelligent calendar assistant for Zero Latency.
Analyze the email to detect if a meeting, call, appointment, or calendar event is being scheduled, accepted, confirmed, or agreed upon.
Current date/time (ISO): ${isoNow}.

Trigger shouldCreateInvite=true when a participant clearly agrees to a meeting time, or when the reply being sent explicitly asks to arrange/propose a meeting at a specific time. Examples: "Friday at 2pm works", "confirmed", "see you then", "let's meet Tuesday at 3", or a reply that accepts a proposed time.
An unaccepted proposal in the received email, a question about availability, or a tentative suggestion is NOT agreement and must not create an event. User-authored reply text may create an invite for an explicit scheduling request; email/thread content alone needs clear agreement.

Do NOT trigger if: declining, cancelling, or no specific time is mentioned.

Extract:
1. "shouldCreateInvite": true/false
2. "summary": Concise event title (e.g. "Catch-up: Cairo & Sarah", "Project Sync")
3. "description": Brief agenda from the email
4. "startTime": ISO 8601 (resolve relative times like "tomorrow 4pm", "Friday 10am" using current ISO: ${isoNow})
5. "endTime": ISO 8601 (default 30-60 min after start if not specified)
6. "location": location or "Google Meet" if virtual

If no meeting: { "shouldCreateInvite": false }`;

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
      location: parsed.location || undefined,
      start: {
        dateTime: startDt.toISOString(),
      },
      end: {
        dateTime: endDt.toISOString(),
      },
      attendees: [{ email: attendeeEmail, displayName: recipientName || undefined }],
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

    // Google event IDs make thread-level retries safe when an email is reopened or
    // the send flow retries after the calendar insert succeeded.
    const eventId = googleEventId(`${dedupeKey || `${emailSubject || ''}:${emailBody || ''}:${replyText || ''}`}|${startDt.toISOString()}|${attendeeEmail.toLowerCase()}`);
    let eventData: calendar_v3.Schema$Event;
    try {
      const result = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: { ...event, id: eventId },
        sendUpdates: 'all',
        conferenceDataVersion: 1,
      });
      eventData = result.data;
    } catch (insertError: unknown) {
      if (Number((insertError as { code?: number })?.code) !== 409) throw insertError;
      const existing = await calendar.events.get({ calendarId: 'primary', eventId });
      eventData = existing.data;
    }

    const meetLink = eventData.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri || eventData.htmlLink || '';

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
    <h3 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 700; color: #111827;">${escapeHtml(event.summary)}</h3>
    <div style="font-size: 14px; color: #4b5563; margin-bottom: 6px;">
      <strong>When:</strong> ${fullTimeStr}
    </div>
    ${meetLink ? `
    <div style="font-size: 14px; color: #4b5563; margin-bottom: 16px;">
      <strong>Where:</strong> <a href="${meetLink}" style="color: #2563eb; text-decoration: underline;" target="_blank">Join with Google Meet</a>
    </div>` : ''}
    <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #f3f4f6; display: flex; gap: 10px;">
      ${eventData.htmlLink ? `
      <a href="${eventData.htmlLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 6px;" target="_blank">
        View on Google Calendar
      </a>` : ''}
      ${meetLink ? `
      <a href="${meetLink}" style="display: inline-block; background-color: #f3f4f6; color: #1f2937; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 6px; border: 1px solid #e5e7eb;" target="_blank">
        Join Video Call
      </a>` : ''}
    </div>
  </div>
</div>`;

    const inviteCardText = `\n\n----------------------------------------\n📅 Google Calendar Invitation\nEvent: ${event.summary}\nWhen: ${fullTimeStr}${meetLink ? `\nMeeting Link: ${meetLink}` : ''}${eventData.htmlLink ? `\nCalendar: ${eventData.htmlLink}` : ''}\n----------------------------------------\n`;

    return NextResponse.json({
      created: true,
      eventId: eventData.id,
      htmlLink: eventData.htmlLink,
      summary: eventData.summary,
      start: eventData.start?.dateTime,
      end: eventData.end?.dateTime,
      meetLink,
      fullTimeStr,
      inviteCardHtml,
      inviteCardText,
    });
  } catch (error: unknown) {
    console.error('Calendar invite error:', error);
    return NextResponse.json({ 
      created: false, 
      error: error instanceof Error ? error.message : 'Failed to create calendar invite'
    }, { status: 500 });
  }
}
