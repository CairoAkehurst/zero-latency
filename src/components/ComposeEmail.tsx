"use client";

import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";

interface ComposeEmailProps {
  onClose: () => void;
}

export function ComposeEmail({ onClose }: ComposeEmailProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!to || !subject || !body) return alert("Please fill in all fields.");
    setIsSending(true);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: to, subject, body }),
      });
      if (res.ok) {
        onClose();
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
    <div className="w-[500px] flex-shrink-0 border-l border-gray-100 bg-white flex flex-col h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-[#f7f7f5]">
        <h2 className="font-semibold text-gray-900">New Message</h2>
        <button 
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col p-5 space-y-4">
        <input
          type="email"
          placeholder="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full border-b border-gray-100 pb-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border-b border-gray-100 pb-2 text-sm text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <textarea
          placeholder="Write your message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full flex-1 resize-none text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none mt-2"
        />
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
        <button
          onClick={onClose}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={handleSend}
          disabled={isSending || !to || !subject || !body}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
