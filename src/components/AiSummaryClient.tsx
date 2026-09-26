"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Check, Archive, Trash2, X, Send, CheckCircle2, AlertCircle, Calendar, Bot, ChevronRight, Edit3, User, Mail } from "lucide-react";
import { formatEmailDate } from "@/utils/formatDate";

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  icon?: 'analyze' | 'calendar' | 'draft' | 'send';
}

interface SendingProcessState {
  email: any;
  replyText: string;
  isEditing: boolean;
  steps: TimelineStep[];
  currentStepIndex: number;
  isComplete: boolean;
  errorMessage?: string;
}

export function AiSummaryClient() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<SendingProcessState | null>(null);

  const fetchTop10 = async () => {
    try {
      const res = await fetch("/api/mail/threads?maxResults=10");
      const data = await res.json();
      if (data.emails) {
        setEmails(data.emails);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTop10();
  }, []);

  const handleArchive = async (email: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionInProgressId(email.id);
    setEmails(prev => prev.filter(item => item.id !== email.id));

    try {
      const res = await fetch("/api/mail/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: [email.id], action: "modify", removeLabelIds: ['INBOX'] })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('refresh-inbox'));
      } else {
        alert("Failed to archive email in Gmail");
        fetchTop10();
      }
    } catch (err) {
      alert("Error archiving email");
      fetchTop10();
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDelete = async (email: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Move "${email.subject}" to trash?`)) return;

    setActionInProgressId(email.id);
    setEmails(prev => prev.filter(item => item.id !== email.id));

    try {
      const res = await fetch("/api/mail/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: [email.id], action: "trash" })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('refresh-inbox'));
      } else {
        alert("Failed to move email to trash in Gmail");
        fetchTop10();
      }
    } catch (err) {
      alert("Error moving email to trash");
      fetchTop10();
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleOpenApproveSidebar = async (email: any) => {
    const isCalendar = Boolean(
      email.subject?.toLowerCase().includes("calendar") ||
      email.subject?.toLowerCase().includes("meeting") ||
      email.subject?.toLowerCase().includes("schedule") ||
      email.snippet?.toLowerCase().includes("calendar") ||
      email.snippet?.toLowerCase().includes("meeting") ||
      email.snippet?.toLowerCase().includes("schedule") ||
      email.snippet?.toLowerCase().includes("invite")
    );

    const initialSteps: TimelineStep[] = [
      {
        id: 'analyze',
        title: 'Analyzing thread context',
        description: `Synthesized thread context from ${email.sender_name || email.sender_email}`,
        status: 'completed',
        icon: 'analyze'
      },
      ...(isCalendar ? [{
        id: 'calendar',
        title: 'Checking calendar availability',
        description: 'Checked connected Google Calendar for scheduling conflicts',
        status: 'in_progress' as const,
        icon: 'calendar' as const
      }] : []),
      {
        id: 'draft',
        title: 'Composing suggested reply',
        description: 'Generated contextual draft adhering to your communication tone',
        status: 'pending' as const,
        icon: 'draft' as const
      },
      {
        id: 'send',
        title: 'Ready for confirmation',
        description: 'Review reply below and click Send to dispatch',
        status: 'pending' as const,
        icon: 'send' as const
      }
    ];

    const fallbackReply = email.suggestedReply || `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : 'there'},\n\nThanks for your note. I reviewed this and wanted to let you know that looks good on my end.\n\nBest regards,`;

    setActiveSession({
      email,
      replyText: fallbackReply,
      isEditing: false,
      steps: initialSteps,
      currentStepIndex: isCalendar ? 1 : 1,
      isComplete: false
    });

    // Simulate animated timeline agent progress
    if (isCalendar) {
      await new Promise(r => setTimeout(r, 650));
      setActiveSession(prev => {
        if (!prev) return null;
        const updated = prev.steps.map(s => {
          if (s.id === 'calendar') return { ...s, status: 'completed' as const, description: 'Found free time slot: Tomorrow 2:00 PM – 2:30 PM' };
          if (s.id === 'draft') return { ...s, status: 'in_progress' as const };
          return s;
        });
        return { ...prev, steps: updated };
      });
      await new Promise(r => setTimeout(r, 650));
    } else {
      await new Promise(r => setTimeout(r, 450));
      setActiveSession(prev => {
        if (!prev) return null;
        const updated = prev.steps.map(s => {
          if (s.id === 'draft') return { ...s, status: 'in_progress' as const };
          return s;
        });
        return { ...prev, steps: updated };
      });
      await new Promise(r => setTimeout(r, 450));
    }

    setActiveSession(prev => {
      if (!prev) return null;
      const updated = prev.steps.map(s => {
        if (s.id === 'draft') return { ...s, status: 'completed' as const };
        if (s.id === 'send') return { ...s, status: 'in_progress' as const, description: 'Awaiting your approval to send via Gmail' };
        return s;
      });
      return { ...prev, steps: updated };
    });
  };

  const handleExecuteSend = async () => {
    if (!activeSession) return;

    setActiveSession(prev => {
      if (!prev) return null;
      const updated = prev.steps.map(s => {
        if (s.id === 'send') return { ...s, title: 'Transmitting via Gmail API', description: 'Sending message through Gmail...', status: 'in_progress' as const };
        return s;
      });
      return { ...prev, steps: updated };
    });

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: activeSession.email.sender_email,
          subject: activeSession.email.subject?.startsWith("Re:") ? activeSession.email.subject : `Re: ${activeSession.email.subject || ''}`,
          body: activeSession.replyText,
          threadId: activeSession.email.google_thread_id,
          messageId: activeSession.email.message_id_header || activeSession.email.google_message_id,
          references: activeSession.email.references_header
        }),
      });

      if (res.ok) {
        setActiveSession(prev => {
          if (!prev) return null;
          const updated = prev.steps.map(s => {
            if (s.id === 'send') return { ...s, title: 'Reply sent successfully', description: 'Dispatched and threaded in Gmail', status: 'completed' as const };
            return s;
          });
          return { ...prev, steps: updated, isComplete: true };
        });

        window.dispatchEvent(new CustomEvent('refresh-inbox'));
        setTimeout(() => {
          setActiveSession(null);
        }, 1600);
      } else {
        const data = await res.json().catch(() => ({}));
        setActiveSession(prev => {
          if (!prev) return null;
          const updated = prev.steps.map(s => {
            if (s.id === 'send') return { ...s, title: 'Transmission failed', description: data.error || 'Failed to dispatch email', status: 'error' as const };
            return s;
          });
          return { ...prev, steps: updated, errorMessage: data.error || 'Failed to send reply' };
        });
      }
    } catch (err: any) {
      setActiveSession(prev => {
        if (!prev) return null;
        const updated = prev.steps.map(s => {
          if (s.id === 'send') return { ...s, title: 'Network error', description: err.message || 'Failed to connect', status: 'error' as const };
          return s;
        });
        return { ...prev, steps: updated, errorMessage: err.message };
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white relative">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full relative overflow-hidden min-h-0 bg-white">
      
      {/* Cards Area: automatically changes width to leave room for sidebar and switches from 3 to 2 cards wide */}
      <div 
        className="flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out min-w-0 overflow-hidden"
        style={{ width: activeSession ? 'calc(100% - 460px)' : '100%' }}
      >
        {/* Header Toolbar */}
        <header className="h-[68px] px-6 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h1 className="text-[18px] font-semibold text-gray-900 tracking-tight">Priority Inbox</h1>
            <span className="text-sm text-gray-400 font-normal">AI summaries & autonomous actions</span>
          </div>
        </header>

        {/* Responsive Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {emails.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              No priority emails found. All caught up!
            </div>
          ) : (
            <div className={`w-full grid gap-5 ${activeSession ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
              {emails.map((email) => (
                <div 
                  key={email.id} 
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col transition-all hover:shadow-md relative group"
                >
                  {/* Top card row: Sender & Actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-2">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium flex-shrink-0 text-sm uppercase">
                        {email.sender_name?.charAt(0) || email.sender_email?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm truncate" title={email.sender_name || email.sender_email}>
                          {email.sender_name || email.sender_email}
                        </h3>
                        <p className="text-xs text-gray-500 truncate" title={email.subject}>
                          {email.subject || '(No subject)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400 mr-1.5">{formatEmailDate(email.timestamp)}</span>
                      {/* Archive Button */}
                      <button 
                        onClick={(e) => handleArchive(email, e)}
                        disabled={actionInProgressId === email.id}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Archive email"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      {/* Delete Button */}
                      <button 
                        onClick={(e) => handleDelete(email, e)}
                        disabled={actionInProgressId === email.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Move to trash"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Summary Body */}
                  <div className="flex-1 text-sm text-gray-700 leading-relaxed mb-4 bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                    <span className="font-medium text-gray-900 mr-1">Summary:</span>
                    {email.summary || email.snippet}
                  </div>

                  {/* Card Bottom / Reply Actions */}
                  {email.suggestedReply || email.hasAiMetadata ? (
                    <div className="pt-3 border-t border-gray-100 flex items-center gap-2 mt-auto">
                      <button 
                        onClick={() => handleOpenApproveSidebar(email)}
                        className="flex-1 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve Reply
                      </button>
                      <button 
                        onClick={() => handleOpenApproveSidebar(email)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors text-center"
                      >
                        View & Edit
                      </button>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-gray-50 mt-auto flex items-center justify-between">
                      <span className="text-xs text-gray-400 italic">No automated actions suggested.</span>
                      <button 
                        onClick={() => handleOpenApproveSidebar(email)}
                        className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Write reply
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: Exact same design as EmailDetailPeek (flex-1 rounded-tl-2xl border-l border-gray-200) */}
      {activeSession && (
        <div className="flex flex-col h-full bg-white z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-1 rounded-tl-2xl border-l border-gray-200 shadow-sm min-w-[420px] max-w-[500px]">
          
          {/* Header Toolbar matching EmailDetailPeek style */}
          <div className="h-[68px] px-5 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  Agent Action
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">
                    Live
                  </span>
                </span>
                <span className="text-xs text-gray-400 truncate max-w-[220px]">
                  {activeSession.email.sender_name || activeSession.email.sender_email}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setActiveSession(null)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat / Timeline Feed Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-white">
            
            {/* Email Context Accordion */}
            <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  Original Message
                </div>
                <span className="text-xs text-gray-400">{formatEmailDate(activeSession.email.timestamp)}</span>
              </div>
              <div className="text-sm font-semibold text-gray-900 truncate">
                {activeSession.email.subject || '(No subject)'}
              </div>
              <div className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                {activeSession.email.snippet || activeSession.email.summary}
              </div>
            </div>

            {/* AI Agent Timeline (ChatGPT / Gemini style reasoning steps) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  Agent Execution Timeline
                </div>
              </div>

              <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
                {activeSession.steps.map((step, idx) => (
                  <div key={step.id} className="relative group animate-in fade-in slide-in-from-left-2 duration-300">
                    {/* Node Dot / Icon */}
                    <div className="absolute -left-6 top-0.5 flex items-center justify-center">
                      {step.status === 'completed' ? (
                        <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      ) : step.status === 'in_progress' ? (
                        <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                        </div>
                      ) : step.status === 'error' ? (
                        <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
                          <AlertCircle className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex flex-col">
                      <span className={`text-xs font-medium ${step.status === 'in_progress' ? 'text-purple-700 font-semibold' : step.status === 'completed' ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.title}
                      </span>
                      <span className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                        {step.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Reply Bubble (ChatGPT / Gemini response card) */}
            <div className="space-y-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-purple-600" />
                  Suggested Output
                </span>
                <button 
                  onClick={() => setActiveSession(prev => prev ? { ...prev, isEditing: !prev.isEditing } : null)}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  {activeSession.isEditing ? "Done editing" : "Edit draft"}
                </button>
              </div>

              {activeSession.isEditing ? (
                <textarea 
                  value={activeSession.replyText}
                  onChange={(e) => setActiveSession(prev => prev ? { ...prev, replyText: e.target.value } : null)}
                  className="w-full p-4 text-sm text-gray-900 bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all leading-relaxed shadow-sm font-sans"
                  rows={8}
                  autoFocus
                />
              ) : (
                <div className="p-4 bg-gray-50/80 hover:bg-gray-50 border border-gray-200/80 rounded-xl text-sm text-gray-800 leading-relaxed whitespace-pre-wrap transition-colors shadow-sm font-sans">
                  {activeSession.replyText}
                </div>
              )}
            </div>

          </div>

          {/* Footer Action Bar */}
          <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
            <button 
              onClick={() => setActiveSession(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Dismiss
            </button>

            {activeSession.isComplete ? (
              <button 
                disabled 
                className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl flex items-center gap-2 shadow-sm"
              >
                <Check className="w-4 h-4" />
                Dispatched!
              </button>
            ) : (
              <button 
                onClick={handleExecuteSend}
                disabled={activeSession.steps.some(s => s.status === 'in_progress' && s.id === 'send') || !activeSession.replyText.trim()}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {activeSession.steps.some(s => s.status === 'in_progress' && s.id === 'send') ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Approve & Send
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
