import 'server-only';
import type {
  Address, BusyInterval, GmailFilter, Label, MessageDetail, OutgoingMessage, SendAs, ThreadDetail, ThreadPage, ThreadSummary,
} from '../shared/types';
import { buildMime, decodeEntities, header, htmlToText, parseAddressList, parseMessage, stripQuoted, toBase64Url, type GmailMessage } from './mime';
import { ProviderError, type DraftRef, type MailProvider, type NewFilter, type NewLabel } from './provider';
import { google } from 'googleapis';
import { env } from './env';
import type { StoredAccount } from './session';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const CALENDAR = 'https://www.googleapis.com/calendar/v3';
const META_HEADERS = ['From', 'To', 'Subject', 'Date'];

// ---------- small utilities ----------

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return out;
}

class Lru<V> {
  private map = new Map<string, V>();
  constructor(private max: number) {}
  get(k: string): V | undefined {
    const v = this.map.get(k);
    if (v !== undefined) { this.map.delete(k); this.map.set(k, v); }
    return v;
  }
  set(k: string, v: V) {
    this.map.delete(k); this.map.set(k, v);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }
}

// Thread metadata keyed by account + thread + historyId: any change to a thread bumps its historyId.
const summaryCache = new Lru<ThreadSummary>(5000);
const contactsCache = new Lru<{ at: number; list: Address[] }>(50);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GmailErrorBody { error?: { message?: string; status?: string; code?: number; errors?: { reason?: string; message?: string }[] } }

export function summarize(thread: { id: string; historyId?: string; messages?: GmailMessage[] }, extras: { attachment: Set<string>; calendar: Set<string> }): ThreadSummary {
  const msgs = thread.messages ?? [];
  const real = msgs.filter((m) => !(m.labelIds ?? []).includes('DRAFT'));
  const counted = real.length ? real : msgs;
  const labels = new Set<string>();
  for (const m of msgs) for (const l of m.labelIds ?? []) if (l !== 'DRAFT' || real.length === 0) labels.add(l);
  const participants: Address[] = [];
  const seen = new Set<string>();
  for (const m of counted) {
    const from = parseAddressList(header(m.payload?.headers, 'From'))[0];
    if (from && !seen.has(from.email.toLowerCase())) { seen.add(from.email.toLowerCase()); participants.push(from); }
  }
  const recipients: Address[] = [];
  const seenTo = new Set<string>();
  for (const m of counted) {
    for (const a of parseAddressList(header(m.payload?.headers, 'To'))) {
      if (!seenTo.has(a.email.toLowerCase())) { seenTo.add(a.email.toLowerCase()); recipients.push(a); }
    }
  }
  const first = counted[0];
  const last = counted[counted.length - 1];
  const lastDate = Math.max(0, ...counted.map((m) => Number(m.internalDate ?? 0)));
  return {
    id: thread.id,
    historyId: thread.historyId ?? '',
    subject: header(first?.payload?.headers, 'Subject') ?? '',
    snippet: decodeEntities(last?.snippet ?? ''),
    participants,
    recipients,
    lastDate,
    messageCount: counted.length,
    labelIds: [...labels],
    unread: counted.some((m) => (m.labelIds ?? []).includes('UNREAD')),
    starred: msgs.some((m) => (m.labelIds ?? []).includes('STARRED')),
    important: msgs.some((m) => (m.labelIds ?? []).includes('IMPORTANT')),
    hasAttachment: extras.attachment.has(thread.id),
    hasCalendar: extras.calendar.has(thread.id),
    hasDraft: msgs.some((m) => (m.labelIds ?? []).includes('DRAFT')),
  };
}

export class GmailProvider implements MailProvider {
  readonly email: string;
  private auth: OAuth2Client;

