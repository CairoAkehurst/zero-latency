import 'server-only';

export interface ServerEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleClientId: string;
  googleClientSecret: string;
  openaiApiKey: string | null;
  openaiModel: string;
  appUrl: string | null;
  demo: boolean;
}

let cached: ServerEnv | null = null;

export class ConfigError extends Error {}

export interface ConfigProblem {
  name: string;
  message: string;
}

/** `next dev` only. Production (Vercel, `next start`) and tests never use the local fallbacks below. */
function isLocalDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

const has = (k: string) => Boolean(process.env[k]?.trim());

function hasBackend(): boolean {
  return has('NEXT_PUBLIC_SUPABASE_URL') && has('NEXT_PUBLIC_SUPABASE_ANON_KEY') && has('GOOGLE_CLIENT_ID') && has('GOOGLE_CLIENT_SECRET');
}

/**
 * ZL_DEMO=1 forces the sample mailbox. In local development it is also used automatically while the Supabase or
 * Google settings are missing (ZL_DEMO=0 turns that off), so the app runs with no setup at all.
 */
function isDemo(): boolean {
  const v = process.env.ZL_DEMO?.trim().toLowerCase();
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return isLocalDev() && !hasBackend();
}

const REQUIRED = [
  // Supabase: sign-in (Google provider) and the users / user_prefs tables.
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  // The same Google OAuth client configured in Supabase → Auth → Providers → Google. Used to refresh Gmail tokens.
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const;

/** Lists missing settings without throwing, so pages can show setup instructions instead of crashing. */
export function configProblems(): ConfigProblem[] {
  if (isDemo()) return [];
  // Empty values (e.g. a copied .env.example) count as unset.
  return REQUIRED.filter((k) => !has(k)).map((name) => ({ name, message: 'is not set' }));
}

/** Reads and validates server configuration. Throws ConfigError with a readable message when something is missing. */
export function env(): ServerEnv {
  if (cached) return cached;
  const problems = configProblems();
  if (problems.length) throw new ConfigError(problems.map((p) => `${p.name} ${p.message}.`).join(' '));
  const demo = isDemo();
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || null;
  const openaiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-5-mini';
  if (isLocalDev()) {
    const mail = demo ? 'sample mailbox (add the Supabase and Google settings to .env.local for real Gmail)' : 'Gmail via Supabase sign-in';
    const ai = openaiApiKey ? `OpenAI (${openaiModel})` : demo ? 'canned demo text (set OPENAI_API_KEY for real AI)' : 'off (set OPENAI_API_KEY)';
    console.info(`[zerolatency] mail: ${mail} · AI: ${ai}`);
  }
  cached = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '',
    googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '',
    openaiApiKey,
    openaiModel,
    appUrl: process.env.APP_URL?.replace(/\/+$/, '') || null,
    demo,
  };
  return cached;
}

/** For tests. */
export function resetEnvCache() {
  cached = null;
}
