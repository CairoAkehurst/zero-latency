'use client';
import { createContext, useContext } from 'react';
import type { AccountInfo, Address, Label, MessageDetail, SessionInfo, ThreadSummary } from '@/lib/shared/types';
import type { View } from '@/lib/shared/views';

export type ThreadAction =
  | { kind: 'archive' } | { kind: 'inbox' }
  | { kind: 'trash' } | { kind: 'untrash' }
  | { kind: 'read' } | { kind: 'unread' }
  | { kind: 'star' } | { kind: 'unstar' }
  | { kind: 'spam' } | { kind: 'notSpam' }
  | { kind: 'label'; labelId: string } | { kind: 'unlabel'; labelId: string }
  | { kind: 'remind'; at: number };

export interface ComposeInit {
  mode: 'new' | 'reply' | 'replyAll' | 'forward' | 'draft';
  threadId?: string;
  /** The message being replied to / forwarded. */
  source?: MessageDetail;
  draftId?: string;
  to?: Address[];
  cc?: Address[];
  bcc?: Address[];
  subject?: string;
  bodyHtml?: string;
  /** Where the composer renders: floating dock (default) or inline under a thread. */
  inline?: boolean;
}

export interface NavTarget {
  kind: 'view' | 'folder' | 'search';
  id: string;
}

export const FOLDERS: { id: string; name: string; icon: string; q: string }[] = [
  { id: 'all', name: 'All mail', icon: 'mail', q: '' },
  { id: 'sent', name: 'Sent', icon: 'send', q: 'in:sent' },
  { id: 'drafts', name: 'Drafts', icon: 'draft', q: 'in:drafts' },
  { id: 'reminders', name: 'Reminders', icon: 'clock', q: 'label:ZeroLatency-Reminders' },
  { id: 'spam', name: 'Spam', icon: 'spam', q: 'in:spam' },
  { id: 'trash', name: 'Trash', icon: 'trash', q: 'in:trash' },
];

export const REMINDER_LABEL = 'ZeroLatency/Reminders';

export interface MailCtx {
  session: SessionInfo;
  account: AccountInfo;
  me: string;
  labels: Label[];
  userLabels: Label[];
  refreshLabels: () => Promise<Label[]>;
  ensureLabel: (name: string) => Promise<Label>;
  nav: NavTarget;
  navigate: (t: NavTarget) => void;
  activeView: View | null;
  query: string;
  threads: ThreadSummary[];
  act: (ids: string[], action: ThreadAction, opts?: { silent?: boolean; fromThreadView?: boolean; keepRows?: boolean }) => Promise<void>;
  openThread: (id: string | null) => void;
  openThreadId: string | null;
  compose: (init: ComposeInit) => void;
  openSettings: (section?: string) => void;
  openEditView: (viewId: string, step?: 'root' | 'properties' | 'filters' | 'hover') => void;
  openAutoLabel: (seed?: { name?: string; description?: string }) => void;
  counts: Record<string, number>;
  refreshList: () => void;
  refreshCounts: () => void;
  aiEnabled: boolean;
}

export const MailContext = createContext<MailCtx | null>(null);

export function useMail(): MailCtx {
  const c = useContext(MailContext);
  if (!c) throw new Error('useMail outside MailApp');
  return c;
}
