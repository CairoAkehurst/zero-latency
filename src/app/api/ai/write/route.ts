import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const { instruction, tone, toneInstructions, emailContext } = await request.json();
    if (!instruction) return NextResponse.json({ error: 'Missing instruction' }, { status: 400 });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let systemPrompt = "You are Zero, an intelligent email assistant drafting high-quality email replies. Output only the body of the email in clean text. Do not include subject lines or Markdown code blocks.";
    
    if (toneInstructions) {
      systemPrompt += `\n\nUser Communication Persona & Style Guidelines:\n${toneInstructions}`;
    } else if (tone === 'casual') {
      systemPrompt += "\n\nTone: Casual, warm, and approachable. Write naturally like a friendly colleague.";
    } else if (tone === 'concise') {
      systemPrompt += "\n\nTone: Direct, concise, and straight to the point in 1-3 sentences.";
    } else {
      systemPrompt += "\n\nTone: Professional, courteous, and well-structured.";
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    if (emailContext) {
      messages.push({
        role: "user",
        content: `Original Email Context:\n${emailContext}\n\nTask: ${instruction}`
      });
    } else {
      messages.push({ role: "user", content: instruction });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    return NextResponse.json({ text: completion.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
