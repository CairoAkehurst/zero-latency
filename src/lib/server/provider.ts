import type {
  Address, BusyInterval, GmailFilter, Label, MessageDetail, OutgoingMessage, SendAs, ThreadDetail, ThreadPage,
} from '../shared/types';

export interface DraftRef {
  draftId: string;
  messageId: string;
  threadId: string;
}

export interface NewLabel {
  name: string;
  color?: { backgroundColor: string; textColor: string } | null;
}

export interface NewFilter {
  criteria: GmailFilter['criteria'];
  action: GmailFilter['action'];
}

/** Everything the app needs from a mailbox. Implemented by Gmail and by the offline demo mailbox. */
export interface MailProvider {
  readonly email: string;
  listThreads(q: string, opts?: { pageToken?: string; maxResults?: number }): Promise<ThreadPage>;
  countThreads(q: string, cap?: number): Promise<number>;
  getThread(id: string): Promise<ThreadDetail>;
  modifyThreads(ids: string[], add: string[], remove: string[]): Promise<void>;
  trashThreads(ids: string[]): Promise<void>;
  untrashThreads(ids: string[]): Promise<void>;
  send(msg: OutgoingMessage, from: Address): Promise<{ id: string; threadId: string }>;
  saveDraft(draftId: string | null, msg: OutgoingMessage, from: Address): Promise<DraftRef>;
  sendDraft(draftId: string): Promise<{ id: string; threadId: string }>;
  deleteDraft(draftId: string): Promise<void>;
  draftForThread(threadId: string): Promise<{ draftId: string; message: MessageDetail } | null>;
  listLabels(): Promise<Label[]>;
  createLabel(l: NewLabel): Promise<Label>;
  updateLabel(id: string, l: Partial<NewLabel>): Promise<Label>;
  deleteLabel(id: string): Promise<void>;
  attachment(messageId: string, attachmentId: string): Promise<Uint8Array>;
  sendAs(): Promise<SendAs[]>;
  listFilters(): Promise<GmailFilter[]>;
  createFilter(f: NewFilter): Promise<GmailFilter>;
  deleteFilter(id: string): Promise<void>;
  freeBusy(timeMin: number, timeMax: number): Promise<BusyInterval[]>;
  recentContacts(): Promise<Address[]>;
  /** Recent messages the user sent, as plain text, for matching their writing style. */
  sentSamples(limit: number): Promise<string[]>;
}

export class ProviderError extends Error {
  constructor(message: string, public readonly status: number, public readonly code = 'provider_error') {
    super(message);
  }
}
