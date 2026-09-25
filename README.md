# ZeroLatency Mail (XavierV2)

An email client for Gmail and Google Workspace: the ZeroLatency-Claude app, running on this repo's stack.

| Piece | Used for |
|---|---|
| **Supabase Auth** (Google provider, `@supabase/ssr`) | Sign-in and the session cookie (`src/proxy.ts` keeps it fresh) |
| **Supabase Postgres** | `public.users` (Google tokens), `public.user_prefs` (views, settings, snippets…) |
| **googleapis** | OAuth2 client that calls Gmail / Calendar and refreshes the access token |
| **openai** SDK | All AI features (structured JSON output) |
| ZeroLatency design system CSS (+ Tailwind utilities, no preflight) | UI |

## Features

| Area | What works |
|---|---|
| Accounts | Google sign-in through Supabase Auth, two-way Gmail sync (every change is a Gmail API call) |
| Inbox organisation | Custom views = saved Gmail queries, auto-generated default views (onboarding), templates, suggested views from frequent senders and domains, filters (mailbox, read state, attachment, calendar invite, starred, important, label, from/to/cc/bcc, subject, date, Gmail category, raw Gmail search), group by (date, starred, important, sender, domain, keywords, label, unread, custom property), per-view icons and colours, reorder by drag, rename, duplicate, delete |
| Properties | Show/hide/reorder From, Subject, Preview, Label, Date, Files; custom Text, Number, Select, Multi-select, Status, Date, Checkbox, URL properties per view, editable from the thread |
| AI (OpenAI) | Auto labels from a plain-language description (applied as real Gmail labels, optionally moved out of the inbox), “Auto label similar”, Write with AI (space on an empty line, or the AI button), draft a reply in your own tone (few-shot from your sent mail), thread summaries with action items |
| Composer | Rich editor with Markdown shortcuts (`-`, `1.`, `#`, `>`, triple backtick, `---`) and `/` commands, recipient chips with autocomplete, Cc/Bcc, attachments (picker, drag and drop, paste), forward with original attachments, reply/reply all with quoted history, Gmail signature, autosaved Gmail drafts, Send and archive, ⌘/Ctrl+Enter |
| Snippets | Reusable text with an `{{availability}}` token |
| Scheduling | `/schedule` → week grid showing your Google Calendar busy times; pick slots to insert as a list |
| Thread actions | Archive, trash/restore, read/unread, star, label (create inline), remind me (Later today, Tomorrow, Weekend, Next week, custom), spam/not spam, unsubscribe link, open in Gmail, bulk actions, customisable hover actions, undo |
| Reading | Side peek, centre peek or full page; sandboxed HTML email (no scripts or forms) with inline images; quoted text collapsed; attachments download |
| Keyboard | Gmail-style single keys, `g` jumps, `1–9` views, ⌘/Ctrl+K command palette, Ctrl+F filter, Ctrl+E edit view, `?` list |
| Settings | Theme (system/light/dark), thread style, auto-advance, font size, AI and auto labels, Gmail filters (list/create/delete), snippets, signature options, desktop notifications per view, accounts |

Views, properties, snippets, reminders and settings are saved to Supabase (`public.user_prefs`) so they follow you across browsers, with `localStorage` as a cache. Labels, filters, drafts and mail live in Gmail.

## Run it locally

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local, then fill it in
npm run dev                  # http://localhost:3000
```

Without the Supabase/Google settings, `npm run dev` opens a built-in sample mailbox (`npm run dev:demo` forces it). Production never does this: it shows a setup page listing what is missing.

## One-time setup

1. **Database.** In Supabase → SQL Editor, run `supabase_schema.sql`. It is safe to re-run; the end of the file adds `google_token_expires_at` / `google_scopes` to `users` and the `user_prefs` table.
2. **Google Cloud** (the OAuth client whose ID/secret are in `.env.local`):
   - Enable the **Gmail API** and **Google Calendar API**.
   - OAuth consent screen: add the scopes `gmail.modify`, `gmail.settings.basic`, `calendar.freebusy`. While in Testing, add your account under Test users.
   - Credentials → the OAuth client → Authorised redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`.
3. **Supabase → Authentication → Providers → Google:** enabled, with the same client ID and secret.
4. **Supabase → Authentication → URL Configuration:** add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback` to Redirect URLs.

Google only sends a refresh token on the consent screen, which ZeroLatency always shows at sign-in, so Gmail keeps working after the first hour.

## Deploy (Vercel)

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL` (optional) and `APP_URL=https://<your-domain>`. Do not set `ZL_DEMO`. Redeploy after changing variables. Vercel limits request bodies to 4.5 MB, so larger attachments fail there.

## Checks

```bash
npm run check     # typecheck, lint, unit tests
npm run build
```

## Security notes

- Supabase holds the session; Google tokens are in `public.users`, readable only by their owner (RLS).
- State-changing API routes reject cross-site requests (Origin check), and every request body is validated with zod.
- HTML email renders in a sandboxed iframe with no scripts, forms or same-window navigation, and a restrictive CSP.
- Email content sent to OpenAI is fenced as untrusted data. AI output only fills your composer (it never sends), and auto labels can only apply labels you created.

## Known limits

- One Google account per sign-in.
- Auto labels, reminders and notifications run while ZeroLatency is open in a browser (no background worker). Gmail filters run all the time.
- Scheduling inserts the times you pick into the email; it does not create a booking page.
