import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const { instruction } = await request.json();
    if (!instruction) return NextResponse.json({ error: 'Missing instruction' }, { status: 400 });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an AI assistant writing emails. Provide only the body of the email in plain text or simple HTML. No subject lines. Keep it professional and concise." },
        { role: "user", content: instruction }
      ],
    });

    return NextResponse.json({ text: completion.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
