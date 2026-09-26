import { NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/server/gmail';
import OpenAI from 'openai';

export async function GET() {
  try {
    const { gmail } = await getGmailClient();
    const response = await gmail.users.labels.list({ userId: 'me' });
    return NextResponse.json({ labels: response.data.labels });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const { gmail } = await getGmailClient();
    const response = await gmail.users.labels.create({
      userId: 'me',
      requestBody: { name }
    });
    
    // Auto-label past emails
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const msgs = await gmail.users.messages.list({ userId: 'me', maxResults: 100 });
      if (msgs.data.messages) {
        const emailDetails = await Promise.all(msgs.data.messages.slice(0, 30).map(async m => {
          const detail = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'metadata', metadataHeaders: ['Subject', 'From'] });
          const subject = detail.data.payload?.headers?.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
          const from = detail.data.payload?.headers?.find(h => h.name?.toLowerCase() === 'from')?.value || '';
          return { id: m.id!, subject, from, snippet: detail.data.snippet };
        }));
        
        const prompt = `Which of these emails belongs in the label/category "${name}"?
        Emails:
        ${emailDetails.map(e => `[ID: ${e.id}] From: ${e.from} | Subj: ${e.subject} | Snippet: ${e.snippet}`).join('\n')}
        
        Respond with a JSON object with a single key "ids" mapping to an array of string IDs that match this category.
        Example: ["id1", "id2"]`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        
        const resText = completion.choices[0].message.content;
        let matchedIds: string[] = [];
        try {
          const obj = JSON.parse(resText || "{}");
          // Handle { "ids": [...] } or direct array if somehow possible
          matchedIds = Array.isArray(obj) ? obj : (obj.ids || obj.matchedIds || obj[Object.keys(obj)[0]] || []);
        } catch (e) {}

        if (Array.isArray(matchedIds) && matchedIds.length > 0) {
          await gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: { ids: matchedIds, addLabelIds: [response.data.id!] }
          });
        }
      }
    } catch (e) {
      console.error("Auto-labeling failed", e);
    }

    return NextResponse.json({ label: response.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name } = await request.json();
    if (!id || !name) return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });

    const { gmail } = await getGmailClient();
    const response = await gmail.users.labels.patch({
      userId: 'me',
      id,
      requestBody: { name }
    });
    
    return NextResponse.json({ label: response.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'No id provided' }, { status: 400 });
    
    const { gmail } = await getGmailClient();
    await gmail.users.labels.delete({
      userId: 'me',
      id
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
