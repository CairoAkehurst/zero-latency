import 'server-only';
import { z } from 'zod';
import OpenAI from 'openai';
import { env } from './env';

export class AIError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Reasoning models (gpt-5 family, o-series) spend part of max_completion_tokens thinking. For short email tasks a
 * low effort keeps answers fast and stops long threads from being cut off. OPENAI_REASONING_EFFORT overrides it
 * ("none" | "minimal" | "low" | "medium" | "high"); set it to "off" to never send the parameter.
 */
export function reasoningEffortFor(model: string, override?: string | null): string | null {
  const o = override?.trim().toLowerCase();
  if (o === 'off') return null;
  const reasoning = /^(gpt-5|o\d)/i.test(model) && !/-chat/i.test(model);
  if (!reasoning) return null;
  return o || 'low';
}

/**
 * Calls Chat Completions (official `openai` SDK) with a strict JSON schema and validates the result with zod.
 * Uses only parameters that every current chat model accepts (no temperature / max_tokens),
 * so OPENAI_MODEL can point at a reasoning or non-reasoning model.
 */
export async function chatJson<T>(opts: {
  messages: ChatMessage[];
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  validator: z.ZodType<T>;
  maxTokens?: number;
  fetchImpl?: typeof fetch;
}): Promise<T> {
  const { openaiApiKey, openaiModel } = env();
  if (!openaiApiKey) throw new AIError('AI is not configured: set OPENAI_API_KEY on the server.', 503);
  // Retries are handled below so rate limits and the reasoning_effort fallback behave the same everywhere.
  const client = new OpenAI({ apiKey: openaiApiKey, maxRetries: 0, timeout: 90_000, ...(opts.fetchImpl ? { fetch: opts.fetchImpl } : {}) });
  let effort = reasoningEffortFor(openaiModel, process.env.OPENAI_REASONING_EFFORT);
  let lastErr: AIError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: openaiModel,
        messages: opts.messages,
        response_format: { type: 'json_schema', json_schema: { name: opts.schemaName, strict: true, schema: opts.jsonSchema } },
        max_completion_tokens: opts.maxTokens ?? 4000,
        ...(effort ? { reasoning_effort: effort as OpenAI.ReasoningEffort } : {}),
      });
    } catch (e) {
      if (!(e instanceof OpenAI.APIError) || e.status === undefined) {
        lastErr = new AIError(`Could not reach OpenAI: ${(e as Error).message}`, 502);
        continue;
      }
      const status = e.status;
      const message = (e.error as { message?: string } | undefined)?.message ?? e.message;
      if (status === 429 || status >= 500) {
        lastErr = new AIError(message ?? `OpenAI is busy (${status}). Try again.`, status === 429 ? 429 : 502);
        if (e.code === 'insufficient_quota') break;
        await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
        continue;
      }
      if (status === 400 && effort && /reasoning_effort/i.test(message ?? '')) {
        // The configured model does not take this parameter (or this value): retry once without it.
        effort = null;
        attempt--;
        continue;
      }
      throw new AIError(status === 401 ? 'OpenAI rejected the API key. Check OPENAI_API_KEY.' : message || `OpenAI error ${status}`, status === 401 ? 503 : 502);
    }
    const choice = completion.choices?.[0];
    if (choice?.message?.refusal) throw new AIError(`The model declined: ${choice.message.refusal}`, 422);
    const content = choice?.message?.content;
    if (!content) {
      throw new AIError(choice?.finish_reason === 'length' ? 'The AI response was cut off. Try a shorter request.' : 'The AI returned an empty response.', 502);
    }
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch { throw new AIError('The AI returned malformed JSON.', 502); }
    const v = opts.validator.safeParse(parsed);
    if (!v.success) throw new AIError('The AI response did not match the expected shape.', 502);
    return v.data;
  }
  throw lastErr ?? new AIError('OpenAI request failed.', 502);
}
