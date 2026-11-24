import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AI_PROVIDERS, aiComplete, isAiProvider } from '@/lib/server/ai';

function mask(key: string) {
  return key.length > 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : '••••';
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('users')
    .select('ai_provider, ai_api_key, ai_model')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({
    provider: isAiProvider(data?.ai_provider) ? data!.ai_provider : 'openai',
    model: data?.ai_model || '',
    hasKey: Boolean(data?.ai_api_key),
    maskedKey: data?.ai_api_key ? mask(data.ai_api_key) : '',
    defaults: Object.fromEntries(Object.entries(AI_PROVIDERS).map(([k, v]) => [k, v.defaultModel])),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { provider, apiKey, model, test } = body;
  if (!isAiProvider(provider)) return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });

  const cleanModel = typeof model === 'string' ? model.trim() : '';
  const newKey = typeof apiKey === 'string' ? apiKey.trim() : '';

  let key = newKey;
  if (!key) {
    // Keep the existing key (e.g. only switching model/provider)
    const { data } = await supabase.from('users').select('ai_api_key').eq('id', user.id).maybeSingle();
    key = data?.ai_api_key || '';
  }
  if (!key) return NextResponse.json({ error: 'Enter an API key' }, { status: 400 });

  if (test) {
    try {
      await aiComplete(
        { messages: [{ role: 'user', content: 'Reply with the word OK.' }], maxTokens: 16 },
        { provider, apiKey: key, model: cleanModel || AI_PROVIDERS[provider].defaultModel },
      );
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Key test failed' }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from('users')
    .update({ ai_provider: provider, ai_api_key: key, ai_model: cleanModel || null })
    .eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, maskedKey: mask(key) });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('users')
    .update({ ai_provider: null, ai_api_key: null, ai_model: null })
    .eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
