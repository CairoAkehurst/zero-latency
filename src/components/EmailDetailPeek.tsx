"use client";

import { useState } from "react";
import { X, Reply, Check, Send, Loader2, Maximize2, Minimize2, Archive, Trash2, Mail, Clock, MoreVertical, CornerUpLeft, CornerUpRight, ChevronDown } from "lucide-react";
import { formatEmailDate } from "@/utils/formatDate";

interface EmailDetailPeekProps {
  email: {
    id: string;
    google_message_id: string;
    google_thread_id: string;
    sender_name: string;
    sender_email: string;
    subject: string;
    snippet: string;
    body_html: string;
    body_text: string;
    timestamp: string;
    is_unread: boolean;
    hasAiMetadata: boolean;
    summary?: string;
    category?: string;
    categoryColor?: "blue" | "green" | "yellow" | "red" | "purple" | "gray" | "pink" | "indigo" | "teal";
    suggestedReply?: string;
    to_email?: string;
    cc?: string;
    bcc?: string;
  } | null;
  onClose: () => void;
  onExpand?: () => void;
  isFullView?: boolean;
}

export function EmailDetailPeek({ email, onClose, onExpand, isFullView = false }: EmailDetailPeekProps) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

  const fullDate = new Date(email.timestamp);
  const formattedFullDate = isNaN(fullDate.getTime()) ? email.timestamp : fullDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className={`flex flex-col h-full bg-white z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-1 rounded-tl-2xl ${isFullView ? 'border-l-0' : 'border-l border-gray-100'}`}>
      {/* Header Toolbar */}
      <div className="h-[68px] px-5 flex items-center justify-between border-b border-gray-100 flex-shrink-0 bg-white">
        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="Archive">
            <Archive className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="Mark unread">
            <Mail className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          {onExpand && (
            <button 
              onClick={onExpand}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title={isFullView ? "Minimize" : "Full screen"}
            >
              {isFullView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        
        {/* AI Summary Banner (if exists) */}
        {email.summary && (
          <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-100">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                AI Summary
              </span>
            </div>
            <p className="text-sm text-blue-900/90 leading-relaxed max-w-4xl">
              {email.summary}
            </p>
          </div>
        )}

        <div className="p-8 max-w-5xl mx-auto">
          {/* Email Subject */}
          <h1 className="text-2xl font-normal text-gray-900 mb-8 leading-snug">
            {email.subject}
            {email.category && (
              <span className="ml-4 align-middle inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-700 border-gray-200">
                {email.category}
              </span>
            )}
          </h1>

          {/* Sender Header Row */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-700 font-semibold text-lg">
                {email.sender_name?.charAt(0) || email.sender_email?.charAt(0) || "?"}
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-gray-900">{email.sender_name || email.sender_email}</span>
                  {email.sender_name && (
                    <span className="text-xs text-gray-500">&lt;{email.sender_email}&gt;</span>
                  )}
                </div>
                <div 
                  className="flex items-center gap-1 mt-0.5 text-xs text-gray-500 cursor-pointer hover:text-gray-700 w-fit"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <span>to me</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                </div>
                
                {/* Details Dropdown */}
                {showDetails && (
                  <div className="mt-3 p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-gray-600">
                    <div className="text-right text-gray-400">From:</div>
                    <div className="font-medium text-gray-900">{email.sender_name} &lt;{email.sender_email}&gt;</div>
                    
                    <div className="text-right text-gray-400">To:</div>
                    <div>{email.to_email || "you@zerolatency.com"}</div>
                    
                    {email.cc && (
                      <>
                        <div className="text-right text-gray-400">Cc:</div>
                        <div>{email.cc}</div>
                      </>
                    )}
                    {email.bcc && (
                      <>
                        <div className="text-right text-gray-400">Bcc:</div>
                        <div>{email.bcc}</div>
                      </>
                    )}
                    <div className="text-right text-gray-400">Date:</div>
                    <div>{formattedFullDate}</div>
                    
                    <div className="text-right text-gray-400">Subject:</div>
                    <div>{email.subject}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions (Right side) */}
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xs mr-4">{formatEmailDate(email.timestamp)}</span>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Reply">
                <CornerUpLeft className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="More">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Email Body */}
          <div className="mb-12">
            {email.body_html ? (
              <iframe 
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                srcDoc={email.body_html} 
                className="w-full min-h-[400px] border-none bg-transparent" 
                title="Email Body"
                onLoad={(e) => {
                  const iframe = e.target as HTMLIFrameElement;
                  try {
                    iframe.style.height = iframe.contentWindow?.document.documentElement.scrollHeight + 'px';
                  } catch (e) {
                    // Ignore cross-origin errors if any
                  }
                }}
              />
            ) : (
              <div className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {email.body_text || 'No content'}
              </div>
            )}
          </div>

          {/* Footer Actions / Drafting */}
          <div className="pt-6 mt-6">
            {isDrafting ? (
              <div className="bg-white rounded-xl border border-gray-300 shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CornerUpLeft className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{email.sender_name || email.sender_email}</span>
                  </div>
                  <button onClick={() => setIsDrafting(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <textarea 
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Write your reply..."
                  className="w-full p-4 min-h-[200px] resize-y text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  autoFocus
                />
                <div className="p-3 bg-white border-t border-gray-100 flex justify-between items-center">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleSend}
                    disabled={isSending || !draftText.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : sendSuccess ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    {isSending ? "Sending..." : sendSuccess ? "Sent!" : "Send"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleStartDraft}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
                >
                  <CornerUpLeft className="w-4 h-4" />
                  Reply
                </button>
                <button className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">
                  <CornerUpRight className="w-4 h-4" />
                  Forward
                </button>
                
                {email.suggestedReply && (
                  <button 
                    onClick={() => {
                      setDraftText(email.suggestedReply!);
                      setIsDrafting(true);
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 text-sm font-medium transition-colors ml-auto"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    AI Draft Ready
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
