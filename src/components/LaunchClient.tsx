"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Loader2, Upload, FileText, Send, Check, X, Edit3, Trash2, Mail } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useAiToneStore, useAccountDataStore } from "@/lib/client/store";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface LaunchTask {
  id: string;
  data: Record<string, unknown>;
  status: 'pending' | 'drafting' | 'drafted' | 'sending' | 'sent' | 'error';
  draft: string;
  error?: string;
  guessedEmail?: string;
  guessedName?: string;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function LaunchClient() {
  const [tasks, setTasks] = useState<LaunchTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  
  const { activeTone, professionalPrompt, casualPrompt, concisePrompt, customPrompt } = useAiToneStore();
  const { signatureEnabled, signatureText } = useAccountDataStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getEffectiveToneInstruction = () => {
    switch (activeTone) {
      case 'casual': return `Style: Casual & Friendly.\n${casualPrompt}`;
      case 'concise': return `Style: Direct & Concise.\n${concisePrompt}`;
      case 'custom': return `Style: Custom Persona.\n${customPrompt}`;
      case 'professional':
      default: return `Style: Professional & Business.\n${professionalPrompt}`;
    }
  };

  const guessField = (row: Record<string, unknown>, possibleKeys: string[]) => {
    for (const key of Object.keys(row)) {
      if (possibleKeys.some(pk => key.toLowerCase().includes(pk))) {
        return String(row[key]);
      }
    }
    return undefined;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!instruction.trim()) {
      alert("Please provide instructions on what to write first.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedTasks: LaunchTask[] = (results.data as Record<string, unknown>[]).map((row, i) => {
          return {
            id: `task-${Date.now()}-${i}`,
            data: row,
            status: 'drafting',
            draft: '',
            guessedEmail: guessField(row, ['email', 'e-mail', 'mail']),
            guessedName: guessField(row, ['name', 'first', 'last', 'person'])
          };
        });
        setTasks(parsedTasks);
        setIsUploading(false);

        // Kick off drafting
        parsedTasks.forEach(task => {
          generateDraft(task);
        });
      },
      error: (err) => {
        console.error("CSV Parse Error:", err);
        alert("Failed to parse CSV file.");
        setIsUploading(false);
      }
    });
  };

  const generateDraft = async (task: LaunchTask) => {
    try {
      const dataString = Object.entries(task.data).map(([k, v]) => `${k}: ${v}`).join('\n');
      const emailContext = `Person Details:\n${dataString}`;
      
      const res = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: `Write a cold outbound email to this person. Context and instructions: ${instruction}. Do NOT include any sign-off or signature.`,
          tone: activeTone,
          toneInstructions: getEffectiveToneInstruction(),
          emailContext,
          signature: signatureText,
          signatureEnabled
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'drafted', draft: data.text?.trim() || '' } : t));
      } else {
        throw new Error("Failed to generate draft");
      }
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', error: String(err) } : t));
    }
  };

  const handleSend = async (task: LaunchTask) => {
    if (!task.guessedEmail) {
      alert("No email address found for this person.");
      return;
    }

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'sending' } : t));

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: task.guessedEmail,
          subject: instruction.substring(0, 50) + "...", // Could generate a subject, but keeping it simple or require subject in draft
          body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">${task.draft.replace(/\n/g, '<br/>')}</div>`,
        }),
      });

      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'sent' } : t));
        if (activeTaskId === task.id) {
            setTimeout(() => {
                setActiveTaskId(null);
            }, 1500);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send');
      }
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', error: String(err) } : t));
      alert(`Failed to send to ${task.guessedEmail}: ${err}`);
    }
  };
  
  const handleRemove = (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (activeTaskId === taskId) setActiveTaskId(null);
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);

  return (
    <div className="flex h-full relative overflow-hidden min-h-0 bg-white">
      {/* Main Area */}
      <div 
        className="flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out min-w-0 overflow-hidden"
        style={{ width: activeTask ? 'calc(100% - 400px)' : '100%' }}
      >
        <header className="h-[68px] px-6 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900 leading-none flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              Launch Queue
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 flex flex-col">
          {tasks.length === 0 ? (
            <div className="max-w-xl mx-auto w-full mt-12 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Mass Email Writer</h2>
              <p className="text-sm text-gray-600 mb-6">Upload a CSV file containing your contacts. We&apos;ll analyze each row and generate a custom email draft based on your instructions.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instructions for AI</label>
                  <textarea 
                    value={instruction}
                    onChange={e => setInstruction(e.target.value)}
                    placeholder="e.g. Write a cold outreach email pitching our new software. Mention their company name and their role. Keep it short."
                    className="w-full h-32 p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload CSV</label>
                  <input 
                    type="file" 
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || !instruction.trim()}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                    <span className="text-sm font-medium">Click to select CSV file</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`w-full grid gap-5 ${activeTask ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => setActiveTaskId(task.id)}
                  className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col transition-all cursor-pointer group ${activeTaskId === task.id ? 'border-purple-500 ring-1 ring-purple-500 shadow-md' : 'border-gray-200 hover:shadow-md hover:border-gray-300'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-2">
                      <Avatar 
                        name={task.guessedName || 'Unknown'} 
                        email={task.guessedEmail || 'no-email'} 
                        size="md" 
                        className="w-9 h-9 border border-gray-100 shadow-xs" 
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {task.guessedName || task.guessedEmail || 'Unknown Contact'}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {task.guessedEmail || 'Missing email address'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button 
                            onClick={(e) => handleRemove(task.id, e)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove from queue"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        task.status === 'drafting' ? 'bg-blue-50 text-blue-600' :
                        task.status === 'drafted' ? 'bg-amber-50 text-amber-600' :
                        task.status === 'sending' ? 'bg-purple-50 text-purple-600' :
                        task.status === 'sent' ? 'bg-green-50 text-green-600' :
                        'bg-red-50 text-red-600'
                        }`}>
                        {task.status}
                        </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 text-sm text-gray-700 leading-relaxed line-clamp-3 mb-2 opacity-80">
                    {task.draft ? task.draft : task.status === 'drafting' ? 'Drafting custom email...' : 'Waiting...'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar for Review */}
      {activeTask && (
        <div className="flex flex-col h-full bg-white z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 w-[400px] border-l border-gray-200">
          <div className="h-[68px] px-5 flex items-center justify-between border-b border-gray-100 flex-shrink-0 bg-gray-50/50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Review Draft
            </h2>
            <button 
              onClick={() => setActiveTaskId(null)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Person Details at Top */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/30">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Details</h3>
              <div className="space-y-2">
                {Object.entries(activeTask.data).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase">{key}</span>
                    <span className="text-sm text-gray-900 font-medium break-words">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Draft Below */}
            <div className="p-5 flex-1 flex flex-col bg-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Draft</h3>
                {activeTask.status === 'drafted' && (
                  <button
                    onClick={() => setIsEditingDraft(!isEditingDraft)}
                    className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 text-[11px]"
                  >
                    <Edit3 className="w-3 h-3" />
                    {isEditingDraft ? 'Done' : 'Edit'}
                  </button>
                )}
              </div>

              {activeTask.status === 'drafting' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="text-sm">Generating personalized draft...</span>
                </div>
              ) : activeTask.status === 'error' ? (
                <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">
                  {activeTask.error}
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {isEditingDraft ? (
                    <textarea
                      value={activeTask.draft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, draft: val } : t));
                      }}
                      className="flex-1 w-full text-sm text-gray-800 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none font-sans leading-relaxed"
                    />
                  ) : (
                    <div className="flex-1 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans p-4 bg-gray-50 rounded-xl border border-gray-100 overflow-y-auto">
                      {activeTask.draft}
                    </div>
                  )}
                  
                  <div className="pt-4 mt-auto">
                    <button
                      onClick={() => {
                        setIsEditingDraft(false);
                        handleSend(activeTask);
                      }}
                      disabled={activeTask.status === 'sending' || activeTask.status === 'sent' || !activeTask.guessedEmail}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                    >
                      {activeTask.status === 'sending' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : activeTask.status === 'sent' ? (
                        <>
                          <Check className="w-4 h-4" />
                          Sent!
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Approve & Send
                        </>
                      )}
                    </button>
                    {!activeTask.guessedEmail && (
                        <p className="text-xs text-red-500 text-center mt-2">Cannot send: No email address found in CSV data.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
