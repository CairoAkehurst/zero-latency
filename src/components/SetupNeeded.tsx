import type { ConfigProblem } from '@/lib/server/env';
import { Mark } from './icons';

const TEMPLATE = `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
OPENAI_API_KEY=sk-...`;

/** Shown instead of the app when required server settings are missing. Names the settings only, never their values. */
export function SetupNeeded({ problems }: { problems: ConfigProblem[] }) {
  return (
    <main className="zl-center-page">
      <div className="zl-auth-card zl-setup-card">
        <div style={{ display: 'flex', justifyContent: 'center' }}><Mark size={44} /></div>
        <h1>Finish setting up ZeroLatency</h1>
        <p>The server is missing some settings, so it can&apos;t connect to Supabase and Google yet.</p>
        <ul className="zl-setup-list">
          {problems.map((p) => <li key={p.name}><code>{p.name}</code> {p.message}</li>)}
        </ul>
        <p>Add these environment variables. On Vercel: <strong>Project → Settings → Environment Variables</strong>, then redeploy. Running locally: put them in <code>.env.local</code> next to <code>package.json</code> and restart the server.</p>
        <pre className="zl-setup-code">{TEMPLATE}</pre>
        <p>The Google client must be the same one configured in <strong>Supabase → Authentication → Providers → Google</strong>. Setup steps are in <code>README.md</code>.</p>
      </div>
    </main>
  );
}
