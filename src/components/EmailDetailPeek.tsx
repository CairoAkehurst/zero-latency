"use client";

import { useState } from "react";
import { X, Reply, Check, Send, Loader2 } from "lucide-react";

interface EmailDetailPeekProps {
  email: {
    id: string;
    google_message_id: string;
    google_thread_id: string;
    sender_name: string;
    sender_email: string;
    subject: string;
    summary: string;
    category: string;
    categoryColor: string;
    timestamp: string;
    is_unread: boolean;
    body_text: string;
    body_html: string;
    suggestedReply?: string;
  } | null;
  onClose: () => void;
}

export function EmailDetailPeek({ email, onClose }: EmailDetailPeekProps) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  if (!email) return null;

  const handleStartDraft = () => {
    setIsDrafting(true);
    if (email.suggestedReply) {
      setDraftText(email.suggestedReply);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: email.sender_email,
          subject: email.subject,
          body: draftText,
          threadId: email.google_thread_id,
          messageId: email.google_message_id
        }),
      });
      if (res.ok) {
        setSendSuccess(true);
        setTimeout(() => {
          setSendSuccess(false);
          setIsDrafting(false);
          onClose(); // Optional: close after send
        }, 2000);
      } else {
        alert("Failed to send email");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-[500px] flex-shrink-0 border-l border-gray-100 bg-white flex flex-col h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 truncate pr-4">{email.sender_name || email.sender_email}</h2>
        <button 
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* AI Summary Card */}
        {email.summary && (
          <div className="bg-[#f7f7f5] rounded-xl p-4 border border-gray-200/60">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Summary</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {email.summary}
            </p>
          </div>
        )}

        {/* Suggested Actions or Drafting */}
        {isDrafting ? (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <div className="bg-blue-50/50 px-3 py-2 border-b border-blue-100 flex items-center justify-between">
              <span className="text-xs font-medium text-blue-800">Replying to {email.sender_email}</span>
              <button onClick={() => setIsDrafting(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea 
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Write your reply..."
              className="w-full p-3 h-32 resize-none text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              autoFocus
            />
            <div className="p-2 bg-gray-50 flex justify-end">
              <button 
                onClick={handleSend}
                disabled={isSending || !draftText.trim()}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sendSuccess ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                {isSending ? "Sending..." : sendSuccess ? "Sent!" : "Send"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested Actions</div>
            
            <button 
              onClick={handleStartDraft}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                  <Reply className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Draft Reply</div>
                  <div className="text-xs text-gray-500 truncate max-w-[250px]">
                    {email.suggestedReply ? `"${email.suggestedReply}"` : "Write a custom reply"}
                  </div>
                </div>
              </div>
              <Send className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </button>
          </div>
        )}

        {/* Original Thread */}
        <div className="pt-4 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Original Message</div>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 font-semibold text-xs uppercase">
                {email.sender_name?.charAt(0) || email.sender_email?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">{email.sender_name || email.sender_email}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{email.timestamp}</span>
                </div>
                <div className="text-sm font-medium text-gray-800 mb-2">{email.subject}</div>
                {/* Safe HTML rendering if needed, otherwise fallback to text */}
                <div 
                  className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: email.body_html || email.body_text?.replace(/\n/g, '<br/>') || 'No content' }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
