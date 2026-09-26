"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Check, Archive, Trash2, X, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { formatEmailDate } from "@/utils/formatDate";

interface SendingProcessState {
  step: 'review' | 'preparing' | 'sending' | 'completed' | 'error';
  email: any;
  replyText: string;
  errorMessage?: string;
}

export function AiSummaryClient() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [sendingProcess, setSendingProcess] = useState<SendingProcessState | null>(null);

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
    // Optimistic removal from priority list
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
    // Optimistic removal
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

  const handleOpenApproveSidebar = (email: any) => {
    setSendingProcess({
      step: 'review',
      email,
      replyText: email.suggestedReply || `Hi ${email.sender_name || ''},\n\nThank you for reaching out. I will review this and get back to you shortly.\n\nBest regards,`
    });
  };

  const handleExecuteSend = async () => {
    if (!sendingProcess) return;

    setSendingProcess(prev => prev ? { ...prev, step: 'preparing' } : null);

    // Brief realistic progress transition to show preparing -> sending
    await new Promise(r => setTimeout(r, 600));

    setSendingProcess(prev => prev ? { ...prev, step: 'sending' } : null);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: sendingProcess.email.sender_email,
          subject: sendingProcess.email.subject?.startsWith("Re:") ? sendingProcess.email.subject : `Re: ${sendingProcess.email.subject || ''}`,
          body: sendingProcess.replyText,
          threadId: sendingProcess.email.google_thread_id,
          messageId: sendingProcess.email.message_id_header || sendingProcess.email.google_message_id,
          references: sendingProcess.email.references_header
        }),
      });

      if (res.ok) {
        setSendingProcess(prev => prev ? { ...prev, step: 'completed' } : null);
        window.dispatchEvent(new CustomEvent('refresh-inbox'));
        setTimeout(() => {
          setSendingProcess(null);
        }, 1800);
      } else {
        const data = await res.json().catch(() => ({}));
        setSendingProcess(prev => prev ? { ...prev, step: 'error', errorMessage: data.error || 'Failed to send reply' } : null);
      }
    } catch (err: any) {
      setSendingProcess(prev => prev ? { ...prev, step: 'error', errorMessage: err?.message || 'Network error occurred' } : null);
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
    <div className="flex-1 flex h-full bg-white relative overflow-hidden">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Standard Header */}
        <header className="h-[60px] px-6 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h1 className="text-[18px] font-semibold text-gray-900 tracking-tight">Priority Inbox</h1>
            <span className="text-sm text-gray-400 font-normal">Top summaries & suggested actions</span>
          </div>
        </header>

        {/* Grid Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {emails.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              No priority emails found. All caught up!
            </div>
          ) : (
            <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
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

      {/* Right Sidebar Pop-up: Approve Reply & Sending Process */}
      {sendingProcess && (
        <div className="w-[450px] flex-shrink-0 flex flex-col h-full bg-white border-l border-gray-200 shadow-2xl z-30 transition-all duration-300 animate-in slide-in-from-right">
          {/* Sidebar Header */}
          <div className="h-[68px] px-6 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Approve & Send Reply</h3>
                <p className="text-xs text-gray-400 truncate max-w-[240px]">To: {sendingProcess.email.sender_email}</p>
              </div>
            </div>
            <button 
              onClick={() => setSendingProcess(null)}
              disabled={sendingProcess.step === 'preparing' || sendingProcess.step === 'sending'}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {/* Original Email Context */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Original Email</div>
              <div className="text-sm font-medium text-gray-900">{sendingProcess.email.subject || '(No subject)'}</div>
              <div className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                {sendingProcess.email.snippet || sendingProcess.email.summary}
              </div>
            </div>

            {/* Editable Reply Body */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Suggested Reply</label>
                <span className="text-[11px] text-gray-400">Review or customize before sending</span>
              </div>
              <textarea 
                value={sendingProcess.replyText}
                onChange={(e) => setSendingProcess(prev => prev ? { ...prev, replyText: e.target.value } : null)}
                disabled={sendingProcess.step !== 'review' && sendingProcess.step !== 'error'}
                className="w-full flex-1 p-3.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all leading-relaxed disabled:bg-gray-50 disabled:text-gray-600"
                rows={9}
              />
            </div>

            {/* Status Process Tracker */}
            {(sendingProcess.step === 'preparing' || sendingProcess.step === 'sending' || sendingProcess.step === 'completed' || sendingProcess.step === 'error') && (
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/80 space-y-3 animate-in fade-in">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Process</div>
                
                <div className="space-y-2.5">
                  {/* Step 1: Verification */}
                  <div className="flex items-center gap-2.5 text-xs">
                    {sendingProcess.step === 'preparing' ? (
                      <Loader2 className="w-4 h-4 text-purple-600 animate-spin flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    )}
                    <span className={sendingProcess.step === 'preparing' ? 'font-medium text-purple-700' : 'text-gray-600'}>
                      Preparing RFC 2822 thread reply & headers
                    </span>
                  </div>

                  {/* Step 2: Gmail Transmission */}
                  <div className="flex items-center gap-2.5 text-xs">
                    {sendingProcess.step === 'sending' ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                    ) : sendingProcess.step === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : sendingProcess.step === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" />
                    )}
                    <span className={sendingProcess.step === 'sending' ? 'font-medium text-blue-700' : sendingProcess.step === 'completed' ? 'text-gray-600' : 'text-gray-400'}>
                      Transmitting securely via Gmail API
                    </span>
                  </div>

                  {/* Step 3: Success or Error */}
                  {sendingProcess.step === 'completed' && (
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-green-700 pt-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      Reply dispatched successfully!
                    </div>
                  )}

                  {sendingProcess.step === 'error' && (
                    <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span>{sendingProcess.errorMessage || 'Failed to dispatch email.'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer Actions */}
          <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 flex-shrink-0">
            <button 
              onClick={() => setSendingProcess(null)}
              disabled={sendingProcess.step === 'preparing' || sendingProcess.step === 'sending'}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-30"
            >
              Cancel
            </button>

            {sendingProcess.step === 'completed' ? (
              <button 
                disabled 
                className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Sent!
              </button>
            ) : sendingProcess.step === 'error' ? (
              <button 
                onClick={handleExecuteSend}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                Retry
              </button>
            ) : (
              <button 
                onClick={handleExecuteSend}
                disabled={sendingProcess.step === 'preparing' || sendingProcess.step === 'sending' || !sendingProcess.replyText.trim()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                {sendingProcess.step === 'preparing' || sendingProcess.step === 'sending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Reply
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
