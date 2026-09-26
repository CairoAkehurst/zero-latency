import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const { emails } = await request.json();
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ actions: {} });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are Zero, an intelligent email assistant.
Your task is to analyze incoming emails and propose two tailored, distinct reply intents for each email:
1. "primary": The most likely and appropriate response intent.
2. "secondary": A natural alternative response intent (e.g. decline, alternative proposal, question, or acknowledgment).

CRITICAL REQUIREMENTS FOR ACTION BUTTONS:
- Each action MUST have a concise label of EXACTLY 2 TO 3 WORDS (maximum 3 words!).
  Examples of good 2-3 word labels:
  - "Accept Friday meeting"
  - "Propose next week"
  - "Decline with thanks"
  - "Acknowledge system alert"
  - "Confirm invoice paid"
  - "Approve design proposal"
  - "Request updated quote"
  - "Send requested documents"
  - "Investigate server error"
- DO NOT use generic canned phrases like "looks good", "approved", or "acknowledged and thanks" unless specifically relevant.
- NEVER propose meeting acceptances for automated system notifications, build logs, or alerts (e.g. Vercel deployments, CI/CD, password resets). For alerts, use actions like "Acknowledge alert", "Investigate error", or "Mark as resolved".

Return a JSON object where keys are the email IDs:
{
  "actions": {
    "email_id": {
      "primary": { "label": "2-3 Word Description" },
      "secondary": { "label": "2-3 Word Description" }
    }
  }
}`;

    const emailSummaries = emails.slice(0, 15).map((e: any) => ({
      id: e.id,
      from: e.sender_name || e.sender_email || '',
      subject: e.subject || '',
      snippet: (e.snippet || e.summary || '').slice(0, 300)
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate 2-3 word custom action intents for these emails:\n${JSON.stringify(emailSummaries, null, 2)}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 800,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    return NextResponse.json({ actions: parsed.actions || parsed });
  } catch (error: any) {
    console.error("Error in /api/ai/actions:", error);
    return NextResponse.json({ actions: {} }, { status: 500 });
  }
}
