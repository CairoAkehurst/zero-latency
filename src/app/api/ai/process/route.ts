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

    // 1. Fetch user custom labels that actually exist in Gmail
    const labelsRes = await gmail.users.labels.list({ userId: 'me' });
    const rawLabels = labelsRes.data.labels || [];
    const userLabels = rawLabels.filter((l: any) => 
      l.type === 'user' && 
      !['CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_SOCIAL', 'CATEGORY_FORUMS'].includes(l.name)
    );

    // If no custom labels exist, we don't apply any arbitrary labels!
    if (userLabels.length === 0) {
      return NextResponse.json({ 
        message: 'No custom labels exist in your sidebar or Gmail. Create a label first to auto-label emails.', 
        count: 0,
        processedCount: 0 
      });
    }

    // 2. Fetch recent inbox messages from Gmail
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 25,
      q: 'in:inbox'
    });

    const messagesList = response.data.messages || [];
    if (messagesList.length === 0) {
      return NextResponse.json({ message: 'No emails in inbox', count: 0, processedCount: 0 });
    }

    // 3. Fetch details for messages
    const emailDetails = await Promise.all(
      messagesList.slice(0, 20).map(async (msg) => {
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
            labelIds: detail.data.labelIds || [],
            snippet: detail.data.snippet,
            ...parsed
          };
        } catch(e) { return null; }
      })
    );
    const validEmails = emailDetails.filter(Boolean) as any[];

    if (validEmails.length === 0) {
      return NextResponse.json({ message: 'No valid emails to process', count: 0, processedCount: 0 });
    }

    // 4. Prompt OpenAI with ONLY the labels that exist in the user's sidebar/Gmail
    const labelOptions = userLabels.map(l => l.name || '').filter(Boolean);

    const prompt = `You are an email categorization assistant.
You can ONLY choose from these exact labels that exist in the user's account:
${labelOptions.map(name => `- "${name}"`).join('\n')}

IMPORTANT RULE:
If an email does NOT clearly fall into one of these specific categories, set "label" to null.
Do NOT invent or use any other labels (do NOT use "Urgent", "Sales leads", "Project updates", etc. unless they are explicitly in the list above).

Emails to classify:
${validEmails.map(e => `[ID: ${e.id}] From: ${e.sender_name || e.sender_email} | Subj: ${e.subject} | Snippet: ${e.snippet}`).join('\n')}

Respond with a JSON object with a single key "classifications" containing an array of objects:
{
  "classifications": [
    {
      "id": "email_id",
      "label": "One of the listed label names exactly, or null",
      "tldr": "One sentence summary of the email"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You categorize emails using ONLY the allowed labels provided, returning strict JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    let classifications: Array<{ id: string; label: string | null; tldr?: string }> = [];
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        classifications = parsed.classifications || parsed.emails || [];
      } catch (err) {
        console.error('Failed to parse OpenAI classification JSON:', err);
      }
    }

    // 5. Apply labels natively in Gmail API and store TLDR summaries
    let appliedCount = 0;
    const labelNameToIdMap = new Map(userLabels.filter(l => l.name && l.id).map(l => [l.name!.toLowerCase(), l.id!]));

    await Promise.all(
      classifications.map(async (c) => {
        if (!c.id) return;

        // Apply label in Gmail if it matches an existing label
        if (c.label && typeof c.label === 'string') {
          const matchedLabelId = labelNameToIdMap.get(c.label.trim().toLowerCase());
          if (matchedLabelId) {
            try {
              await gmail.users.messages.batchModify({
                userId: 'me',
                requestBody: {
                  ids: [c.id],
                  addLabelIds: [matchedLabelId]
                }
              });
              appliedCount++;
            } catch (modifyErr) {
              console.error(`Failed to add label to message ${c.id} in Gmail:`, modifyErr);
            }
          }
        }

        // Store summary in Supabase
        if (c.tldr) {
          try {
            await supabase
              .from('email_ai_metadata')
              .upsert({
                user_id: user.id,
                google_message_id: c.id,
                tldr: c.tldr,
                processed_at: new Date().toISOString()
              }, { onConflict: 'user_id, google_message_id' });
          } catch (metaErr) {
            console.error('Failed to save email TLDR metadata:', metaErr);
          }
        }
      })
    );

    return NextResponse.json({ 
      success: true, 
      processedCount: appliedCount,
      totalClassified: classifications.length,
      availableLabels: labelOptions
    });

  } catch (error: any) {
    console.error('AI Auto-labeling error:', error);
    return NextResponse.json({ error: error.message || 'Auto-labeling failed' }, { status: 500 });
  }
}
