"use client";

import { useState, useEffect } from "react";
import { useAccountDataStore } from "@/lib/client/store";
import { X, Send, Loader2, Maximize2, Minimize2, Bold, Italic, Underline, Sparkles, Paperclip, Trash2 } from "lucide-react";

interface ComposeEmailProps {
  onClose: () => void;
  onExpand?: () => void;
  isFullView?: boolean;
}

export function ComposeEmail({ onClose, onExpand, isFullView = false }: ComposeEmailProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { signatureEnabled, signatureText, snippets } = useAccountDataStore();
  const [showSnippets, setShowSnippets] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [ccText, setCcText] = useState("");
  const [bccText, setBccText] = useState("");


  useEffect(() => {
    if (signatureEnabled && !body) {
      setBody("<br><br><div>" + signatureText.replace(/\n/g, '<br>') + "</div>");
      const el = document.querySelector('[data-placeholder="Write, or press space for AI, “/” for commands"]');
      if (el && !el.innerHTML) el.innerHTML = "<br><br><div>" + signatureText.replace(/\n/g, '<br>') + "</div>";
    }
  }, []);


  const handleSend = async () => {
    if (!to || !subject || !body) return alert("Please fill in all fields.");
    setIsSending(true);
    try {
      let outgoingBody = body;
      try {
        const calendarResponse = await fetch('/api/calendar/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailSubject: subject,
            emailBody: '',
            recipientEmail: to,
            replyText: body.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' '),
            dedupeKey: `compose:${to.toLowerCase()}:${subject.toLowerCase()}`,
          }),
        });
        const invite = await calendarResponse.json();
        if (invite.created && invite.inviteCardHtml) outgoingBody = `${body}${invite.inviteCardHtml}`;
      } catch (calendarError) {
        console.error('Calendar invite detection failed:', calendarError);
      }

      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: to, ccEmail: ccText, bccEmail: bccText, subject, body: outgoingBody }),
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
    <div className={`flex flex-col h-full bg-white z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-1 rounded-tl-2xl ${isFullView ? 'border-l-0' : 'border-l border-gray-100'}`}>
      {/* Header */}
      <div className="h-[68px] px-5 flex items-center justify-between border-b border-gray-100 bg-[#f7f7f5] flex-shrink-0">
        <h2 className="font-semibold text-gray-900">New Message</h2>
        <div className="flex items-center gap-1">
          {onExpand && (
            <button 
              onClick={onExpand}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
              title={isFullView ? "Minimize" : "Full screen"}
            >
              {isFullView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      
      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col p-5">
        <div className="flex flex-col flex-1 shadow-sm border border-gray-200 rounded-xl bg-white focus-within:ring-1 focus-within:ring-blue-500 transition-all overflow-hidden relative">
            <div className="flex items-center px-4 py-2 border-b border-gray-100 bg-gray-50/50">
              <span className="text-sm text-gray-500 w-10">To:</span>
              <input type="text" value={to} onChange={e => setTo(e.target.value)} className="flex-1 bg-transparent border-none text-sm focus:ring-0 p-0 text-gray-900 outline-none" />
              <button onClick={() => setShowCcBcc(!showCcBcc)} className="text-xs text-gray-400 hover:text-gray-600 ml-2">Cc/Bcc</button>
            </div>
            {showCcBcc && (
              <>
                <div className="flex items-center px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                  <span className="text-sm text-gray-500 w-10">Cc:</span>
                  <input type="text" value={ccText} onChange={e => setCcText(e.target.value)} className="flex-1 bg-transparent border-none text-sm focus:ring-0 p-0 text-gray-900 outline-none" />
                </div>
                <div className="flex items-center px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                  <span className="text-sm text-gray-500 w-10">Bcc:</span>
                  <input type="text" value={bccText} onChange={e => setBccText(e.target.value)} className="flex-1 bg-transparent border-none text-sm focus:ring-0 p-0 text-gray-900 outline-none" />
                </div>
              </>
            )}
            <div className="flex items-center px-4 py-2 border-b border-gray-100 bg-white">
              <input type="text" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="flex-1 bg-transparent border-none font-medium text-sm focus:ring-0 p-0 text-gray-900 outline-none placeholder:font-normal" />
            </div>

            <div
              contentEditable
              onInput={e => setBody(e.currentTarget.innerHTML)}
              className="px-4 py-3 flex-1 min-h-[200px] text-[14px] text-gray-900 focus:outline-none"
              data-placeholder="Write, or press space for AI, “/” for commands"
            />

            {/* Formatting Toolbar */}
            <div className="px-3 py-2 flex items-center justify-between border-t border-gray-100 bg-white">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSend}
                  disabled={isSending || !to || !subject}
                  className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                </button>
                
                <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                
                {/* Parity formatting buttons */}
                <button onClick={() => document.execCommand('bold')} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Bold"><Bold className="w-4 h-4" /></button>
                <button onClick={() => document.execCommand('italic')} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Italic"><Italic className="w-4 h-4" /></button>
                <button onClick={() => document.execCommand('underline')} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Underline"><Underline className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <button 
                    onClick={() => setShowSnippets(!showSnippets)}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded text-xs font-medium" 
                    title="Insert Snippet"
                  >
                    {}
                  </button>
                  {showSnippets && (
                    <div className="absolute bottom-full mb-1 left-0 w-48 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50">
                      {snippets.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500">No snippets configured.</div>
                      ) : (
                        snippets.map((s: any) => (
                          <button
                            key={s.id}
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-sm text-gray-700 truncate"
                            onClick={() => {
                              document.execCommand('insertHTML', false, s.body.replace(/\n/g, '<br>'));
                              setShowSnippets(false);
                            }}
                          >
                            {s.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button onClick={async () => {
                      const instruction = prompt("What should the AI write?");
                      if (!instruction) return;
                      setIsGenerating(true);
                      try {
                        const res = await fetch('/api/ai/write', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ instruction })
                        });
                        const data = await res.json();
                        if (data.text) {
                          document.execCommand('insertHTML', false, data.text.replace(/\n/g, '<br>'));
                        }
                      } catch(e) {}
                      setIsGenerating(false);
                    }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center gap-1.5" title="Help me write">
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <Sparkles className="w-4 h-4 text-purple-500" />}
                  <span className="text-xs font-medium text-purple-600">AI</span>
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Attach file">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Discard">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
