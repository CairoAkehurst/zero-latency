'use client';
import type {
  Address, BusyInterval, GmailFilter, Label, MessageDetail, OutgoingMessage, SendAs, SessionInfo, ThreadDetail, ThreadPage, ThreadSummary,
} from '../shared/types';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message);
  }
}

let currentAccount: string | null = null;
export function setApiAccount(id: string | null) {
  currentAccount = id;
}

async function call<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (currentAccount) headers['x-zl-account'] = currentAccount;
  if (init.json !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) }, body: init.json !== undefined ? JSON.stringify(init.json) : init.body, credentials: 'same-origin' });
  } catch {
    throw new ApiError('You appear to be offline.', 0, 'network');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) {
    if (res.status === 401 && (data.code === 'unauthenticated' || data.code === 'reauth') && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zl:reauth', { detail: data.error }));
    }
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status, data.code ?? 'error');
  }
  return data as T;
}

const post = <T>(path: string, json: unknown) => call<T>(path, { method: 'POST', json });

export const api = {
  session: () => call<SessionInfo>('/api/session'),
  logout: (opts: { revoke?: boolean } = {}) => post<{ ok: true; remaining: number }>('/api/auth/logout', opts),

  threads: (q: string, pageToken?: string, max = 40) => call<ThreadPage>(`/api/mail/threads?${new URLSearchParams({ q, max: String(max), ...(pageToken ? { pageToken } : {}) })}`),
  counts: (queries: string[]) => post<{ counts: number[] }>('/api/mail/counts', { queries }),
  thread: (id: string) => call<ThreadDetail>(`/api/mail/threads/${encodeURIComponent(id)}`),
  modify: (ids: string[], add: string[], remove: string[]) => post<{ ok: true }>('/api/mail/modify', { ids, add, remove }),
  trash: (ids: string[], undo = false) => post<{ ok: true }>('/api/mail/trash', { ids, undo }),
  send: (message: OutgoingMessage, draftId?: string | null) => post<{ id: string; threadId: string }>('/api/mail/send', { message, draftId }),
  saveDraft: (message: OutgoingMessage, draftId?: string | null) => post<{ draftId: string; messageId: string; threadId: string }>('/api/mail/drafts', { message, draftId }),
  deleteDraft: (draftId: string) => post<{ ok: true }>('/api/mail/drafts/delete', { draftId }),
  draftForThread: (threadId: string) => call<{ draft: { draftId: string; message: MessageDetail } | null }>(`/api/mail/drafts/thread?threadId=${encodeURIComponent(threadId)}`),
  labels: () => call<{ labels: Label[] }>('/api/mail/labels'),
  createLabel: (name: string) => post<{ label: Label }>('/api/mail/labels', { name }),
  renameLabel: (id: string, name: string) => call<{ label: Label }>(`/api/mail/labels/${encodeURIComponent(id)}`, { method: 'PATCH', json: { name } }),
  deleteLabel: (id: string) => call<{ ok: true }>(`/api/mail/labels/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  sendAs: () => call<{ sendAs: SendAs[] }>('/api/mail/settings/sendas'),
  filters: () => call<{ filters: GmailFilter[] }>('/api/mail/settings/filters'),
  createFilter: (f: Omit<GmailFilter, 'id'>) => post<{ filter: GmailFilter }>('/api/mail/settings/filters', f),
  deleteFilter: (id: string) => post<{ ok: true }>('/api/mail/settings/filters/delete', { id }),
  freeBusy: (timeMin: number, timeMax: number) => post<{ busy: BusyInterval[] }>('/api/mail/freebusy', { timeMin, timeMax }),
  contacts: () => call<{ contacts: Address[] }>('/api/mail/contacts'),

  aiSummarize: (threadId: string) => post<{ summary: { summary: string; keyPoints: string[]; actionItems: string[] } }>('/api/ai/summarize', { threadId }),
  aiDraft: (threadId: string, instruction?: string) => post<{ body: string }>('/api/ai/draft', { threadId, instruction }),
  aiWrite: (b: { prompt: string; draft: string; subject: string; to: string[]; threadId?: string; context?: string }) => post<{ body: string }>('/api/ai/write', b),
  aiAutoLabel: (rules: { id: string; name: string; description: string; labelId: string }[], threads: Pick<ThreadSummary, 'id' | 'subject' | 'snippet' | 'participants'>[], apply = true) =>
    post<{ assignments: Record<string, string[]>; processed: string[] }>('/api/ai/autolabel', { rules, threads, apply }),
  aiCards: (threadIds: string[]) => post<{ cards: { threadId: string; historyId: string; summary: string; replies: { label: string; body: string }[] }[] }>('/api/ai/cards', { threadIds }),
  aiSuggestLabel: (threadId: string) => post<{ name: string; description: string }>('/api/ai/suggest-label', { threadId }),
};

export function attachmentUrl(accountId: string, messageId: string, a: { attachmentId: string; filename: string; mimeType: string }, inline = false): string {
  return `/api/mail/attachment?${new URLSearchParams({ account: accountId, messageId, attachmentId: a.attachmentId, filename: a.filename, mimeType: a.mimeType, ...(inline ? { inline: '1' } : {}) })}`;
}
