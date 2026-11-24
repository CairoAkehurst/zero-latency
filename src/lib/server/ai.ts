import { createClient } from '@/utils/supabase/server';

export type AiProvider = 'openai' | 'anthropic' | 'google';

export const AI_PROVIDERS: Record<AiProvider, { label: string; defaultModel: string }> = {
  openai: { label: 'OpenAI', defaultModel: 'gpt-4o-mini' },
  anthropic: { label: 'Anthropic', defaultModel: 'claude-haiku-5-5' },
  google: { label: 'Google (Gemini)', defaultModel: 'gemini-2.5-flash' },
};

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super('No AI API key configured. Add one in Settings → AI.');
    this.name = 'AiNotConfiguredError';
  }
}

export function isAiProvider(v: unknown): v is AiProvider {
  return v === 'openai' || v === 'anthropic' || v === 'google';
}

/** Load the signed-in user's AI settings, falling back to the OPENAI_API_KEY env var. */
export async function getAiConfig(): Promise<AiConfig | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('ai_provider, ai_api_key, ai_model')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.ai_api_key && isAiProvider(data.ai_provider)) {
        return {
          provider: data.ai_provider,
          apiKey: data.ai_api_key,
          model: data.ai_model || AI_PROVIDERS[data.ai_provider].defaultModel,
        };
      }
    }
  } catch (e) {
    console.error('Failed to load AI config:', e);
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: AI_PROVIDERS.openai.defaultModel };
  }
  return null;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiRequest {
  messages: AiMessage[];
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const j = JSON.parse(text);
    return j?.error?.message || j?.message || text || res.statusText;
  } catch {
    return text || res.statusText;
  }
}

/** Strip markdown fences some models wrap around JSON output. */
function cleanJson(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (m ? m[1] : t).trim();
}

export async function aiComplete(req: AiRequest, config?: AiConfig | null): Promise<string> {
  const cfg = config ?? (await getAiConfig());
  if (!cfg) throw new AiNotConfiguredError();

  const system = req.messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const convo = req.messages.filter(m => m.role !== 'system');
  const maxTokens = req.maxTokens ?? 1024;
  let text = '';

  if (cfg.provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages: req.messages,
        ...(req.json ? { response_format: { type: 'json_object' } } : {}),
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${await readError(res)}`);
    const data = await res.json();
    text = data.choices?.[0]?.message?.content || '';
  } else if (cfg.provider === 'anthropic') {
    const sys = req.json ? `${system}\n\nRespond with a single valid JSON object only, no prose or markdown.`.trim() : system;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: maxTokens,
        ...(sys ? { system: sys } : {}),
        ...(req.temperature !== undefined ? { temperature: Math.min(req.temperature, 1) } : {}),
        messages: convo.map(m => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error: ${await readError(res)}`);
    const data = await res.json();
    text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  } else {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents: convo.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            maxOutputTokens: maxTokens,
            ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
            ...(req.json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`Google error: ${await readError(res)}`);
    const data = await res.json();
    text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
  }

  return req.json ? cleanJson(text) : text;
}

/** Run a request and parse the result as JSON. */
export async function aiCompleteJson<T = any>(req: Omit<AiRequest, 'json'>, config?: AiConfig | null): Promise<T> {
  const text = await aiComplete({ ...req, json: true }, config);
  return JSON.parse(text || '{}') as T;
}
