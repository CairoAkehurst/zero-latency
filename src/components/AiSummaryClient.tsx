"use client";

import { useEffect, useState } from "react";
import { Loader2, Calendar, Reply, Sparkles, Check, Mail } from "lucide-react";
import { formatEmailDate } from "@/utils/formatDate";

export function AiSummaryClient() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchTop10();
  }, []);

  const handleAction = async (email: any, action: string) => {
    if (!email.suggestedReply) return;
    
    // Auto draft and send
    try {
      alert("Drafting and sending reply...");
      await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: email.sender_email,
          subject: email.subject,
          body: email.suggestedReply,
          threadId: email.google_thread_id,
          messageId: email.google_message_id
        }),
      });
      alert("Successfully sent!");
    } catch (e) {
      alert("Failed to send reply");
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
    <div className="flex-1 flex flex-col h-full bg-gray-50 relative overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Priority Inbox</h1>
            <p className="text-gray-500 text-sm">Your latest emails summarized by AI with suggested actions.</p>
          </div>
        </div>

        <div className="space-y-4">
          {emails.map((email) => (
            <div key={email.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                    {email.sender_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{email.sender_name}</h3>
                    <p className="text-xs text-gray-500">{email.subject}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatEmailDate(email.timestamp)}</span>
              </div>
              
              <div className="bg-purple-50/50 rounded-lg p-4 mb-4 border border-purple-100">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {email.summary || email.snippet}
                  </p>
                </div>
              </div>

              {email.hasAiMetadata && email.suggestedReply && (
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Suggested Action:</span>
                  <button 
                    onClick={() => handleAction(email, 'yes')}
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Approve & Send Reply
                  </button>
                  <button 
                    onClick={() => alert("Suggested Reply: " + email.suggestedReply)}
                    className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Review Draft
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
