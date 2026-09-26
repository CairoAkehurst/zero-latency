import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { getGmailClient, extractEmailDetails } from '@/lib/server/gmail';

export async function POST() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
  });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { gmail } = await getGmailClient();

    // 1. Fetch recent messages from Gmail
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      q: 'in:inbox'
    });

    const messagesList = response.data.messages || [];
    if (messagesList.length === 0) {
      return NextResponse.json({ message: 'No emails to process', count: 0 });
    }

    // 2. Fetch those that have already been processed
    const messageIds = messagesList.map(m => m.id!).filter(Boolean);
    const { data: existingMeta } = await supabase
      .from('email_ai_metadata')
      .select('google_message_id')
      .in('google_message_id', messageIds)
      .eq('user_id', user.id)
      .not('category_id', 'is', null);

    const processedIds = existingMeta?.map(m => m.google_message_id) || [];
    const unprocessedList = messagesList.filter(m => !processedIds.includes(m.id!)).slice(0, 10); // cap at 10

    if (unprocessedList.length === 0) {
      return NextResponse.json({ message: 'No emails to process', count: 0 });
    }

    // 3. Fetch details for unprocessed emails
    const unprocessedEmails = await Promise.all(
      unprocessedList.map(async (msg) => {
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full'
          });
          const parsed = extractEmailDetails(detail.data.payload);
          return {
            id: msg.id!,
            google_message_id: msg.id!,
            snippet: detail.data.snippet,
            ...parsed
          };
        } catch(e) { return null; }
      })
    );
    const validUnprocessed = unprocessedEmails.filter(Boolean) as any[];

    if (validUnprocessed.length === 0) {
      return NextResponse.json({ message: 'No valid unprocessed emails', count: 0 });
    }

    // 4. Fetch available categories dynamically
    const { data: dbCategories } = await supabase.from('categories').select('id, name');
    const availableCategories = dbCategories || [];
    const categoryNames = availableCategories.map(c => c.name);
    const categoryPromptOptions = categoryNames.length > 0 
      ? categoryNames.map(name => `"${name}"`).join(" | ") 
      : '"General"';

    let processedCount = 0;
    const errors: string[] = [];

    const promises = validUnprocessed.map(async (email) => {
      try {
        const prompt = `
        Analyze the following email.
        Sender: ${email.senderName} <${email.senderEmail}>
        Subject: ${email.subject}
        Snippet: ${email.snippet}

        Please provide a JSON response with the following structure:
        {
          "category": ${categoryPromptOptions},
          "tldr": "A 1-sentence summary of the email",
          "action_required": boolean,
          "suggested_reply": "A short suggested reply if applicable, otherwise null",
          "action_type": "calendar" | "reply" | null
        }
        `;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an AI assistant that categorizes and summarizes emails into JSON." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
        });

        const responseText = completion.choices[0].message.content;
        if (!responseText) return;
        
        const aiResult = JSON.parse(responseText);

        const matchedCategory = availableCategories.find(c => 
          c.name.toLowerCase() === aiResult.category?.toLowerCase()
        );

        const payload = {
          user_id: user.id,
          google_message_id: email.id,
          category_id: matchedCategory?.id || null,
          tldr: aiResult.tldr,
          action_required: aiResult.action_required,
          suggested_reply: aiResult.suggested_reply,
          action_payload: aiResult.action_type ? { type: aiResult.action_type } : null,
          processed_at: new Date().toISOString()
        };

        const { error: upsertError } = await supabase
          .from('email_ai_metadata')
          .upsert(payload, { onConflict: 'user_id, google_message_id' });
          
        if (upsertError) errors.push(`Upsert err on ${email.id}: ${upsertError.message}`);

        processedCount++;
      } catch (error: any) {
        errors.push(`Process err on ${email.id}: ${error?.message || String(error)}`);
      }
    });

    await Promise.all(promises);

    if (errors.length > 0) {
      return NextResponse.json({ success: processedCount > 0, processedCount, error: errors.join(" | ") }, { status: 400 });
    }

    return NextResponse.json({ success: true, processedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
