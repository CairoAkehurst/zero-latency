import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const { instruction, tone, toneInstructions, emailContext } = await request.json();
    if (!instruction) return NextResponse.json({ error: 'Missing instruction' }, { status: 400 });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let systemPrompt = `You are Zero, an intelligent email assistant drafting high-quality, fully fledged email replies.
Output only the body of the email in clean, well-spaced text.
Do not output subject lines, "Subject:", or Markdown code blocks.

CRITICAL INSTRUCTIONS FOR REPLY DRAFTING:
1. MATCH LENGTH & PROPORTION:
   - If the incoming email is detailed, thorough, or long, craft a well-developed, decently lengthened reply that addresses its key points thoroughly.
   - If the email is brief or transactional, keep the response proportionate and focused.
2. MATCH SENDER'S TONE & USER'S PREFERRED PERSONA:
   - Match the relationship tone reflected by the sender while strictly adhering to the user's communication style guidelines.
   - Use natural greetings and sign-offs fitting the context.`;

    if (toneInstructions) {
      systemPrompt += `\n\nUser Communication Persona & Style Guidelines:\n${toneInstructions}`;
    } else if (tone === 'casual') {
      systemPrompt += "\n\nTone: Casual, warm, and approachable. Write naturally like a friendly colleague or teammate.";
    } else if (tone === 'concise') {
      systemPrompt += "\n\nTone: Direct, concise, and straight to the point in 1-3 sentences.";
    } else {
      systemPrompt += "\n\nTone: Professional, courteous, articulate, and well-structured.";
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    if (emailContext) {
      messages.push({
        role: "user",
        content: `Original Email Context:\n${emailContext}\n\nTask / Reply Intent:\n${instruction}\n\nWrite a complete, fully fledged response corresponding to this intent.`
      });
    } else {
      messages.push({ role: "user", content: instruction });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 900,
    });

    return NextResponse.json({ text: completion.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
