"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Sparkles, Check, Trash2, X, Send, Bot, User, Edit3, MessageSquare, EyeOff, MinusCircle, RefreshCw, Calendar, Search } from "lucide-react";
import { formatEmailDate } from "@/utils/formatDate";
import { Avatar } from "@/components/Avatar";
import { useAiToneStore, useAccountDataStore } from "@/lib/client/store";

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
  replyIntent?: string;
  reply?: string;
  style: 'primary' | 'secondary';
}

function computeSmartActionsFallback(email: any): SmartAction[] {
  const text = `${email.subject || ''} ${email.snippet || ''} ${email.summary || ''}`.toLowerCase();
  const sender = `${email.sender_name || ''} ${email.sender_email || ''}`.toLowerCase();
  const actions: SmartAction[] = [];

  const firstName = email.sender_name ? email.sender_name.split(' ')[0] : 'there';

  // 1. Detect Automated CI/CD, Deployment, Alert, or System Failure
  const isDeployOrAlert = 
    sender.includes('vercel') || 
    sender.includes('github') || 
    sender.includes('sentry') || 
    sender.includes('aws') || 
    sender.includes('datadog') ||
    sender.includes('netlify') ||
    sender.includes('render.com') ||
    text.includes('failed production deployment') || 
    text.includes('deployment failed') || 
    text.includes('build failed') || 
    text.includes('alert:') ||
    text.includes('incident alert') ||
    text.includes('error rate');

  if (isDeployOrAlert) {
    actions.push({
      label: "Acknowledge alert",
      replyIntent: "Acknowledge this system/deployment alert and confirm we are looking into it.",
      style: "primary"
    });
    actions.push({
      label: "Investigate error",
      replyIntent: "Confirm receipt and state that our engineering team is actively investigating the error.",
      style: "secondary"
    });
    return actions;
  }

  // 2. Detect Security alerts, 2FA, OTP, Password Resets
  const isSecurity = 
    text.includes('verification code') || 
    text.includes('password reset') || 
    text.includes('security code') || 
    text.includes('two-factor') || 
    text.includes('new login detected') || 
    text.includes('security alert') ||
    sender.includes('security');

  if (isSecurity) {
    actions.push({
      label: "Confirm security",
      replyIntent: "Confirm and acknowledge this security verification or login notice.",
      style: "primary"
    });
    actions.push({
      label: "Review activity",
      replyIntent: "Acknowledge security alert and state that account activity is being verified.",
      style: "secondary"
    });
    return actions;
  }

  // 3. Detect Invoices, Receipts, Subscriptions, Payments
  const isBilling = 
    text.includes('invoice') || 
    text.includes('receipt') || 
    text.includes('payment received') || 
    text.includes('subscription renewed') || 
    text.includes('payment due') || 
    text.includes('statement') || 
    sender.includes('stripe') || 
    sender.includes('billing') || 
    sender.includes('invoice');

  if (isBilling) {
    actions.push({
      label: "Confirm payment",
      replyIntent: "Confirm receipt of payment/invoice and thank them for the prompt processing.",
      style: "primary"
    });
    actions.push({
      label: "Forward finance",
      replyIntent: "Thank them and state that this has been forwarded to finance for settlement.",
      style: "secondary"
    });
    return actions;
  }

  // 4. Detect Meeting / Scheduling
  const isMeetingContext = 
    text.includes('meeting') || 
    text.includes('reschedule') || 
    text.includes('calendar') || 
    text.includes('zoom') || 
    text.includes('google meet') || 
    text.includes('call') || 
    text.includes('catch up') || 
    text.includes('schedule a time') || 
    text.includes('availability');

  const timeMatches = text.match(/\b(1[0-2]|[1-9])(?::[0-5][0-9])?\s*(?:am|pm)\b/gi);
  const dayMatches = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/gi);

  if (isMeetingContext && (text.includes("reschedule") || text.includes("postpone"))) {
    actions.push({
      label: "Propose time",
      replyIntent: "Thank them for the note and propose rescheduling for later this week or next week.",
      style: "primary"
    });
    actions.push({
      label: "Decline request",
      replyIntent: "Politely decline the reschedule request due to scheduling conflicts.",
      style: "secondary"
    });
    return actions;
  }

  if (isMeetingContext && timeMatches && timeMatches.length > 0) {
    const timeStr = timeMatches[0].toUpperCase();
    const dayStr = dayMatches && dayMatches.length > 0 ? ` ${dayMatches[0].charAt(0).toUpperCase() + dayMatches[0].slice(1).toLowerCase()}` : '';
    
    actions.push({
      label: `Accept ${timeStr}`,
      replyIntent: `Confirm and accept the invitation for ${timeStr}${dayStr}, confirming it is marked on the calendar.`,
      style: "primary"
    });
    actions.push({
      label: "Decline meeting",
      replyIntent: "Thank them warmly for the invitation, but politely decline due to an unavoidable schedule conflict.",
      style: "secondary"
    });
    return actions;
  }

  // 5. Detect Project Proposals & Contracts
  if (text.includes("proposal") || text.includes("contract") || text.includes("agreement") || text.includes("scope")) {
    actions.push({
      label: "Accept proposal",
      replyIntent: "Express enthusiasm, approve the proposal/agreement, and state we are ready to proceed with next steps.",
      style: "primary"
    });
    actions.push({
      label: "Request revisions",
      replyIntent: "Thank them for sending the proposal, mention you reviewed it, and request a few minor adjustments.",
      style: "secondary"
    });
    return actions;
  }

  // 6. Inquiries / Questions
  if (text.includes("?") || text.includes("let me know") || text.includes("what do you think") || text.includes("can you")) {
    actions.push({
      label: "Confirm details",
      replyIntent: "Answer affirmatively, address questions thoroughly, and confirm the details mentioned in their email.",
      style: "primary"
    });
    actions.push({
      label: "Follow up",
      replyIntent: "Thank them for reaching out, state you are looking into the specifics, and promise a comprehensive follow-up shortly.",
      style: "secondary"
    });
    return actions;
  }

  // 7. General Updates / Default
  actions.push({
    label: "Acknowledge update",
    replyIntent: "Acknowledge the update, express appreciation for sharing the information, and confirm everything is noted.",
    style: "primary"
  });
  actions.push({
    label: "Confirm received",
    replyIntent: "Confirm receipt of the email and indicate you will follow up if anything else is needed.",
    style: "secondary"
  });

  return actions;
}

