import { NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/server/gmail';
import OpenAI from 'openai';

export async function GET() {
  try {
    const { gmail } = await getGmailClient();
    const response = await gmail.users.labels.list({ userId: 'me' });
    return NextResponse.json({ labels: response.data.labels || [] });
  } catch (error: any) {
    console.error('Labels GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to list labels' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, instruction } = await request.json();
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return NextResponse.json({ error: 'Label name is required' }, { status: 400 });
    }

    const { gmail } = await getGmailClient();

    // Allowed Gmail API label colors
    const GMAIL_PALETTE = [
      { backgroundColor: '#4a86e8', textColor: '#ffffff' }, // Blue
      { backgroundColor: '#a479e2', textColor: '#ffffff' }, // Purple
      { backgroundColor: '#16a766', textColor: '#ffffff' }, // Green
      { backgroundColor: '#ffad47', textColor: '#ffffff' }, // Orange
      { backgroundColor: '#f691b3', textColor: '#ffffff' }, // Pink
      { backgroundColor: '#fb4c2f', textColor: '#ffffff' }, // Red
      { backgroundColor: '#fad165', textColor: '#ffffff' }, // Yellow
      { backgroundColor: '#43d692', textColor: '#ffffff' }, // Teal / Mint
      { backgroundColor: '#b9e4d0', textColor: '#ffffff' }, // Soft green
      { backgroundColor: '#f6c5be', textColor: '#ffffff' }, // Coral
      { backgroundColor: '#c6f3de', textColor: '#ffffff' }, // Light mint
      { backgroundColor: '#ffe6c7', textColor: '#ffffff' }, // Light peach
      { backgroundColor: '#fef1d1', textColor: '#ffffff' }, // Light yellow
    ];

    // 1. Check if label already exists to avoid 409 conflict
    const listRes = await gmail.users.labels.list({ userId: 'me' });
    const allLabels = listRes.data.labels || [];
    const existing = allLabels.find(
      (l) => (l.name || '').toLowerCase() === trimmedName.toLowerCase()
    );

    let createdLabel = existing;

    if (!existing) {
      // Find colors that haven't been used yet, or rotate from the beginning
      const usedBgColors = new Set(
        allLabels
          .filter((l: any) => l.type === 'user' && l.color?.backgroundColor)
          .map((l: any) => l.color.backgroundColor.toLowerCase())
      );

      let chosenColor = GMAIL_PALETTE.find(
        (c) => !usedBgColors.has(c.backgroundColor.toLowerCase())
      );

      // If all colors have been used, pick in rotational order based on count of existing user labels
      if (!chosenColor) {
        const userLabelCount = allLabels.filter((l: any) => l.type === 'user').length;
        chosenColor = GMAIL_PALETTE[userLabelCount % GMAIL_PALETTE.length];
      }

      const createRes = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: trimmedName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
          color: chosenColor
        }
      });
      createdLabel = createRes.data;
    }

    if (!createdLabel || !createdLabel.id) {
      return NextResponse.json({ error: 'Failed to create or find label in Gmail' }, { status: 500 });
    }

    // 2. If an instruction or prompt is given, auto-label matching past emails
    if (instruction && instruction.trim() && process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const msgsRes = await gmail.users.messages.list({ userId: 'me', maxResults: 50, q: 'in:inbox' });
        const messageSummaries = msgsRes.data.messages || [];

        if (messageSummaries.length > 0) {
          const emailDetails = await Promise.all(
            messageSummaries.slice(0, 30).map(async (m) => {
              try {
                const detail = await gmail.users.messages.get({
                  userId: 'me',
                  id: m.id!,
                  format: 'metadata',
                  metadataHeaders: ['Subject', 'From']
                });
                const subject = detail.data.payload?.headers?.find((h) => h.name?.toLowerCase() === 'subject')?.value || '';
                const from = detail.data.payload?.headers?.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
                return { id: m.id!, subject, from, snippet: detail.data.snippet || '' };
              } catch (e) {
                return null;
              }
            })
          );

          const validDetails = emailDetails.filter(Boolean);
          const prompt = `You are an email categorization assistant.
Label to apply: "${trimmedName}"
Condition / description: "${instruction.trim()}"

Emails to inspect:
${validDetails.map((e) => `[ID: ${e!.id}] From: ${e!.from} | Subj: ${e!.subject} | Snippet: ${e!.snippet}`).join('\n')}

Return a JSON object with a single key "ids" containing an array of message IDs that should have this label applied according to the description. If none match, return an empty array [].`;

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
          });

          const resContent = completion.choices[0]?.message?.content;
          if (resContent) {
            const parsed = JSON.parse(resContent);
            const matchedIds: string[] = Array.isArray(parsed) ? parsed : (parsed.ids || parsed.matchedIds || []);
            if (matchedIds.length > 0) {
              await gmail.users.messages.batchModify({
                userId: 'me',
                requestBody: {
                  ids: matchedIds,
                  addLabelIds: [createdLabel.id]
                }
              });
            }
          }
        }
      } catch (aiErr) {
        console.error('Auto-label background application error:', aiErr);
      }
    }

    return NextResponse.json({ success: true, label: createdLabel });
  } catch (error: any) {
    console.error('Labels POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create label' }, { status: 500 });
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
    
    return NextResponse.json({ success: true, label: response.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update label' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'No label id provided' }, { status: 400 });
    }
    
    const { gmail } = await getGmailClient();
    await gmail.users.labels.delete({
      userId: 'me',
      id
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Labels DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete label in Gmail' }, { status: 500 });
  }
}
