"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const [availableLabels, setAvailableLabels] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [isLabeling, setIsLabeling] = useState(false);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set());
  const [detectedCalendarEvent, setDetectedCalendarEvent] = useState<{
    created: boolean;
    summary?: string;
    fullTimeStr?: string;
    meetLink?: string;
    htmlLink?: string;
    inviteCardHtml?: string;
  } | null>(null);
  const [isDetectingCalendar, setIsDetectingCalendar] = useState(false);

  useEffect(() => {
    fetch('/api/mail/labels')
      .then(res => res.json())
      .then(data => {
        if (data.labels) {
          const userLabels = data.labels.filter((l: any) => l.type === 'user');
          setAvailableLabels(userLabels.map((l: any) => ({
            id: l.id,
            name: l.name,
            color: l.color?.backgroundColor || '#a855f7'
          })));
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
        body: JSON.stringify({ threadIds: email.google_thread_id ? [email.google_thread_id] : [], messageIds: email.id ? [email.id] : [], action: "modify", addLabelIds: [labelId] })
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
  const initializedEmailId = useRef<string | null>(null);

  // Initialize the "To" field whenever a new email is opened
  useEffect(() => {
    if (!email) {
      initializedEmailId.current = null;
      return;
    }
    // Inbox polling replaces the displayed message data when a new reply lands.
    // Keep the open draft intact; the thread refresh listener below updates the
    // conversation in place without reinitializing the composer.
    if (initializedEmailId.current === email.id) return;
    initializedEmailId.current = email.id;

    {
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
      setDetectedCalendarEvent(null);

      // Fetch full thread if google_thread_id is present
      const targetThreadId = email.google_thread_id;
      if (targetThreadId) {
        setIsLoadingThread(true);
        fetch(`/api/mail/thread?threadId=${encodeURIComponent(targetThreadId)}`)
          .then(res => res.json())
          .then(async (data) => {
            if (data.messages && Array.isArray(data.messages)) {
              setThreadMessages(data.messages);
              // Expand the latest message by default
              if (data.messages.length > 0) {
                const latest = data.messages[data.messages.length - 1];
                setExpandedMessageIds(new Set([latest.id]));
              }

              // Auto-detect calendar events in the background (non-blocking)
              // Combine all message snippets/bodies for better context
              const allText = data.messages
                .map((m: any) => `From: ${m.sender_name || m.sender_email || 'Unknown'}\n${m.body_text || m.snippet || ''}`)
                .join('\n\n---\n\n');

              setIsDetectingCalendar(true);
              fetch('/api/calendar/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  emailSubject: email.subject || '',
                  emailBody: allText,
                  recipientEmail: email.sender_email || '',
                  recipientName: email.sender_name || '',
                  replyText: '', // No reply — detecting from incoming email
                  dedupeKey: email.google_thread_id || email.google_message_id,
                })
              })
                .then(r => r.json())
                .then(calData => {
                  if (calData.created && calData.inviteCardHtml) {
                    setDetectedCalendarEvent(calData);
                  }
                })
                .catch(() => {}) // Silently fail — calendar is best-effort
                .finally(() => setIsDetectingCalendar(false));
            } else {
              setThreadMessages([]);
            }
          })
          .catch(err => {
            console.error("Failed to fetch thread messages:", err);
            setThreadMessages([]);
          })
          .finally(() => {
            setIsLoadingThread(false);
          });
      } else {
        setThreadMessages([]);
        // Still try calendar detection for single emails
        setIsDetectingCalendar(true);
        fetch('/api/calendar/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailSubject: email.subject || '',
            emailBody: email.body_text || email.snippet || '',
            recipientEmail: email.sender_email || '',
            recipientName: email.sender_name || '',
            replyText: '',
            dedupeKey: email.google_thread_id || email.google_message_id,
          })
        })
          .then(r => r.json())
          .then(calData => {
            if (calData.created && calData.inviteCardHtml) {
              setDetectedCalendarEvent(calData);
            }
          })
          .catch(() => {})
          .finally(() => setIsDetectingCalendar(false));
      }
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

  const refetchThread = useCallback(async () => {
    const threadId = email?.google_thread_id;
    if (!threadId) return;
    setIsLoadingThread(true);
    try {
      const res = await fetch(`/api/mail/thread?threadId=${encodeURIComponent(threadId)}`);
      const data = await res.json();
      if (data.messages && Array.isArray(data.messages)) {
        setThreadMessages(data.messages);
        // Auto-expand latest
        if (data.messages.length > 0) {
          const latest = data.messages[data.messages.length - 1];
          setExpandedMessageIds(new Set([latest.id]));
        }
      }
    } catch (err) {
      console.error("Failed to refetch thread:", err);
    } finally {
      setIsLoadingThread(false);
    }
  }, [email?.google_thread_id]);

  useEffect(() => {
    const threadId = email?.google_thread_id;
    if (!threadId) return;
    const handleThreadRefresh = (event: Event) => {
      const threadIds = (event as CustomEvent<{ threadIds?: string[] }>).detail?.threadIds || [];
      if (threadIds.includes(threadId)) void refetchThread();
    };
    window.addEventListener('refresh-open-thread', handleThreadRefresh);
    return () => window.removeEventListener('refresh-open-thread', handleThreadRefresh);
  }, [email?.google_thread_id, refetchThread]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      let outgoingBody = draftText;
      const fullThreadBody = threadMessages.length
        ? threadMessages.map((message) => `From: ${message.sender_name || message.sender_email || 'Unknown'}\n${message.body_text || message.snippet || ''}`).join('\n\n---\n\n')
        : email.body_text || email.snippet || '';
      const meetingContext = `${email.subject || ''} ${fullThreadBody} ${draftText}`;
      const isMeetingAcceptance =
        /\b(accept|agree|agreed|confirm|confirmed|yes|works for me|sounds good)\b/i.test(draftText) &&
        /\b(meeting|call|calendar|invite|appointment|availability|schedule|time)\b/i.test(meetingContext);
      // Check if a calendar invite should be created and embed it
      try {
        const calRes = await fetch("/api/calendar/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailSubject: email.subject || '',
            emailBody: fullThreadBody,
            recipientEmail: toText,
            recipientName: email.sender_name || '',
            attendeeEmails: [toText, ccText].filter(Boolean),
            replyText: draftText,
            dedupeKey: email.google_thread_id || email.google_message_id,
            threadId: email.google_thread_id,
            forceCreate: isMeetingAcceptance,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        });
        const calData = await calRes.json();
        if (!calRes.ok) throw new Error(calData.error || 'Google Calendar invite creation failed');
        if (calData.created && calData.inviteCardHtml) {
          outgoingBody = `${draftText}${calData.inviteCardHtml}`;
        } else if (isMeetingAcceptance) {
          throw new Error(calData.error || 'The meeting was accepted, but Google Calendar did not create an invite. The reply was not sent.');
        }
      } catch (calErr) {
        console.error("Calendar invite error:", calErr);
        if (isMeetingAcceptance) throw calErr;
      }

      // Determine the latest message's message_id_header for proper threading
      const latestMsg = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : null;
      const replyToMessageId = latestMsg?.message_id_header || email.message_id_header;
      const replyToReferences = latestMsg?.references_header || email.references_header;

      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: toText,
          ccEmail: ccText,
          bccEmail: bccText,
          subject: email.subject,
          body: outgoingBody,
          threadId: email.google_thread_id,
          messageId: replyToMessageId,
          references: replyToReferences
        }),
      });
      if (res.ok) {
        setSendSuccess(true);
        handleDiscard();
        setReplyMode(null);
        // Refetch thread to show the sent reply in the thread view
        setTimeout(async () => {
          setSendSuccess(false);
          await refetchThread();
          window.dispatchEvent(new CustomEvent('refresh-inbox'));
        }, 1500);
      } else {
        alert("Failed to send email");
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error sending email");
    } finally {
      setIsSending(false);
    }
  };

  const handleAction = async (action: 'trash' | 'archive' | 'unread') => {
    try {
      const body = action === 'unread'
        ? { messageIds: [email.id], action: 'modify', addLabelIds: ['UNREAD'] }
        : { messageIds: [email.id], action };
      const res = await fetch("/api/mail/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action} email`);
      }
      onClose();
      window.dispatchEvent(new CustomEvent('refresh-inbox'));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to perform action");
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
    <div className={`flex min-w-0 flex-col h-full bg-white dark:bg-[#161616] z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-1 rounded-tl-2xl ${isFullView ? 'border-l-0' : 'border-l border-gray-200 dark:border-white/10'}`}>
      
      {/* Header Toolbar */}
      <div className="h-[68px] px-5 flex items-center justify-between border-b border-gray-100 dark:border-white/5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => handleAction('archive')} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-full transition-colors" title="Archive">
            <Archive className="w-4 h-4" />
          </button>
          <button onClick={() => handleAction('trash')} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-full transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleAction('unread')} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-full transition-colors" title="Mark unread">
            <Mail className="w-4 h-4" />
          </button>
          {/* Label Button */}
          <div className="relative">
            <button 
              onClick={() => setShowLabelMenu(!showLabelMenu)} 
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-full transition-colors flex items-center gap-1.5" 
              title="Add Label in Gmail"
            >
              <Tag className="w-4 h-4" />
            </button>
            {showLabelMenu && (
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-[#161616] rounded-xl shadow-xl border border-gray-200 dark:border-white/10 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 border-b border-gray-100 dark:border-white/5 uppercase tracking-wider">
                  Apply Gmail Label
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  {availableLabels.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No custom labels in Gmail</div>
                  ) : (
                    availableLabels.map((lbl) => (
                      <button
                        key={lbl.id}
                        disabled={isLabeling}
                        onClick={() => handleApplyLabel(lbl.id)}
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#1c1c1c] dark:bg-[#1c1c1c] text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 truncate"
                      >
                        <span 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: lbl.color || '#a855f7' }}
                        />
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
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-full transition-colors"
              title={isFullView ? "Minimize" : "Full screen"}
            >
              {isFullView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#161616] p-6 lg:p-10 flex flex-col gap-6 relative">
        
        {/* Email Subject */}
        <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 leading-snug w-full">
          {email.subject}
          {email.category && (
            <span className={`ml-4 align-middle inline-block px-3 py-1 rounded-full text-xs font-semibold ${email.categoryColor ? colorMap[email.categoryColor] : 'bg-gray-100 dark:bg-[#202020] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10'}`}>
              {email.category}
            </span>
          )}
        </h1>

        {/* Thread header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {isLoadingThread ? (
                <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading thread...</span>
              ) : threadMessages.length > 0 ? (
                `${threadMessages.length} message${threadMessages.length !== 1 ? 's' : ''}`
              ) : (
                null
              )}
            </h2>
          </div>
          <button 
            onClick={() => { setReplyMode('reply'); setTimeout(() => { replyRef.current?.focus(); handleScrollToReply(); }, 50); }}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Reply className="w-3.5 h-3.5" />
            Reply
          </button>
        </div>

        {/* AI Overview Box */}
        {email.summary && (
          <div className="w-full bg-white dark:bg-[#161616] border border-blue-200 rounded-xl px-5 py-4">
            <div className="text-sm font-semibold text-blue-600 mb-1">AI Summary</div>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{email.summary}</p>
          </div>
        )}

        {/* Calendar Detection Indicator */}
        {isDetectingCalendar && !detectedCalendarEvent && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Checking for meeting details...</span>
          </div>
        )}

        {/* Auto-Detected Google Calendar Invite Card */}
        {detectedCalendarEvent?.created && detectedCalendarEvent.inviteCardHtml && (
          <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-emerald-700">📅 Calendar event auto-created</span>
              <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Google Calendar</span>
            </div>
            <div className="text-sm text-emerald-800 font-medium mb-1">{detectedCalendarEvent.summary}</div>
            {detectedCalendarEvent.fullTimeStr && (
              <div className="text-xs text-emerald-600 mb-3">{detectedCalendarEvent.fullTimeStr}</div>
            )}
            <div className="flex items-center gap-2">
              {detectedCalendarEvent.htmlLink && (
                <a
                  href={detectedCalendarEvent.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  View on Calendar
                </a>
              )}
              {detectedCalendarEvent.meetLink && (
                <a
                  href={detectedCalendarEvent.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#161616] border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  Join Google Meet
                </a>
              )}
              <button
                onClick={() => setDetectedCalendarEvent(null)}
                className="ml-auto text-xs text-emerald-500 hover:text-emerald-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Threaded Messages / Email Body */}
        {threadMessages.length > 0 ? (
          <div className="w-full flex flex-col gap-2">
            {threadMessages.map((msg, idx) => {
              const isLatest = idx === threadMessages.length - 1;
              const isExpanded = expandedMessageIds.has(msg.id);
              const isSent = msg.is_sent;
              const senderName = isSent ? 'You' : (msg.sender_name || msg.sender_email || 'Unknown');
              const senderEmail = isSent ? '' : msg.sender_email;
              const msgDate = msg.timestamp ? new Date(msg.timestamp) : null;
              const msgDateStr = msgDate && !isNaN(msgDate.getTime())
                ? msgDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                : (msg.timestamp || '');

              return (
                <div
                  key={msg.id}
                  className={`rounded-xl border transition-all ${isLatest ? 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#161616] shadow-sm' : 'border-gray-100 dark:border-white/5 bg-gray-50/50'}`}
                >
                  {/* Message Header – click to toggle expand/collapse */}
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none rounded-xl ${isExpanded ? 'rounded-b-none border-b border-gray-100 dark:border-white/5' : ''}`}
                    onClick={() => {
                      setExpandedMessageIds(prev => {
                        const next = new Set(prev);
                        if (next.has(msg.id)) { next.delete(msg.id); } else { next.add(msg.id); }
                        return next;
                      });
                    }}
                  >
                    <Avatar
                      name={isSent ? 'You' : (msg.sender_name || '')}
                      email={isSent ? '' : (msg.sender_email || '')}
                      size="sm"
                      className="w-8 h-8 flex-shrink-0 border border-gray-100 dark:border-white/5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-sm font-semibold ${isSent ? 'text-blue-700' : 'text-gray-900 dark:text-gray-100'}`}>
                          {senderName}
                        </span>
                        {isSent && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Sent</span>
                        )}
                        {!isSent && senderEmail && (
                          <span className="text-xs text-gray-400 truncate">&lt;{senderEmail}&gt;</span>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{msg.snippet || ''}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{msgDateStr}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Message Body */}
                  {isExpanded && (
                    <div className="px-4 py-4">
                      {msg.body_html ? (
                        <iframe
                          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                          srcDoc={msg.body_html}
                          className="w-full min-h-[60px] border-none bg-white dark:bg-[#161616]"
                          title={`Message from ${senderName}`}
                          onLoad={(e) => {
                            const iframe = e.target as HTMLIFrameElement;
                            try {
                              iframe.style.height = '0px';
                              iframe.style.height = (iframe.contentWindow?.document.documentElement.scrollHeight || 60) + 'px';
                            } catch (_) {}
                          }}
                        />
                      ) : (
                        <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                          {msg.body_text || msg.snippet || 'No content'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : !isLoadingThread ? (
          /* Fallback single-email view when thread couldn't load */
          <>
            <div className="flex items-start gap-4 w-full">
              <Avatar name={email.sender_name} email={email.sender_email} size="lg" className="w-10 h-10 shadow-xs border border-gray-100 dark:border-white/5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">{email.sender_name || email.sender_email}</span>
                  {email.sender_name && <span className="text-xs text-gray-500 dark:text-gray-400">&lt;{email.sender_email}&gt;</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{formatEmailDate(email.timestamp)}</div>
              </div>
            </div>
            <div className="w-full">
              {email.body_html ? (
                <iframe
                  sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                  srcDoc={email.body_html}
                  className="w-full min-h-[60px] border-none bg-white dark:bg-[#161616]"
                  title="Email Body"
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    try { iframe.style.height = '0px'; iframe.style.height = (iframe.contentWindow?.document.documentElement.scrollHeight || 60) + 'px'; } catch (_) {}
                  }}
                />
              ) : (
                <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {email.body_text || 'No content'}
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* Permanent Reply Section */}
        <div className="w-full mt-2 pb-12">
          
          {!replyMode ? (
            <div className="flex items-center gap-3 mt-4 mb-4">
              <button onClick={() => { setReplyMode('reply'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2 bg-gray-50 dark:bg-[#1c1c1c] hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] text-gray-700 dark:text-gray-300 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 dark:border-white/10 shadow-sm">
                <Reply className="w-4 h-4" /> Reply
              </button>
              <button onClick={() => { setReplyMode('replyAll'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2 bg-gray-50 dark:bg-[#1c1c1c] hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] text-gray-700 dark:text-gray-300 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 dark:border-white/10 shadow-sm">
                <ReplyAll className="w-4 h-4" /> Reply all
              </button>
              <button onClick={() => { setReplyMode('forward'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2 bg-gray-50 dark:bg-[#1c1c1c] hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] text-gray-700 dark:text-gray-300 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 dark:border-white/10 shadow-sm">
                <Forward className="w-4 h-4" /> Forward
              </button>
            </div>
          ) : (

            <div className="bg-white dark:bg-[#161616] rounded-xl border border-gray-300 dark:border-white/20 shadow-sm overflow-hidden flex flex-col transition-all relative">
              <button onClick={() => setReplyMode(null)} className="absolute top-3 right-3 p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-md z-10"><X className="w-4 h-4"/></button>
            {/* Header / Recipients Bar */}
            <div className="bg-white dark:bg-[#161616] px-4 py-3 border-b border-gray-200 dark:border-white/10 flex flex-col gap-2 transition-all">
              
              <div className="flex items-center gap-3 w-full mt-1">
                <CornerUpLeft className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium mr-1 w-6">To</span>
                <input 
                  type="text" 
                  value={toText}
                  onChange={(e) => setToText(e.target.value)}
                  placeholder="Recipients"
                  className="flex-1 px-2 py-1 border-none focus:outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                />
                {!showCcBcc && (
                  <button 
                    onClick={() => setShowCcBcc(true)}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 dark:text-gray-200 ml-auto transition-colors"
                  >
                    Cc / Bcc
                  </button>
                )}
              </div>

              {showCcBcc && (
                <>
                  <div className="flex items-center gap-3 w-full mt-1 border-t border-gray-50 pt-2">
                    <div className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium mr-1 w-6">Cc</span>
                    <input 
                      type="text" 
                      value={ccText}
                      onChange={(e) => setCcText(e.target.value)}
                      placeholder="Add Cc recipients"
                      className="flex-1 px-2 py-1 border-none focus:outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full border-t border-gray-50 pt-2 mt-1">
                    <div className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium mr-1 w-6">Bcc</span>
                    <input 
                      type="text" 
                      value={bccText}
                      onChange={(e) => setBccText(e.target.value)}
                      placeholder="Add Bcc recipients"
                      className="flex-1 px-2 py-1 border-none focus:outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="relative w-full bg-white dark:bg-[#161616]">
              {draftText.length === 0 && (
                <div className="absolute top-4 left-4 text-gray-400 pointer-events-none text-sm">
                  Write your reply...
                </div>
              )}
              <div 
                ref={replyRef}
                contentEditable
                onInput={(e) => setDraftText(e.currentTarget.innerHTML)}
                className="w-full p-4 min-h-[200px] text-sm text-gray-900 dark:text-gray-100 focus:outline-none overflow-y-auto"
              />
            </div>
            
            <div className="p-3 bg-white dark:bg-[#161616] flex justify-between items-center border-t border-gray-100 dark:border-white/5 relative">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDiscard}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-md transition-colors" 
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
                    className="flex items-center gap-2 px-3 py-1.5 ml-1 rounded-md bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/10 shadow-sm hover:bg-gray-50 dark:hover:bg-[#1c1c1c] dark:bg-[#1c1c1c] text-blue-600 text-sm font-medium transition-colors"
                  >
                    Help me write
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 relative">
                  
                  {/* Formatting Expanded Toolbar */}
                  {showFormatting && (
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10 rounded-md p-1 mr-2 animate-in fade-in slide-in-from-right-4 absolute right-full top-1/2 -translate-y-1/2">
                      <button onClick={() => applyFormat('bold')} className="p-1 text-gray-600 hover:bg-gray-200 dark:hover:bg-[#262626] dark:bg-[#262626] rounded transition-colors" title="Bold">
                        <Bold className="w-4 h-4" />
                      </button>
                      <button onClick={() => applyFormat('italic')} className="p-1 text-gray-600 hover:bg-gray-200 dark:hover:bg-[#262626] dark:bg-[#262626] rounded transition-colors" title="Italic">
                        <Italic className="w-4 h-4" />
                      </button>
                      <button onClick={() => applyFormat('underline')} className="p-1 text-gray-600 hover:bg-gray-200 dark:hover:bg-[#262626] dark:bg-[#262626] rounded transition-colors" title="Underline">
                        <Underline className="w-4 h-4" />
                      </button>
                      <button onClick={() => applyFormat('hiliteColor', 'yellow')} className="p-1 text-gray-600 hover:bg-gray-200 dark:hover:bg-[#262626] dark:bg-[#262626] rounded transition-colors" title="Highlight">
                        <Highlighter className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowFormatting(!showFormatting)}
                    className={`p-2 rounded-md transition-colors ${showFormatting ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020]'}`} 
                    title="Formatting options"
                  >
                    <Type className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-md transition-colors" title="Attach files">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-md transition-colors" title="Insert link">
                    <LinkIcon className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-md transition-colors" title="Insert photo">
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
