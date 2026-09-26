"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Check, Trash2, X, Send, Bot, User, Edit3, MessageSquare, EyeOff, MinusCircle } from "lucide-react";
import { formatEmailDate } from "@/utils/formatDate";

interface AgentThought {
  id: string;
  text: string;
  status: 'working' | 'done';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  content?: string;
  isInitial?: boolean;
  thoughts?: AgentThought[];
  isThinking?: boolean;
  suggestedReply?: string;
  isDelivered?: boolean;
}

interface AgentSession {
  id: string; // email.id
  email: any;
  draftReply: string;
  isEditingDraft: boolean;
  status: 'idle' | 'working' | 'ready' | 'sending' | 'sent';
  messages: ChatMessage[];
}

interface SmartAction {
  label: string;
  reply: string;
  style: 'primary' | 'secondary';
}

function computeSmartActions(email: any): SmartAction[] {
  const text = `${email.subject || ''} ${email.snippet || ''} ${email.summary || ''}`.toLowerCase();
  const actions: SmartAction[] = [];

  const timeMatches = text.match(/\b(1[0-2]|[1-9])(?::[0-5][0-9])?\s*(?:am|pm)\b/gi);
  const dayMatches = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/gi);

  if (text.includes("reschedule") || text.includes("postpone")) {
    actions.push({
      label: "Propose new time",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nThanks for your note. Could we reschedule for later this week or early next week? Let me know what times work best for you.\n\nBest regards,`,
      style: "primary"
    });
    actions.push({
      label: "Decline request",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nThank you for letting me know. Unfortunately, I won't be able to reschedule at this time.\n\nBest regards,`,
      style: "secondary"
    });
  } else if (timeMatches && timeMatches.length > 0) {
    const timeStr = timeMatches[0].toUpperCase();
    const dayStr = dayMatches && dayMatches.length > 0 ? ` on ${dayMatches[0].charAt(0).toUpperCase() + dayMatches[0].slice(1).toLowerCase()}` : '';
    
    actions.push({
      label: `Accept ${timeStr}${dayStr}`,
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\n${timeStr}${dayStr} works great for me. I've marked it down on my calendar.\n\nBest regards,`,
      style: "primary"
    });

    if (timeMatches.length > 1) {
      const altTime = timeMatches[1].toUpperCase();
      actions.push({
        label: `Accept ${altTime}`,
        reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\n${altTime} works best for my schedule. Looking forward to speaking then.\n\nBest regards,`,
        style: "primary"
      });
    }

    actions.push({
      label: "Decline meeting",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nThank you for the invitation, but unfortunately I have a scheduling conflict and cannot make this time.\n\nBest regards,`,
      style: "secondary"
    });
  } else if (text.includes("proposal") || text.includes("project") || text.includes("contract") || text.includes("agreement")) {
    actions.push({
      label: "Accept project proposal",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nThank you for sharing the proposal. Everything looks great to me—let's proceed with the project.\n\nBest regards,`,
      style: "primary"
    });
    actions.push({
      label: "Request revisions",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nThanks for sending this over. I reviewed the details and would like to suggest a few minor revisions before finalizing.\n\nBest regards,`,
      style: "secondary"
    });
    actions.push({
      label: "Decline proposal",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nThank you for sending this over. After consideration, we will not be moving forward with this at this time.\n\nBest regards,`,
      style: "secondary"
    });
  } else if (text.includes("invoice") || text.includes("receipt") || text.includes("payment") || text.includes("bill")) {
    actions.push({
      label: "Confirm payment received",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nConfirming that this has been received and processed. Thank you!\n\nBest regards,`,
      style: "primary"
    });
    actions.push({
      label: "Forward to finance",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nReceived with thanks. I have forwarded this to our finance team for settlement.\n\nBest regards,`,
      style: "secondary"
    });
  } else if (text.includes("?") || text.includes("let me know") || text.includes("what do you think") || text.includes("can you")) {
    actions.push({
      label: "Looks good, approved",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nI reviewed this and everything looks good on my end. Please feel free to proceed.\n\nBest regards,`,
      style: "primary"
    });
    actions.push({
      label: "Will follow up shortly",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nThanks for reaching out! I'm looking into this and will follow up with you shortly.\n\nBest regards,`,
      style: "secondary"
    });
  } else {
    actions.push({
      label: "Acknowledge & Thank",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nThanks for the update, much appreciated!\n\nBest regards,`,
      style: "primary"
    });
    actions.push({
      label: "Confirm received",
      reply: `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : ''},\n\nConfirming receipt of this information. Will review and follow up if needed.\n\nBest regards,`,
      style: "secondary"
    });
  }

  return actions.slice(0, 3);
}

export function AiSummaryClient() {
  const [emails, setEmails] = useState<any[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Background active agent indicators
  const [backgroundTasks, setBackgroundTasks] = useState<Array<{ id: string; subject: string; status: string }>>([]);

  // Multi-chat management
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [userPromptInput, setUserPromptInput] = useState("");

  const fetchEmails = async (token?: string) => {
    try {
      const url = token 
        ? `/api/mail/threads?maxResults=10&pageToken=${token}`
        : "/api/mail/threads?maxResults=10";
      const res = await fetch(url);
      const data = await res.json();
      if (data.emails) {
        if (token) {
          setEmails(prev => [...prev, ...data.emails]);
        } else {
          setEmails(data.emails);
        }
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleLoadMore = () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    fetchEmails(nextPageToken);
  };

  // Remove from priority inbox without modifying Gmail labels/archive
  const handleDismissFromPriority = (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmails(prev => prev.filter(item => item.id !== emailId));
  };

  const handleDelete = async (email: any, e: React.MouseEvent) => {
    e.stopPropagation();
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Auto-reply directly in background when clicking smart action buttons
  const handleAutoReplyAction = async (email: any, action: SmartAction) => {
    const taskId = Math.random().toString();
    const taskSubject = action.label;

    // Add task to corner indicator
    setBackgroundTasks(prev => [...prev, { id: taskId, subject: taskSubject, status: 'Drafting & Sending' }]);
    // Optimistically remove card from priority inbox view
    setEmails(prev => prev.filter(item => item.id !== email.id));

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: email.sender_email,
          subject: email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject || ''}`,
          body: action.reply,
          threadId: email.google_thread_id,
          messageId: email.message_id_header || email.google_message_id,
          references: email.references_header
        }),
      });

      if (res.ok) {
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Sent' } : t));
        window.dispatchEvent(new CustomEvent('refresh-inbox'));
        setTimeout(() => {
          setBackgroundTasks(prev => prev.filter(t => t.id !== taskId));
        }, 3000);
      } else {
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Failed' } : t));
        setTimeout(() => {
          setBackgroundTasks(prev => prev.filter(t => t.id !== taskId));
        }, 4000);
      }
    } catch (err) {
      setBackgroundTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  // Open the interactive Zero AI reply chat sidebar
  const handleOpenAiReplySidebar = (email: any) => {
    const existing = sessions.find(s => s.id === email.id);
    if (existing) {
      setActiveSessionId(email.id);
      return;
    }

    const isCalendar = Boolean(
      email.subject?.toLowerCase().includes("calendar") ||
      email.subject?.toLowerCase().includes("meeting") ||
      email.subject?.toLowerCase().includes("schedule") ||
      email.snippet?.toLowerCase().includes("calendar") ||
      email.snippet?.toLowerCase().includes("meeting") ||
      email.snippet?.toLowerCase().includes("schedule") ||
      email.snippet?.toLowerCase().includes("invite")
    );

    const initialThoughts: AgentThought[] = [
      { id: '1', text: 'Reading email & understanding thread history', status: 'working' },
      ...(isCalendar ? [{ id: '2', text: 'Checking calendar for conflicts & availability', status: 'working' as const }] : []),
      { id: '3', text: 'Drafting tailored professional response', status: 'working' as const },
    ];

    const fallbackDraft = email.suggestedReply || `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : 'there'},\n\nThank you for reaching out. I have reviewed your note and everything looks good on my end.\n\nBest regards,`;

    const newSession: AgentSession = {
      id: email.id,
      email,
      draftReply: fallbackDraft,
      isEditingDraft: false,
      status: 'working',
      messages: [
        {
          id: 'm1',
          sender: 'user',
          content: `Review "${email.subject || 'this email'}" and prepare suggested reply`,
          isInitial: true
        },
        {
          id: 'm2',
          sender: 'agent',
          isThinking: true,
          thoughts: initialThoughts,
          suggestedReply: undefined
        }
      ]
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(email.id);

    setTimeout(() => {
      setSessions(prev => prev.map(s => {
        if (s.id !== email.id) return s;
        return {
          ...s,
          messages: s.messages.map(m => {
            if (m.id === 'm2' && m.thoughts) {
              return {
                ...m,
                thoughts: m.thoughts.map((t, idx) => idx === 0 ? { ...t, status: 'done' as const } : t)
              };
            }
            return m;
          })
        };
      }));
    }, 700);

    setTimeout(() => {
      setSessions(prev => prev.map(s => {
        if (s.id !== email.id) return s;
        return {
          ...s,
          messages: s.messages.map(m => {
            if (m.id === 'm2' && m.thoughts) {
              return {
                ...m,
                thoughts: m.thoughts.map((t) => ({ ...t, status: 'done' as const }))
              };
            }
            return m;
          })
        };
      }));
    }, 1400);

    setTimeout(() => {
      setSessions(prev => prev.map(s => {
        if (s.id !== email.id) return s;
        return {
          ...s,
          status: 'ready',
          messages: s.messages.map(m => {
            if (m.id === 'm2') {
              return {
                ...m,
                isThinking: false,
                suggestedReply: fallbackDraft
              };
            }
            return m;
          })
        };
      }));
    }, 2000);
  };

  const handleCloseSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== sessionId);
    setSessions(filtered);
    if (activeSessionId === sessionId) {
      setActiveSessionId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
    }
  };

  const handleSendReply = async (session: AgentSession) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== session.id) return s;
      return {
        ...s,
        status: 'sending',
        messages: [
          ...s.messages,
          {
            id: 'm_send',
            sender: 'agent',
            isThinking: true,
            thoughts: [
              { id: 's1', text: 'Validating RFC 2822 In-Reply-To headers', status: 'working' },
              { id: 's2', text: 'Transmitting via Gmail API', status: 'working' }
            ]
          }
        ]
      };
    }));

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: session.email.sender_email,
          subject: session.email.subject?.startsWith("Re:") ? session.email.subject : `Re: ${session.email.subject || ''}`,
          body: session.draftReply,
          threadId: session.email.google_thread_id,
          messageId: session.email.message_id_header || session.email.google_message_id,
          references: session.email.references_header
        }),
      });

      if (res.ok) {
        // Automatically remove the email from the priority inbox without deleting it
        setEmails(prev => prev.filter(item => item.id !== session.email.id));

        setSessions(prev => prev.map(s => {
          if (s.id !== session.id) return s;
          return {
            ...s,
            status: 'sent',
            messages: s.messages.map(m => {
              if (m.id === 'm_send') {
                return {
                  ...m,
                  isThinking: false,
                  isDelivered: true,
                  thoughts: [
                    { id: 's1', text: 'Validated thread headers', status: 'done' },
                    { id: 's2', text: 'Dispatched through Gmail', status: 'done' }
                  ],
                  content: 'Reply delivered successfully to recipient.'
                };
              }
              return m;
            })
          };
        }));

        window.dispatchEvent(new CustomEvent('refresh-inbox'));
        setTimeout(() => {
          setSessions(prev => prev.filter(s => s.id !== session.id));
          setActiveSessionId(prev => (prev === session.id ? null : prev));
        }, 2000);
      } else {
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: 'ready' } : s));
      }
    } catch (err) {
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: 'ready' } : s));
    }
  };

  const handleSendCustomMessage = (session: AgentSession) => {
    if (!userPromptInput.trim()) return;

    const userText = userPromptInput.trim();
    setUserPromptInput("");

    setSessions(prev => prev.map(s => {
      if (s.id !== session.id) return s;
      return {
        ...s,
        messages: [
          ...s.messages,
          { id: Math.random().toString(), sender: 'user', content: userText },
          {
            id: Math.random().toString(),
            sender: 'agent',
            isThinking: true,
            thoughts: [
              { id: 't1', text: `Evaluating instruction: "${userText}"`, status: 'working' },
              { id: 't2', text: 'Updating draft response', status: 'working' }
            ]
          }
        ]
      };
    }));

    setTimeout(() => {
      const updatedDraft = `${session.draftReply}\n\nP.S. ${userText}`;
      setSessions(prev => prev.map(s => {
        if (s.id !== session.id) return s;
        const lastMsgIdx = s.messages.length - 1;
        const updatedMsgs = [...s.messages];
        updatedMsgs[lastMsgIdx] = {
          ...updatedMsgs[lastMsgIdx],
          isThinking: false,
          suggestedReply: updatedDraft
        };
        return {
          ...s,
          draftReply: updatedDraft,
          messages: updatedMsgs
        };
      }));
    }, 1200);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white relative">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full relative overflow-hidden min-h-0 bg-white">
      
      {/* Cards Area */}
      <div 
        className="flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out min-w-0 overflow-hidden"
        style={{ width: activeSession ? 'calc(100% - 460px)' : '100%' }}
      >
        {/* Header Toolbar matching Info Pane height exactly: h-[68px] */}
        <header className="h-[68px] px-6 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[17px] font-semibold text-gray-900 tracking-tight">Priority Inbox</h1>
              <span className="text-xs text-gray-400 font-normal">Smart tailored actions & automated replies</span>
            </div>
          </div>

          {/* Top Corner Agent Working Indicator */}
          {backgroundTasks.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 animate-in fade-in slide-in-from-top-1">
              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span className="text-xs font-medium text-blue-700">
                Agent is working: {backgroundTasks[backgroundTasks.length - 1].subject} ({backgroundTasks[backgroundTasks.length - 1].status})
              </span>
            </div>
          )}
        </header>

        {/* Responsive Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 flex flex-col">
          {emails.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              No priority emails found. All caught up!
            </div>
          ) : (
            <>
              <div className={`w-full grid gap-5 ${activeSession ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                {emails.map((email) => {
                  const smartActions = computeSmartActions(email);

                  return (
                    <div 
                      key={email.id} 
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col transition-all hover:shadow-md relative group"
                    >
                      {/* Top card row: Sender & Actions */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-2">
                          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-medium flex-shrink-0 text-sm uppercase">
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
                          
                          {/* Dismiss / Remove from Priority Button */}
                          <button 
                            onClick={(e) => handleDismissFromPriority(email.id, e)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Remove from priority inbox"
                          >
                            <MinusCircle className="w-4 h-4" />
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
                      <div className="flex-1 text-sm text-gray-700 leading-relaxed mb-4">
                        <span className="font-medium text-gray-900 mr-1">Summary:</span>
                        {email.summary || email.snippet}
                      </div>

                      {/* 3-Button Action Layout: 1 primary on top, 2 secondary on bottom */}
                      <div className="pt-3 border-t border-gray-100 flex flex-col gap-2 mt-auto">
                        {/* Top: Main expected reply button */}
                        {smartActions.length > 0 && (
                          <button
                            onClick={() => handleAutoReplyAction(email, smartActions[0])}
                            className="w-full px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span className="truncate">{smartActions[0].label}</span>
                          </button>
                        )}

                        {/* Bottom Row: Alternate reply action + Reply with AI button */}
                        <div className="grid grid-cols-2 gap-2">
                          {smartActions.length > 1 ? (
                            <button
                              onClick={() => handleAutoReplyAction(email, smartActions[1])}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 truncate"
                            >
                              <Check className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <span className="truncate">{smartActions[1].label}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDismissFromPriority(email.id, {} as any)}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 truncate"
                            >
                              <MinusCircle className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <span className="truncate">Dismiss</span>
                            </button>
                          )}

                          {/* Reply with AI button in identical button styling */}
                          <button
                            onClick={() => handleOpenAiReplySidebar(email)}
                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-blue-200/60 truncate shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            <span className="truncate">Reply with AI</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {nextPageToken && (
                <div className="flex items-center justify-center pt-8 pb-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-full shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load more emails</span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar: EXACT same design, header height (h-[68px]), and rounded corners as EmailDetailPeek */}
      {activeSession && (
        <div className="flex flex-col h-full bg-white z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-1 rounded-tl-2xl border-l border-gray-200 min-w-[420px] max-w-[500px]">
          
          {/* Multi-Chat Pill Tabs Header */}
          <div className="px-5 pt-3 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-gray-100 bg-white">
            {sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              const sender = sess.email.sender_name?.split(' ')[0] || sess.email.sender_email?.split('@')[0] || 'Email';
              return (
                <button
                  key={sess.id}
                  onClick={() => setActiveSessionId(sess.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  <Sparkles className={`w-3 h-3 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                  <span className="truncate max-w-[110px]">{sender}</span>
                  {sess.status === 'working' || sess.status === 'sending' ? (
                    <Loader2 className={`w-3 h-3 animate-spin ${isActive ? 'text-white' : 'text-blue-600'}`} />
                  ) : null}
                  <span 
                    onClick={(e) => handleCloseSession(sess.id, e)}
                    className={`p-0.5 rounded-full hover:bg-black/10 transition-colors ml-0.5 ${isActive ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Header Toolbar matching EmailDetailPeek (EXACTLY h-[68px]) */}
          <div className="h-[68px] px-5 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900 truncate">
                    Zero
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    {activeSession.status === 'working' ? 'Working...' : activeSession.status === 'sending' ? 'Sending...' : activeSession.status === 'sent' ? 'Sent' : 'Ready'}
                  </span>
                </div>
                <span className="text-xs text-gray-500 truncate max-w-[240px]">
                  {activeSession.email.subject || activeSession.email.sender_email}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setActiveSessionId(null)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Stream Body */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-white">
            
            {activeSession.messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-3">
                {msg.sender === 'user' ? (
                  <div className="flex items-start gap-2.5 justify-end">
                    <div className="bg-gray-100 text-gray-800 text-xs px-3.5 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                    </div>

                    <div className="flex-1 space-y-4 min-w-0">
                      {msg.thoughts && msg.thoughts.length > 0 && (
                        <div className="border-l-2 border-blue-400 pl-3 py-1 space-y-2.5">
                          {msg.thoughts.map((th) => (
                            <div key={th.id} className="flex items-center gap-2 text-xs">
                              {th.status === 'working' ? (
                                <div className="flex items-center gap-2 text-blue-700 font-medium">
                                  <span className="inline-block w-2.5 h-2.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                  <span>{th.text}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                  <span>{th.text}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.content && (
                        <div className="text-xs text-gray-700 leading-relaxed font-sans">
                          {msg.content}
                        </div>
                      )}

                      {msg.suggestedReply && (
                        <div className="space-y-2 mt-2 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="font-semibold text-gray-700">Suggested Reply</span>
                            <button
                              onClick={() => {
                                setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, isEditingDraft: !s.isEditingDraft } : s));
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-[11px]"
                            >
                              <Edit3 className="w-3 h-3" />
                              {activeSession.isEditingDraft ? 'Save' : 'Edit'}
                            </button>
                          </div>

                          {activeSession.isEditingDraft ? (
                            <textarea
                              value={activeSession.draftReply}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, draftReply: val } : s));
                              }}
                              className="w-full text-xs text-gray-800 p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-sans leading-relaxed"
                              rows={6}
                            />
                          ) : (
                            <div className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-sans p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                              {activeSession.draftReply}
                            </div>
                          )}

                          <div className="flex items-center justify-end pt-1">
                            <button
                              onClick={() => handleSendReply(activeSession)}
                              disabled={activeSession.status === 'sending' || activeSession.status === 'sent'}
                              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                            >
                              {activeSession.status === 'sending' ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Sending...
                                </>
                              ) : activeSession.status === 'sent' ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Sent!
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  Approve & Send
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            ))}

          </div>

          {/* Bottom Chat Prompt Input Bar */}
          <div className="p-4 border-t border-gray-100 bg-white flex items-center gap-2 flex-shrink-0">
            <input 
              type="text"
              placeholder="Ask Zero to refine or make changes..."
              value={userPromptInput}
              onChange={(e) => setUserPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendCustomMessage(activeSession);
              }}
              className="flex-1 px-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
            />
            <button 
              onClick={() => handleSendCustomMessage(activeSession)}
              disabled={!userPromptInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 shadow-sm"
              title="Send to Zero"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
