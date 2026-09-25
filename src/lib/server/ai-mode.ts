import 'server-only';
import { env } from './env';

/** Demo mailbox without an OpenAI key uses canned responses; everything else calls OpenAI. */
export function isDemoAI(): boolean {
  const e = env();
  return e.demo && !e.openaiApiKey;
}