  /**
   * Gmail and Calendar calls go through a googleapis OAuth2 client built from the tokens Supabase captured at sign-in.
   * It refreshes the access token with the refresh token when needed (and retries once on 401); `onTokens` persists
   * refreshed tokens back to Supabase.
   */
  constructor(private account: StoredAccount, private onTokens: (a: StoredAccount) => void) {
    this.email = account.email;
    this.auth = new google.auth.OAuth2(env().googleClientId, env().googleClientSecret);
    this.auth.setCredentials({
      access_token: account.accessToken || undefined,
      refresh_token: account.refreshToken || undefined,
      expiry_date: account.expiresAt || undefined,
    });
    this.auth.on('tokens', (t) => {
      this.account = {
        ...this.account,
        accessToken: t.access_token ?? this.account.accessToken,
        expiresAt: t.expiry_date ?? Date.now() + 3500_000,
        refreshToken: t.refresh_token ?? this.account.refreshToken,
      };
      this.onTokens(this.account);
    });
  }

  // ---------- transport ----------

  private async req<T>(url: string, init: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; data?: unknown } = {}, attempt = 0): Promise<T> {
    if (!this.account.refreshToken && (!this.account.accessToken || this.account.expiresAt < Date.now())) {
      throw new ProviderError(`Google access for ${this.email} expired. Sign in again.`, 401, 'reauth');
    }
    let status = 0;
    let body: GmailErrorBody = {};
    let retryAfterHeader: string | null = null;
    try {
      const res = await this.auth.request<T>({ url, method: init.method ?? 'GET', data: init.data, timeout: 30_000, retry: false });
      if (res.status === 204) return undefined as T;
      return (res.data === '' ? undefined : res.data) as T;
    } catch (e) {
      const err = e as { response?: { status?: number; data?: unknown; headers?: unknown }; message?: string };
      if (!err.response) {
        // Token refresh failures surface here without a Gmail response.
        const m = String(err.message ?? '');
        if (/invalid_grant|No refresh token|invalid_client|unauthorized_client/i.test(m)) {
          throw new ProviderError(`Google access for ${this.email} expired or was revoked. Sign in again.`, 401, 'reauth');
        }
        throw new ProviderError(`Could not reach Google: ${m || 'network error'}`, 502);
      }
      status = err.response.status ?? 502;
      const data = err.response.data as (GmailErrorBody & { error?: unknown; error_description?: string }) | string | undefined;
      if (data && typeof data === 'object' && typeof data.error === 'string') {
        // OAuth token endpoint error (refresh failed).
        throw new ProviderError(`Google access for ${this.email} expired or was revoked. Sign in again.`, 401, 'reauth');
      }
      body = data && typeof data === 'object' ? data : {};
      const h = err.response.headers as { get?: (k: string) => string | null } & Record<string, string> | undefined;
      retryAfterHeader = h ? (typeof h.get === 'function' ? h.get('retry-after') : h['retry-after'] ?? null) : null;
    }
    if (status === 401) throw new ProviderError(`Google access for ${this.email} expired or was revoked. Sign in again.`, 401, 'reauth');
    // Gmail signals per-user quota as 403 with reason rateLimitExceeded / userRateLimitExceeded.
    const rateLimited = status === 403 && ((body.error?.errors ?? []).some((x) => /rateLimit/i.test(x.reason ?? '')) || /rate limit/i.test(body.error?.message ?? ''));
    if ((status === 429 || status >= 500 || rateLimited) && attempt < 3) {
      const retryAfter = Number(retryAfterHeader);
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : 400 * 2 ** attempt + Math.random() * 250);
      return this.req<T>(url, init, attempt + 1);
    }
    const msg = body.error?.message || `Google API error ${status}`;
    if (status === 403 && /has not been used|is disabled|accessNotConfigured/i.test(msg + JSON.stringify(body.error?.errors ?? []))) {
      throw new ProviderError('The Gmail or Calendar API is not enabled in the Google Cloud project behind GOOGLE_CLIENT_ID. Enable it under APIs & Services → Library.', 403, 'api_disabled');
    }
    if (status === 403 && /insufficient/i.test(msg)) throw new ProviderError('ZeroLatency is missing a Google permission for this action. Sign in again and allow all requested access.', 403, 'scope');
    throw new ProviderError(msg, status);
  }

  private get<T>(path: string, params?: Record<string, string | string[] | number | undefined>): Promise<T> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v === undefined) continue;
      if (Array.isArray(v)) v.forEach((x) => qs.append(k, x)); else qs.set(k, String(v));
    }
    const s = qs.toString();
    return this.req<T>(`${GMAIL}${path}${s ? `?${s}` : ''}`);
  }

  private send_<T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown, base = GMAIL): Promise<T> {
    return this.req<T>(`${base}${path}`, { method, data: body });
  }

  // ---------- threads ----------

  async listThreads(q: string, opts: { pageToken?: string; maxResults?: number } = {}): Promise<ThreadPage> {
    const list = await this.get<{ threads?: { id: string; historyId: string }[]; nextPageToken?: string; resultSizeEstimate?: number }>('/threads', {
      q: q || undefined, pageToken: opts.pageToken, maxResults: Math.min(opts.maxResults ?? 40, 100),
    });
    const refs = list.threads ?? [];
    if (!refs.length) return { threads: [], nextPageToken: null, resultSizeEstimate: 0 };

    const missing = refs.filter((r) => !summaryCache.get(`${this.account.id}:${r.id}:${r.historyId}`));
    const fetched = await mapLimit(missing, 6, (r) =>
      this.get<{ id: string; historyId: string; messages?: GmailMessage[] }>(`/threads/${r.id}`, { format: 'metadata', metadataHeaders: META_HEADERS }),
    );

    // Attachment / invitation flags: one scoped search each over the time window of this page.
    const extras = { attachment: new Set<string>(), calendar: new Set<string>() };
    const raw = new Map(fetched.map((t) => [t.id, t]));
    const dates = fetched.flatMap((t) => (t.messages ?? []).map((m) => Number(m.internalDate ?? 0))).filter((n) => n > 0);
    if (fetched.length && dates.length) {
      const after = Math.floor(Math.min(...dates) / 1000) - 1;
      const before = Math.ceil(Math.max(...dates) / 1000) + 1;
      const scope = `${q ? `(${q}) ` : ''}after:${after} before:${before}`;
      const [att, cal] = await Promise.all([
        this.get<{ threads?: { id: string }[] }>('/threads', { q: `${scope} has:attachment`, maxResults: 100 }),
        this.get<{ threads?: { id: string }[] }>('/threads', { q: `${scope} filename:ics`, maxResults: 100 }),
      ]);
      att.threads?.forEach((t) => extras.attachment.add(t.id));
      cal.threads?.forEach((t) => extras.calendar.add(t.id));
    }
    // Key by the historyId the list returned, so a thread modified between the two calls is still found.
    for (const r of missing) {
      const t = raw.get(r.id);
      if (t) summaryCache.set(`${this.account.id}:${r.id}:${r.historyId}`, summarize(t, extras));
    }

    const threads = refs.map((r) => summaryCache.get(`${this.account.id}:${r.id}:${r.historyId}`)).filter((t): t is ThreadSummary => !!t);
    return { threads, nextPageToken: list.nextPageToken ?? null, resultSizeEstimate: list.resultSizeEstimate ?? threads.length };
  }

  async countThreads(q: string, cap = 100): Promise<number> {
    const list = await this.get<{ threads?: { id: string }[] }>('/threads', { q, maxResults: Math.min(cap, 500) });
    return list.threads?.length ?? 0;
  }

  async getThread(id: string): Promise<ThreadDetail> {
    const t = await this.get<{ id: string; historyId: string; messages?: GmailMessage[] }>(`/threads/${encodeURIComponent(id)}`, { format: 'full' });
    const messages = (t.messages ?? []).map(parseMessage);
    const labels = new Set<string>();
    messages.forEach((m) => m.labelIds.forEach((l) => labels.add(l)));
    return { id: t.id, historyId: t.historyId, subject: messages[0]?.subject ?? '', labelIds: [...labels], messages };
  }

  async modifyThreads(ids: string[], add: string[], remove: string[]): Promise<void> {
    await mapLimit(ids, 5, (id) => this.send_('POST', `/threads/${encodeURIComponent(id)}/modify`, { addLabelIds: add, removeLabelIds: remove }));
  }

  async trashThreads(ids: string[]): Promise<void> {
    await mapLimit(ids, 5, (id) => this.send_('POST', `/threads/${encodeURIComponent(id)}/trash`));
  }

  async untrashThreads(ids: string[]): Promise<void> {
    await mapLimit(ids, 5, (id) => this.send_('POST', `/threads/${encodeURIComponent(id)}/untrash`));
  }

  // ---------- sending & drafts ----------

  async send(msg: OutgoingMessage, from: Address): Promise<{ id: string; threadId: string }> {
    return this.send_('POST', '/messages/send', { raw: toBase64Url(buildMime(msg, from)), ...(msg.threadId ? { threadId: msg.threadId } : {}) });
  }

  async saveDraft(draftId: string | null, msg: OutgoingMessage, from: Address): Promise<DraftRef> {
    const message = { raw: toBase64Url(buildMime(msg, from)), ...(msg.threadId ? { threadId: msg.threadId } : {}) };
    const d = draftId
      ? await this.send_<{ id: string; message: { id: string; threadId: string } }>('PUT', `/drafts/${encodeURIComponent(draftId)}`, { id: draftId, message })
      : await this.send_<{ id: string; message: { id: string; threadId: string } }>('POST', '/drafts', { message });
    return { draftId: d.id, messageId: d.message.id, threadId: d.message.threadId };
  }

  async sendDraft(draftId: string): Promise<{ id: string; threadId: string }> {
    return this.send_('POST', '/drafts/send', { id: draftId });
  }

  async deleteDraft(draftId: string): Promise<void> {
    await this.send_('DELETE', `/drafts/${encodeURIComponent(draftId)}`);
  }

  async draftForThread(threadId: string): Promise<{ draftId: string; message: MessageDetail } | null> {
    let pageToken: string | undefined;
    for (let i = 0; i < 5; i++) {
      const page = await this.get<{ drafts?: { id: string; message: { id: string; threadId: string } }[]; nextPageToken?: string }>('/drafts', { maxResults: 100, pageToken });
      const hit = page.drafts?.find((d) => d.message.threadId === threadId);
      if (hit) {
        const full = await this.get<{ id: string; message: GmailMessage }>(`/drafts/${encodeURIComponent(hit.id)}`, { format: 'full' });
        return { draftId: full.id, message: parseMessage(full.message) };
      }
      if (!page.nextPageToken) return null;
      pageToken = page.nextPageToken;
    }
    return null;
  }

  // ---------- labels ----------

  async listLabels(): Promise<Label[]> {
    const r = await this.get<{ labels?: { id: string; name: string; type: string; color?: { backgroundColor: string; textColor: string } }[] }>('/labels');
    return (r.labels ?? []).map((l) => ({ id: l.id, name: l.name, type: l.type === 'user' ? 'user' : 'system', color: l.color ?? null }));
  }

  async createLabel(l: NewLabel): Promise<Label> {
    const r = await this.send_<{ id: string; name: string; type: string }>('POST', '/labels', {
      name: l.name, labelListVisibility: 'labelShow', messageListVisibility: 'show', ...(l.color ? { color: l.color } : {}),
    });
    return { id: r.id, name: r.name, type: 'user', color: l.color ?? null };
  }

  async updateLabel(id: string, l: Partial<NewLabel>): Promise<Label> {
    const r = await this.send_<{ id: string; name: string; type: string; color?: Label['color'] }>('PATCH', `/labels/${encodeURIComponent(id)}`, {
      ...(l.name ? { name: l.name } : {}), ...(l.color !== undefined ? { color: l.color } : {}),
    });
    return { id: r.id, name: r.name, type: r.type === 'user' ? 'user' : 'system', color: r.color ?? null };
  }

  async deleteLabel(id: string): Promise<void> {
    await this.send_('DELETE', `/labels/${encodeURIComponent(id)}`);
  }

  // ---------- attachments ----------

  async attachment(messageId: string, attachmentId: string): Promise<Uint8Array> {
    const r = await this.get<{ data: string }>(`/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`);
    return new Uint8Array(Buffer.from(r.data, 'base64url'));
  }

  // ---------- settings ----------

  async sendAs(): Promise<SendAs[]> {
    const r = await this.get<{ sendAs?: { sendAsEmail: string; displayName?: string; signature?: string; isDefault?: boolean; isPrimary?: boolean }[] }>('/settings/sendAs');
    return (r.sendAs ?? []).map((s) => ({ email: s.sendAsEmail, name: s.displayName ?? '', signature: s.signature ?? '', isDefault: !!(s.isDefault ?? s.isPrimary) }));
  }

  async listFilters(): Promise<GmailFilter[]> {
    const r = await this.get<{ filter?: GmailFilter[] }>('/settings/filters');
    return r.filter ?? [];
  }

  async createFilter(f: NewFilter): Promise<GmailFilter> {
    return this.send_<GmailFilter>('POST', '/settings/filters', f);
  }

  async deleteFilter(id: string): Promise<void> {
    await this.send_('DELETE', `/settings/filters/${encodeURIComponent(id)}`);
  }

  // ---------- calendar ----------

  async freeBusy(timeMin: number, timeMax: number): Promise<BusyInterval[]> {
    const r = await this.send_<{ calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }> }>(
      'POST', '/freeBusy', { timeMin: new Date(timeMin).toISOString(), timeMax: new Date(timeMax).toISOString(), items: [{ id: 'primary' }] }, CALENDAR,
    );
    const cal = r.calendars?.primary;
    return (cal?.busy ?? []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
  }

  // ---------- derived ----------

  async recentContacts(): Promise<Address[]> {
    const key = this.account.id;
    const hit = contactsCache.get(key);
    if (hit && Date.now() - hit.at < 10 * 60_000) return hit.list;
    const list = await this.get<{ messages?: { id: string }[] }>('/messages', { q: 'in:sent', maxResults: 60 });
    const msgs = await mapLimit(list.messages ?? [], 6, (m) => this.get<GmailMessage>(`/messages/${m.id}`, { format: 'metadata', metadataHeaders: ['To', 'Cc'] }));
    const score = new Map<string, { a: Address; n: number }>();
    for (const m of msgs) {
      for (const a of [...parseAddressList(header(m.payload?.headers, 'To')), ...parseAddressList(header(m.payload?.headers, 'Cc'))]) {
        const k = a.email.toLowerCase();
        if (k === this.email.toLowerCase()) continue;
        const cur = score.get(k);
        if (cur) { cur.n++; if (!cur.a.name && a.name) cur.a = a; } else score.set(k, { a, n: 1 });
      }
    }
    const out = [...score.values()].sort((x, y) => y.n - x.n).map((x) => x.a);
    contactsCache.set(key, { at: Date.now(), list: out });
    return out;
  }

  async sentSamples(limit: number): Promise<string[]> {
    const list = await this.get<{ messages?: { id: string }[] }>('/messages', { q: 'in:sent -in:chats', maxResults: Math.min(limit, 10) });
    const msgs = await mapLimit(list.messages ?? [], 4, (m) => this.get<GmailMessage>(`/messages/${m.id}`, { format: 'full' }));
    return msgs
      .map(parseMessage)
      .map((m) => stripQuoted(m.text ?? (m.html ? htmlToText(m.html) : '')).slice(0, 1200))
      .filter((t) => t.length > 20);
  }
}
