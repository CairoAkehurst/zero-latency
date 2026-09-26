import { NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/server/gmail';

export async function GET() {
  try {
    const { gmail } = await getGmailClient();
    const response = await gmail.users.labels.list({ userId: 'me' });
    return NextResponse.json({ labels: response.data.labels || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, labelListVisibility, messageListVisibility, color } = await request.json();
    const { gmail } = await getGmailClient();
    
    const payload: any = {
      name,
      labelListVisibility: labelListVisibility || 'labelShow',
      messageListVisibility: messageListVisibility || 'show'
    };

    if (color) {
      payload.color = color;
    }

    const response = await gmail.users.labels.create({
      userId: 'me',
      requestBody: payload
    });

    return NextResponse.json({ label: response.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