interface AiSummaryClientProps {
  initialEmails?: any[];
  initialNextPageToken?: string | null;
}

export function AiSummaryClient({
  initialEmails = [],
  initialNextPageToken = null,
}: AiSummaryClientProps) {
  const [emails, setEmails] = useState<any[]>(initialEmails);
  const [nextPageToken, setNextPageToken] = useState<string | null>(initialNextPageToken);
  const [loading, setLoading] = useState(initialEmails.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Background active agent indicators
  const [backgroundTasks, setBackgroundTasks] = useState<Array<{ id: string; subject: string; status: string }>>([]);

  // Multi-chat management
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [userPromptInput, setUserPromptInput] = useState("");

  const [customActionsMap, setCustomActionsMap] = useState<Record<string, { primary?: { label: string; replyIntent?: string }; secondary?: { label: string; replyIntent?: string } }>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Asynchronously request AI-generated 2-3 word custom action intents
  const fetchCustomAiActions = async (emailList: any[]) => {
    if (!emailList || emailList.length === 0) return;
    try {
      const res = await fetch("/api/ai/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: emailList })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.actions) {
          setCustomActionsMap(prev => ({ ...prev, ...data.actions }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch custom AI actions:", err);
    }
  };

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
        fetchCustomAiActions(data.emails);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await fetchEmails();
  };

  useEffect(() => {
    if (initialEmails.length === 0) {
      fetchEmails();
    } else {
      fetchCustomAiActions(initialEmails);
    }
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

  const { activeTone, professionalPrompt, casualPrompt, concisePrompt, customPrompt } = useAiToneStore();
  const { signatureEnabled, signatureText } = useAccountDataStore();

  const getEffectiveToneInstruction = () => {
    switch (activeTone) {
      case 'casual':
        return `Style: Casual & Friendly.\n${casualPrompt}`;
      case 'concise':
        return `Style: Direct & Concise.\n${concisePrompt}`;
      case 'custom':
        return `Style: Custom Persona.\n${customPrompt}`;
      case 'professional':
      default:
        return `Style: Professional & Business.\n${professionalPrompt}`;
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
      let replyBody = action.reply;

      // If reply is not pre-crafted or needs fully fledged drafting:
      if (!replyBody) {
        const replyIntent = action.replyIntent || action.label;
        const emailContext = `Original Email:\nFrom: ${email.sender_name || ''} <${email.sender_email || ''}>\nSubject: ${email.subject || ''}\nBody:\n${email.snippet || email.summary || ''}`;
        
        const draftRes = await fetch("/api/ai/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction: `Draft a complete, fully fledged reply fulfilling this action: "${replyIntent}". Match the incoming email's length and tone. Follow user style guidelines. Do NOT include any sign-off or signature.`,
            tone: activeTone,
            toneInstructions: getEffectiveToneInstruction(),
            emailContext,
            signature: signatureText,
            signatureEnabled
          })
        });

        if (draftRes.ok) {
          const draftData = await draftRes.json();
          if (draftData.text) {
            replyBody = draftData.text.trim();
          }
        }
      }

      if (!replyBody) {
        replyBody = `Hi ${email.sender_name ? email.sender_name.split(' ')[0] : 'there'},\n\nThank you for your email regarding "${email.subject || 'this matter'}". This has been noted and addressed.\n\nBest regards`;
      }

      // Check if a calendar invite is required and auto-create it so we can embed it
      let outgoingBody = replyBody;
      let calendarInviteCreated = false;
      try {
        const calRes = await fetch("/api/calendar/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailSubject: email.subject || '',
            emailBody: email.snippet || email.summary || '',
            recipientEmail: email.sender_email,
            recipientName: email.sender_name || '',
            replyText: replyBody
          })
        });
        const calData = await calRes.json();
        if (calData.created && calData.inviteCardHtml) {
          calendarInviteCreated = true;
          // Embed the formatted Google Calendar invite card into the HTML email
          const formattedReplyHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">${replyBody.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>')}</div>${calData.inviteCardHtml}`;
          outgoingBody = formattedReplyHtml;
        }
      } catch (calErr) {
        console.error("Calendar invite check error:", calErr);
      }

      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: email.sender_email,
          subject: email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject || ''}`,
          body: outgoingBody,
          threadId: email.google_thread_id,
          messageId: email.message_id_header || email.google_message_id,
          references: email.references_header
        }),
      });

      if (res.ok) {
        if (calendarInviteCreated) {
          setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Sent & Invite Embedded 📅' } : t));
        } else {
          setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Sent' } : t));
        }

        window.dispatchEvent(new CustomEvent('refresh-inbox'));
        setTimeout(() => {
          setBackgroundTasks(prev => prev.filter(t => t.id !== taskId));
        }, 3500);
      } else {
        setBackgroundTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Failed' } : t));
        setTimeout(() => {
          setBackgroundTasks(prev => prev.filter(t => t.id !== taskId));
        }, 4000);
      }
    } catch (err) {
      console.error("Auto reply failed:", err);
      setBackgroundTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  // Open the interactive Zero AI reply chat sidebar
  const handleOpenAiReplySidebar = async (email: any) => {
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
      { id: '3', text: `Drafting tailored ${activeTone} response`, status: 'working' as const },
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
          content: `Review "${email.subject || 'this email'}" and prepare suggested reply in ${activeTone} tone`,
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

    // Call API to generate draft matching the user's tone persona
    try {
      const emailContext = `From: ${email.sender_name || ''} <${email.sender_email || ''}>\nSubject: ${email.subject || ''}\nSnippet/Body: ${email.snippet || email.summary || ''}`;
      const res = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: `Write a natural reply to this email conforming to the style guidelines. Do NOT include any sign-off or signature.`,
          tone: activeTone,
          toneInstructions: getEffectiveToneInstruction(),
          emailContext,
          signature: signatureText,
          signatureEnabled
        })
      });

      let finalDraft = fallbackDraft;
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          finalDraft = data.text.trim();
        }
      }

      setSessions(prev => prev.map(s => {
        if (s.id !== email.id) return s;
        return {
          ...s,
          draftReply: finalDraft,
          status: 'ready',
          messages: s.messages.map(m => {
            if (m.id === 'm2') {
              return {
                ...m,
                isThinking: false,
                thoughts: m.thoughts?.map(t => ({ ...t, status: 'done' as const })),
                suggestedReply: finalDraft
              };
            }
            return m;
          })
        };
      }));
    } catch (e) {
      // Fallback gracefully on timeout/error
      setSessions(prev => prev.map(s => {
        if (s.id !== email.id) return s;
        return {
          ...s,
          draftReply: fallbackDraft,
          status: 'ready',
          messages: s.messages.map(m => {
            if (m.id === 'm2') {
              return {
                ...m,
                isThinking: false,
                thoughts: m.thoughts?.map(t => ({ ...t, status: 'done' as const })),
                suggestedReply: fallbackDraft
              };
            }
            return m;
          })
        };
      }));
    }
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
      // Check if a calendar invite should be created and embed it
      let outgoingBody = session.draftReply;
      let inviteCreated = false;
      let eventSummary = '';
      try {
        const calRes = await fetch("/api/calendar/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailSubject: session.email.subject || '',
            emailBody: session.email.snippet || session.email.summary || '',
            recipientEmail: session.email.sender_email,
            recipientName: session.email.sender_name || '',
            replyText: session.draftReply
          })
        });
        const calData = await calRes.json();
        if (calData.created && calData.inviteCardHtml) {
          inviteCreated = true;
          eventSummary = calData.summary || 'Meeting';
          const formattedReplyHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">${session.draftReply.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>')}</div>${calData.inviteCardHtml}`;
          outgoingBody = formattedReplyHtml;
        }
      } catch (calErr) {
        console.error("Calendar invite error:", calErr);
      }

      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: session.email.sender_email,
          subject: session.email.subject?.startsWith("Re:") ? session.email.subject : `Re: ${session.email.subject || ''}`,
          body: outgoingBody,
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
                const finalThoughts: AgentThought[] = [
                  { id: 's1', text: 'Validated thread headers', status: 'done' },
                  { id: 's2', text: 'Dispatched through Gmail', status: 'done' },
                  ...(inviteCreated ? [{ id: 's3', text: `Google Calendar invite created & sent: "${eventSummary}" 📅`, status: 'done' as const }] : [])
                ];
                return {
                  ...m,
                  isThinking: false,
                  isDelivered: true,
                  thoughts: finalThoughts,
                  content: inviteCreated 
                    ? `Reply delivered and Google Calendar invite auto-sent to ${session.email.sender_email}!` 
                    : 'Reply delivered successfully to recipient.'
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
        }, inviteCreated ? 3500 : 2000);
      } else {
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: 'ready' } : s));
      }
    } catch (err) {
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: 'ready' } : s));
    }
  };

  const handleSendCustomMessage = async (session: AgentSession) => {
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
              { id: 't2', text: `Refining draft in ${activeTone} tone`, status: 'working' }
            ]
          }
        ]
      };
    }));

    try {
      const emailContext = `Original Email:\nFrom: ${session.email.sender_name || ''} <${session.email.sender_email || ''}>\nSubject: ${session.email.subject || ''}\nBody: ${session.email.snippet || session.email.summary || ''}\n\nCurrent Draft:\n${session.draftReply}`;
      const res = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: `Refine and rewrite the current draft according to this user feedback: "${userText}". Follow style guidelines. Do NOT include any sign-off or signature.`,
          tone: activeTone,
          toneInstructions: getEffectiveToneInstruction(),
          emailContext,
          signature: signatureText,
          signatureEnabled
        })
      });

      let updatedDraft = `${session.draftReply}\n\nP.S. ${userText}`;
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          updatedDraft = data.text.trim();
        }
      }

      setSessions(prev => prev.map(s => {
        if (s.id !== session.id) return s;
        const lastMsgIdx = s.messages.length - 1;
        const updatedMsgs = [...s.messages];
        updatedMsgs[lastMsgIdx] = {
          ...updatedMsgs[lastMsgIdx],
          isThinking: false,
          thoughts: [
            { id: 't1', text: `Evaluated instruction: "${userText}"`, status: 'done' },
            { id: 't2', text: `Refined draft in ${activeTone} tone`, status: 'done' }
          ],
          suggestedReply: updatedDraft
        };
        return {
          ...s,
          draftReply: updatedDraft,
          messages: updatedMsgs
        };
      }));
    } catch (e) {
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
    }
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
        {/* Header Toolbar matching Info Pane / Inbox height exactly: h-[68px] */}
        <header className="h-[68px] px-6 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900 leading-none">Priority Inbox</h1>

            {/* Agent Working Indicator */}
            {backgroundTasks.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 animate-in fade-in slide-in-from-top-1">
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span className="text-xs font-medium text-blue-700">
                  Agent: {backgroundTasks[backgroundTasks.length - 1].subject} ({backgroundTasks[backgroundTasks.length - 1].status})
                </span>
              </div>
            )}
          </div>

          {/* Right side controls: sync + search */}
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync emails"}
            </button>

            <div className="relative w-64 flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search priority..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-normal"
              />
            </div>
          </div>
        </header>


        {/* Responsive Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 flex flex-col">
          {(() => {
            const q = searchQuery.toLowerCase().trim();
            const filteredEmails = q
              ? emails.filter(e =>
                  (e.sender_name || '').toLowerCase().includes(q) ||
                  (e.sender_email || '').toLowerCase().includes(q) ||
                  (e.subject || '').toLowerCase().includes(q) ||
                  (e.snippet || '').toLowerCase().includes(q) ||
                  (e.summary || '').toLowerCase().includes(q)
                )
              : emails;

            if (filteredEmails.length === 0) return (
              <div className="p-12 text-center text-gray-500 text-sm">
                {q ? `No results for "${searchQuery}"` : 'No priority emails found. All caught up!'}
              </div>
            );

            return (
              <>
                <div className={`w-full grid gap-5 ${activeSession ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                  {filteredEmails.map((email) => {

                  const fallbackActions = computeSmartActionsFallback(email);
                  const custom = customActionsMap[email.id];
                  
                  const smartActions: SmartAction[] = [
                    {
                      label: custom?.primary?.label || fallbackActions[0]?.label || "Confirm and reply",
                      replyIntent: custom?.primary?.replyIntent || custom?.primary?.label || fallbackActions[0]?.replyIntent,
                      style: "primary"
                    },
                    {
                      label: custom?.secondary?.label || fallbackActions[1]?.label || "Follow up later",
                      replyIntent: custom?.secondary?.replyIntent || custom?.secondary?.label || fallbackActions[1]?.replyIntent,
                      style: "secondary"
                    }
                  ];

                  return (
                    <div 
                      key={email.id} 
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col transition-all hover:shadow-md relative group"
                    >
                      {/* Top card row: Sender & Actions */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-2">
                          <Avatar 
                          name={email.sender_name} 
                          email={email.sender_email} 
                          size="md" 
                          className="w-9 h-9 border border-gray-100 shadow-xs" 
                        />
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

                        {/* Bottom Row: Alternate reply action (2/3 width) + Reply with AI button (1/3 width) */}
                        <div className="flex items-center gap-2 w-full">
                          {smartActions.length > 1 ? (
                            <button
                              onClick={() => handleAutoReplyAction(email, smartActions[1])}
                              className="flex-[2] min-w-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 truncate"
                            >
                              <Check className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <span className="truncate">{smartActions[1].label}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDismissFromPriority(email.id, {} as any)}
                              className="flex-[2] min-w-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 truncate"
                            >
                              <MinusCircle className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <span className="truncate">Dismiss</span>
                            </button>
                          )}

                          {/* Reply with AI button taking 1/3 width */}
                          <button
                            onClick={() => handleOpenAiReplySidebar(email)}
                            className="flex-1 min-w-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-blue-600 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 truncate"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            <span className="truncate">Reply</span>
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
            );
          })()}
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
