// Types shared by server routes and the client.

export interface Address {
  name: string;
  email: string;
}

export interface ThreadSummary {
  id: string;
  historyId: string;
  subject: string;
  snippet: string;
  /** Distinct senders across the thread, oldest first. */
  participants: Address[];
  /** Distinct To recipients across the thread (used for the Sent folder). */
  recipients: Address[];
  /** Epoch ms of the newest message. */
  lastDate: number;
  messageCount: number;
  labelIds: string[];
  unread: boolean;
  starred: boolean;
  important: boolean;
  hasAttachment: boolean;
  hasCalendar: boolean;
  hasDraft: boolean;
}

export interface AttachmentInfo {
  attachmentId: string;
  partId: string;
  filename: string;
  mimeType: string;
  size: number;
  contentId?: string;
  inline: boolean;
}

export interface MessageDetail {
  id: string;
  threadId: string;
  labelIds: string[];
  from: Address | null;
  to: Address[];
  cc: Address[];
  bcc: Address[];
  replyTo: Address[];
  subject: string;
  date: number;
  snippet: string;
  html: string | null;
  text: string | null;
  attachments: AttachmentInfo[];
  /** RFC 5322 Message-ID header, used for In-Reply-To/References on replies. */
  messageIdHeader: string | null;
  references: string | null;
  listUnsubscribe: string | null;
}

export interface ThreadDetail {
  id: string;
  historyId: string;
  subject: string;
  labelIds: string[];
  messages: MessageDetail[];
}

export interface ThreadPage {
  threads: ThreadSummary[];
  nextPageToken: string | null;
  resultSizeEstimate: number;
}

export type LabelType = 'system' | 'user';

export interface Label {
  id: string;
  name: string;
  type: LabelType;
  color: { backgroundColor: string; textColor: string } | null;
  messagesUnread?: number;
  threadsUnread?: number;
  threadsTotal?: number;
}

export interface AccountInfo {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  /** Whether the account granted the Calendar free/busy scope used by /schedule. */
  canReadFreeBusy: boolean;
}

export interface SessionInfo {
  accounts: AccountInfo[];
  activeId: string | null;
  demo: boolean;
  aiEnabled: boolean;
}

export interface OutgoingAttachment {
  filename: string;
  mimeType: string;
  /** Standard base64 (not base64url) file content. */
  data: string;
}

export interface OutgoingMessage {
  to: Address[];
  cc: Address[];
  bcc: Address[];
  subject: string;
  html: string;
  text: string;
  attachments: OutgoingAttachment[];
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}

export interface SendAs {
  email: string;
  name: string;
  signature: string;
  isDefault: boolean;
}

export interface GmailFilter {
  id: string;
  criteria: {
    from?: string;
    to?: string;
    subject?: string;
    query?: string;
    negatedQuery?: string;
    hasAttachment?: boolean;
  };
  action: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
    forward?: string;
  };
}

export interface BusyInterval {
  start: number;
  end: number;
}
