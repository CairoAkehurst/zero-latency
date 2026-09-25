import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

export async function POST() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
  });

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find emails that don't have AI metadata yet
  const { data: processedIds } = await supabase.from('email_ai_metadata').select('email_id');
  const excludeIds = processedIds?.map(p => p.email_id) || [];

  let query = supabase
    .from('emails')
    .select(`
      id,
      subject,
      snippet,
      sender_name,
      sender_email
    `)
    .eq('user_id', user.id)
    .limit(5);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: unprocessedEmails, error: fetchError } = await query;

  if (fetchError || !unprocessedEmails || unprocessedEmails.length === 0) {
    return NextResponse.json({ message: 'No emails to process', count: 0 });
  }

  let processedCount = 0;

  for (const email of unprocessedEmails) {
    try {
      const prompt = `
      Analyze the following email.
      Sender: ${email.sender_name} <${email.sender_email}>
      Subject: ${email.subject}
      Snippet: ${email.snippet}

      Please provide a JSON response with the following structure:
      {
        "category": "Project" | "Leadership" | "Sales" | "Recruiting" | "Meeting" | "Urgent" | "General",
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
      if (!responseText) continue;
      
      const aiResult = JSON.parse(responseText);

      // Find category ID in Supabase based on name
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', `%${aiResult.category}%`)
        .limit(1)
        .single();

      await supabase.from('email_ai_metadata').insert({
        email_id: email.id,
        category_id: category?.id || null, // Might be null if category doesn't exist
        tldr: aiResult.tldr,
        action_required: aiResult.action_required,
        suggested_reply: aiResult.suggested_reply,
        action_payload: aiResult.action_type ? { type: aiResult.action_type } : null
      });

      processedCount++;
    } catch (error) {
      console.error(`Failed to process email ${email.id}:`, error);
    }
  }

  return NextResponse.json({ success: true, processedCount });
}
