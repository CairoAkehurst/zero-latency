"use client";

import { useState, useRef } from "react";
import { X, Reply, Check, Send, Loader2, Maximize2, Minimize2, Archive, Trash2, Mail, Clock, MoreVertical, CornerUpLeft, CornerUpRight, ChevronDown, Sparkles, Type, Paperclip, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
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
  const [draftText, setDraftText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const replyRef = useRef<HTMLTextAreaElement>(null);

  if (!email) return null;

  const handleScrollToReply = () => {
    replyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      replyRef.current?.focus();
    }, 300);
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
          setDraftText("");
          onClose();
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
    <div className={`flex flex-col h-full bg-white z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-1 rounded-tl-2xl ${isFullView ? 'border-l-0' : 'border-l border-gray-200'}`}>
      
      {/* Header Toolbar */}
      <div className="h-[68px] px-5 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors" title="Archive">
            <Archive className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors" title="Mark unread">
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-white p-6 lg:p-10 flex flex-col gap-6 relative">
        
        {/* Email Subject */}
        <h1 className="text-2xl font-normal text-gray-900 leading-snug w-full">
          {email.subject}
          {email.category && (
            <span className="ml-4 align-middle inline-block px-2.5 py-0.5 rounded-sm text-xs font-medium border bg-gray-100 text-gray-600 border-gray-200">
              {email.category}
            </span>
          )}
        </h1>

        {/* Sender Info Row */}
        <div className="flex items-start justify-between w-full">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-600 font-semibold text-lg uppercase">
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
                <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-white shadow-sm text-sm grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-gray-600">
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

          <div className="flex items-center gap-3 text-gray-400">
            <span className="text-xs mr-2">{formatEmailDate(email.timestamp)}</span>
            <button 
              onClick={handleScrollToReply}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <Reply className="w-3.5 h-3.5" />
              Reply
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="More">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Summary Box */}
        {email.summary && (
          <div className="w-full my-2 bg-white border border-blue-200 rounded-xl px-5 py-4">
            <div className="text-sm font-semibold text-blue-600 mb-1">
              AI Summary
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">
              {email.summary}
            </p>
          </div>
        )}

        {/* Email Body */}
        <div className="w-full">
          {email.body_html ? (
            <div className="w-full pr-2 max-h-[50vh] overflow-y-auto">
              <iframe 
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                srcDoc={email.body_html} 
                className="w-full min-h-[60px] border-none bg-white" 
                title="Email Body"
                onLoad={(e) => {
                  const iframe = e.target as HTMLIFrameElement;
                  try {
                    iframe.style.height = '0px';
                    iframe.style.height = (iframe.contentWindow?.document.documentElement.scrollHeight || 60) + 'px';
                  } catch (e) {
                    // Ignore cross-origin errors if any
                  }
                }}
              />
            </div>
          ) : (
            <div className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed pr-2 max-h-[50vh] overflow-y-auto">
              {email.body_text || 'No content'}
            </div>
          )}
        </div>

        {/* Permanent Reply Section */}
        <div className="w-full mt-2 pb-12">
          <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden flex flex-col transition-all">
            {/* Header / Recipients Bar */}
            <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3 w-full">
                <CornerUpLeft className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="flex items-center flex-1 gap-2 flex-wrap">
                  <span className="text-sm text-gray-500 font-medium mr-1">To</span>
                  <div className="px-2 py-1 bg-white border border-gray-200 rounded-md text-sm text-gray-700 flex items-center gap-1 shadow-sm">
                    {email.sender_name || email.sender_email}
                  </div>
                  <button className="text-xs font-medium text-gray-500 hover:text-gray-800 ml-auto transition-colors">Cc / Bcc</button>
                </div>
              </div>
            </div>
            
            <textarea 
              ref={replyRef}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Write your reply..."
              className="w-full p-4 min-h-[200px] resize-y text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            
            <div className="p-3 bg-white flex justify-between items-center border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setDraftText("")}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors" 
                  title="Discard draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                {email.suggestedReply && (
                  <button 
                    onClick={() => setDraftText(email.suggestedReply!)}
                    className="flex items-center gap-2 px-3 py-1.5 ml-1 rounded-md bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-blue-600 text-sm font-medium transition-colors"
                  >
                    Help me write
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button 
                  onClick={handleSend}
                  disabled={isSending || !draftText.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50 shadow-sm mr-2"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : sendSuccess ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {isSending ? "Sending..." : sendSuccess ? "Sent!" : "Send"}
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors" title="Formatting options">
                  <Type className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors" title="Attach files">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors" title="Insert link">
                  <LinkIcon className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors" title="Insert photo">
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
