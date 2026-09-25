"use client";

import { MessageSquareText, Sparkles } from "lucide-react";

interface SummaryEmail {
  id: string;
  sender_name?: string;
  sender_email?: string;
  subject?: string;
  summary?: string;
  body_text?: string;
  suggestedReply?: string;
  is_unread?: boolean;
}

interface SummaryViewProps {
  emails: SummaryEmail[];
  onOpenEmail: (emailId: string) => void;
  onQuickReply: (emailId: string, reply: string) => void;
}

const DEFAULT_QUICK_REPLIES = [
  "Thanks — I’ll take a look.",
  "Sounds good to me.",
  "Could we discuss this?",
];

function quickRepliesFor(email: SummaryEmail) {
  if (!email.suggestedReply) return DEFAULT_QUICK_REPLIES;

  return [
    email.suggestedReply,
    "Thanks — I’ll take a look.",
    "Could we discuss this?",
  ];
}

export function SummaryView({ emails, onOpenEmail, onQuickReply }: SummaryViewProps) {
  if (emails.length === 0) {
    return <div className="p-8 text-center text-sm text-gray-500">No emails found. Try syncing or adjusting your search.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-5 sm:p-6 xl:grid-cols-2 2xl:grid-cols-3">
      {emails.map((email) => {
        const sender = email.sender_name || email.sender_email || "Unknown sender";
        const summary = email.summary || email.body_text || "No AI summary is available for this email yet.";

        return (
          <article
            key={email.id}
            onClick={() => onOpenEmail(email.id)}
            className="group flex min-h-72 cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold uppercase text-gray-600">
                {sender.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">{sender}</p>
                  {email.is_unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" aria-label="Unread" />}
                </div>
                {email.sender_name && email.sender_email && <p className="truncate text-xs text-gray-500">{email.sender_email}</p>}
              </div>
            </div>

            <h2 className="mt-5 line-clamp-2 text-base font-semibold leading-snug text-gray-900">{email.subject || "No subject"}</h2>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                <Sparkles className="h-3.5 w-3.5" />
                AI Summary
              </div>
              <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
            </div>

            <div className="mt-auto pt-5">
              <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-400">
                <MessageSquareText className="h-3.5 w-3.5" />
                Quick reply
              </div>
              <div className="grid grid-cols-3 gap-2">
                {quickRepliesFor(email).map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    title={reply}
                    onClick={(event) => {
                      event.stopPropagation();
                      onQuickReply(email.id, reply);
                    }}
                    className="min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-2 text-center text-xs font-medium leading-snug text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <span className="line-clamp-2">{reply}</span>
                  </button>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
