"use client";

import { useState, useRef, useEffect } from "react";
import { X, Reply, ReplyAll, Forward, Check, Send, Loader2, Maximize2, Minimize2, Archive, Trash2, Mail, Clock, MoreVertical, CornerUpLeft, CornerUpRight, ChevronDown, Sparkles, Type, Paperclip, Link as LinkIcon, Image as ImageIcon, Bold, Italic, Underline, Highlighter, Tag } from "lucide-react";
import { formatEmailDate } from "@/utils/formatDate";
import { useAccountDataStore } from "@/lib/client/store";
import { Avatar } from "@/components/Avatar";

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
    categoryColor?: string;
    suggestedReply?: string;
    to_email?: string;
    cc?: string;
    bcc?: string;
    message_id_header?: string;
    references_header?: string;
  } | null;
  onClose: () => void;
  onExpand?: () => void;
  isFullView?: boolean;
}

export function EmailDetailPeek({ email, onClose, onExpand, isFullView = false }: EmailDetailPeekProps) {
  const [draftText, setDraftText] = useState("");
  const { signatureEnabled, signatureText, snippets } = useAccountDataStore();
  const [showSnippets, setShowSnippets] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [toText, setToText] = useState("");
  const [ccText, setCcText] = useState("");
  const [bccText, setBccText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply'|'replyAll'|'forward'|null>(null);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<Array<{ id: string; name: string }>>([]);
  const [isLabeling, setIsLabeling] = useState(false);

  useEffect(() => {
    fetch('/api/mail/labels')
      .then(res => res.json())
      .then(data => {
        if (data.labels) {
          const userLabels = data.labels.filter((l: any) => l.type === 'user');
          setAvailableLabels(userLabels);
        }
      })
      .catch(console.error);
  }, []);

  const handleApplyLabel = async (labelId: string) => {
    if (!email) return;
    setIsLabeling(true);
    try {
      const res = await fetch("/api/mail/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: [email.id], action: "modify", addLabelIds: [labelId] })
      });
      if (res.ok) {
        setShowLabelMenu(false);
        window.dispatchEvent(new CustomEvent('refresh-inbox'));
      } else {
        const err = await res.json().catch(() => ({}));
        alert("Failed to apply label in Gmail: " + (err.error || "Unknown error"));
      }
    } catch (e: any) {
      alert("Error applying label: " + e.message);
    } finally {
      setIsLabeling(false);
    }
  };
  const [showDetails, setShowDetails] = useState(false);
  
  const replyRef = useRef<HTMLDivElement>(null);

  // Initialize the "To" field whenever a new email is opened
  useEffect(() => {
    if (email) {
      setToText(email.sender_email || "");
      if (replyRef.current) {
        replyRef.current.innerHTML = "";
      }
      setDraftText("");
      if (signatureEnabled) {
        setDraftText("<br><br><div>" + signatureText.replace(/\n/g, '<br>') + "</div>");
        if (replyRef.current) replyRef.current.innerHTML = "<br><br><div>" + signatureText.replace(/\n/g, '<br>') + "</div>";
      }
      setCcText("");
      setBccText("");
      setShowCcBcc(false);
      setShowFormatting(false);
    }
  }, [email]);

  
  useEffect(() => {
    const handleFocusReply = () => {
      replyRef.current?.focus();
      handleScrollToReply();
    };
    const handleArchive = () => handleAction('archive');
    const handleTrash = () => handleAction('trash');

    window.addEventListener('focus-reply', handleFocusReply);
    window.addEventListener('shortcut-archive', handleArchive);
    window.addEventListener('shortcut-trash', handleTrash);
    
    return () => {
      window.removeEventListener('focus-reply', handleFocusReply);
      window.removeEventListener('shortcut-archive', handleArchive);
      window.removeEventListener('shortcut-trash', handleTrash);
    };
  }, [email]);


  if (!email) return null;

  const handleScrollToReply = () => {
    replyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      replyRef.current?.focus();
    }, 300);
  };

  const handleDiscard = () => {
    setDraftText("");
    if (replyRef.current) replyRef.current.innerHTML = "";
    setToText(email.sender_email || "");
    setCcText("");
    setBccText("");
    setShowCcBcc(false);
    setShowFormatting(false);
  };

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    replyRef.current?.focus();
    if (replyRef.current) setDraftText(replyRef.current.innerHTML);
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: toText,
          ccEmail: ccText,
          bccEmail: bccText,
          subject: email.subject,
          body: draftText, // now sends raw HTML
          threadId: email.google_thread_id,
          messageId: email.message_id_header,
          references: email.references_header
        }),
      });
      if (res.ok) {
        setSendSuccess(true);
        setTimeout(() => {
          setSendSuccess(false);
          handleDiscard();
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

  const handleAction = async (action: 'trash' | 'archive' | 'unread') => {
    try {
      onClose(); // Optimistically close
      window.dispatchEvent(new CustomEvent('refresh-inbox')); // Force refresh

      if (action === 'trash') {
        await fetch("/api/mail/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: [email.id], action: "trash" })
        });
      } else if (action === 'archive') {
        await fetch("/api/mail/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: [email.id], action: "modify", removeLabelIds: ['INBOX'] })
        });
      } else if (action === 'unread') {
        await fetch("/api/mail/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: [email.id], action: "modify", addLabelIds: ['UNREAD'] })
        });
      }
    } catch (e) {
      alert("Failed to perform action");
    }
  };

  const fullDate = new Date(email.timestamp);
  const formattedFullDate = isNaN(fullDate.getTime()) ? email.timestamp : fullDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700 border border-blue-200",
    pink: "bg-pink-100 text-pink-700 border border-pink-200",
    purple: "bg-purple-100 text-purple-700 border border-purple-200",
    red: "bg-red-100 text-red-700 border border-red-200",
    green: "bg-green-100 text-green-700 border border-green-200",
    orange: "bg-orange-100 text-orange-700 border border-orange-200",
    yellow: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    teal: "bg-teal-100 text-teal-700 border border-teal-200",
  };

  return (
    <div className={`flex flex-col h-full bg-white z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-1 rounded-tl-2xl ${isFullView ? 'border-l-0' : 'border-l border-gray-200'}`}>
      
      {/* Header Toolbar */}
      <div className="h-[68px] px-5 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => handleAction('archive')} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors" title="Archive">
            <Archive className="w-4 h-4" />
          </button>
          <button onClick={() => handleAction('trash')} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleAction('unread')} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors" title="Mark unread">
            <Mail className="w-4 h-4" />
          </button>
          {/* Label Button */}
          <div className="relative">
            <button 
              onClick={() => setShowLabelMenu(!showLabelMenu)} 
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1.5" 
              title="Add Label in Gmail"
            >
              <Tag className="w-4 h-4" />
            </button>
            {showLabelMenu && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                  Apply Gmail Label
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  {availableLabels.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">No custom labels in Gmail</div>
                  ) : (
                    availableLabels.map((lbl) => (
                      <button
                        key={lbl.id}
                        disabled={isLabeling}
                        onClick={() => handleApplyLabel(lbl.id)}
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2 truncate"
                      >
                        <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                        <span className="truncate">{lbl.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
            <span className={`ml-4 align-middle inline-block px-3 py-1 rounded-full text-xs font-semibold ${email.categoryColor ? colorMap[email.categoryColor] : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
              {email.category}
            </span>
          )}
        </h1>

        {/* Sender Info Row */}
        <div className="flex items-start justify-between w-full">
          <div className="flex gap-4">
            <Avatar 
              name={email.sender_name} 
              email={email.sender_email} 
              size="lg" 
              className="w-10 h-10 shadow-xs border border-gray-100" 
            />
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

        {/* AI Overview Box */}
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
          
          {!replyMode ? (
            <div className="flex items-center gap-3 mt-4 mb-4">
              <button onClick={() => { setReplyMode('reply'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 shadow-sm">
                <Reply className="w-4 h-4" /> Reply
              </button>
              <button onClick={() => { setReplyMode('replyAll'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 shadow-sm">
                <ReplyAll className="w-4 h-4" /> Reply all
              </button>
              <button onClick={() => { setReplyMode('forward'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 shadow-sm">
                <Forward className="w-4 h-4" /> Forward
              </button>
            </div>
          ) : (

            <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden flex flex-col transition-all relative">
              <button onClick={() => setReplyMode(null)} className="absolute top-3 right-3 p-1 text-gray-400 hover:bg-gray-100 rounded-md z-10"><X className="w-4 h-4"/></button>
            {/* Header / Recipients Bar */}
            <div className="bg-white px-4 py-3 border-b border-gray-200 flex flex-col gap-2 transition-all">
              
              <div className="flex items-center gap-3 w-full mt-1">
                <CornerUpLeft className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-500 font-medium mr-1 w-6">To</span>
                <input 
                  type="text" 
                  value={toText}
                  onChange={(e) => setToText(e.target.value)}
                  placeholder="Recipients"
                  className="flex-1 px-2 py-1 border-none focus:outline-none text-sm text-gray-900 placeholder:text-gray-400"
                />
                {!showCcBcc && (
                  <button 
                    onClick={() => setShowCcBcc(true)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800 ml-auto transition-colors"
                  >
                    Cc / Bcc
                  </button>
                )}
              </div>

              {showCcBcc && (
                <>
                  <div className="flex items-center gap-3 w-full mt-1 border-t border-gray-50 pt-2">
                    <div className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm text-gray-500 font-medium mr-1 w-6">Cc</span>
                    <input 
                      type="text" 
                      value={ccText}
                      onChange={(e) => setCcText(e.target.value)}
                      placeholder="Add Cc recipients"
                      className="flex-1 px-2 py-1 border-none focus:outline-none text-sm text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full border-t border-gray-50 pt-2 mt-1">
                    <div className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm text-gray-500 font-medium mr-1 w-6">Bcc</span>
                    <input 
                      type="text" 
                      value={bccText}
                      onChange={(e) => setBccText(e.target.value)}
                      placeholder="Add Bcc recipients"
                      className="flex-1 px-2 py-1 border-none focus:outline-none text-sm text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="relative w-full bg-white">
              {draftText.length === 0 && (
                <div className="absolute top-4 left-4 text-gray-400 pointer-events-none text-sm">
                  Write your reply...
                </div>
              )}
              <div 
                ref={replyRef}
                contentEditable
                onInput={(e) => setDraftText(e.currentTarget.innerHTML)}
                className="w-full p-4 min-h-[200px] text-sm text-gray-900 focus:outline-none overflow-y-auto"
              />
            </div>
            
            <div className="p-3 bg-white flex justify-between items-center border-t border-gray-100 relative">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDiscard}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors" 
                  title="Discard draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                {email.suggestedReply && (
                  <button 
                    onClick={() => {
                      if (replyRef.current) {
                        replyRef.current.innerHTML = email.suggestedReply!;
                        setDraftText(email.suggestedReply!);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 ml-1 rounded-md bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-blue-600 text-sm font-medium transition-colors"
                  >
                    Help me write
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 relative">
                  
                  {/* Formatting Expanded Toolbar */}
                  {showFormatting && (
                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md p-1 mr-2 animate-in fade-in slide-in-from-right-4 absolute right-full top-1/2 -translate-y-1/2">
                      <button onClick={() => applyFormat('bold')} className="p-1 text-gray-600 hover:bg-gray-200 rounded transition-colors" title="Bold">
                        <Bold className="w-4 h-4" />
                      </button>
                      <button onClick={() => applyFormat('italic')} className="p-1 text-gray-600 hover:bg-gray-200 rounded transition-colors" title="Italic">
                        <Italic className="w-4 h-4" />
                      </button>
                      <button onClick={() => applyFormat('underline')} className="p-1 text-gray-600 hover:bg-gray-200 rounded transition-colors" title="Underline">
                        <Underline className="w-4 h-4" />
                      </button>
                      <button onClick={() => applyFormat('hiliteColor', 'yellow')} className="p-1 text-gray-600 hover:bg-gray-200 rounded transition-colors" title="Highlight">
                        <Highlighter className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowFormatting(!showFormatting)}
                    className={`p-2 rounded-md transition-colors ${showFormatting ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`} 
                    title="Formatting options"
                  >
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
                
                <button 
                  onClick={handleSend}
                  disabled={isSending || !draftText.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50 shadow-sm mr-2"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : sendSuccess ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {isSending ? "Sending..." : sendSuccess ? "Sent!" : "Send"}
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
