"use client";

import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import { Loader2, Upload, FileText, Send, Check, X, Edit3, Trash2, Mail, Play, Table as TableIcon } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useAiToneStore, useAccountDataStore } from "@/lib/client/store";

interface LaunchTask {
  id: string;
  data: Record<string, unknown>;
  status: 'pending' | 'drafting' | 'drafted' | 'sending' | 'sent' | 'error';
  draft: string;
  error?: string;
  guessedEmail?: string;
  guessedName?: string;
}

export function LaunchClient() {
  const [tasks, setTasks] = useState<LaunchTask[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [phase, setPhase] = useState<'upload' | 'table' | 'queue'>('upload');
  
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const { activeTone, professionalPrompt, casualPrompt, concisePrompt, customPrompt } = useAiToneStore();
  const { signatureEnabled, signatureText } = useAccountDataStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('zero-latency-launch-tasks');
      const savedPhase = localStorage.getItem('zero-latency-launch-phase');
      const savedHeaders = localStorage.getItem('zero-latency-launch-headers');
      const savedInstruction = localStorage.getItem('zero-latency-launch-instruction');
      
      if (savedTasks && savedPhase) {
        setTasks(JSON.parse(savedTasks));
        setPhase(savedPhase as 'upload' | 'table' | 'queue');
        if (savedHeaders) setHeaders(JSON.parse(savedHeaders));
        if (savedInstruction) setInstruction(savedInstruction);
      }
    } catch (e) {
      console.error("Failed to load launch state:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('zero-latency-launch-tasks', JSON.stringify(tasks));
      localStorage.setItem('zero-latency-launch-phase', phase);
      localStorage.setItem('zero-latency-launch-headers', JSON.stringify(headers));
      localStorage.setItem('zero-latency-launch-instruction', instruction);
    } catch (e) {
      console.error("Failed to save launch state:", e);
    }
  }, [tasks, phase, headers, instruction, isLoaded]);

  const clearWorkspace = () => {
    if (confirm("Are you sure you want to clear your current workspace? All drafts will be lost.")) {
      setTasks([]);
      setHeaders([]);
      setPhase('upload');
      setInstruction("");
      setActiveTaskId(null);
      localStorage.removeItem('zero-latency-launch-tasks');
      localStorage.removeItem('zero-latency-launch-phase');
      localStorage.removeItem('zero-latency-launch-headers');
      localStorage.removeItem('zero-latency-launch-instruction');
    }
  };

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

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta && results.meta.fields) {
            setHeaders(results.meta.fields);
        } else if (results.data.length > 0) {
            setHeaders(Object.keys(results.data[0] as object));
        }

        const parsedTasks: LaunchTask[] = (results.data as Record<string, unknown>[]).map((row, i) => {
          return {
            id: `task-${Date.now()}-${i}`,
            data: row,
            status: 'pending',
            draft: '',
            guessedEmail: guessField(row, ['email', 'e-mail', 'mail']),
            guessedName: guessField(row, ['name', 'first', 'last', 'person'])
          };
        });
        setTasks(parsedTasks);
        setPhase('table');
        setIsUploading(false);
      },
      error: (err) => {
        console.error("CSV Parse Error:", err);
        alert("Failed to parse CSV file.");
        setIsUploading(false);
      }
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startDrafting = () => {
    if (!instruction.trim()) {
        alert("Please provide instructions on what to write first.");
        return;
    }
    
    setPhase('queue');
    
    // Kick off drafting
    tasks.forEach(task => {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'drafting' } : t));
        generateDraft(task);
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

  const handleSend = (task: LaunchTask) => {
    if (!task.guessedEmail) {
      alert("No email address found for this person.");
      return;
    }

    // Immediately open the next task in the queue
    setTasks((currentTasks) => {
      const currentIndex = currentTasks.findIndex(t => t.id === task.id);
      if (currentIndex !== -1) {
        const nextTask = currentTasks.slice(currentIndex + 1).find(t => t.status === 'drafted' || t.status === 'drafting' || t.status === 'pending');
        setActiveTaskId(nextTask ? nextTask.id : null);
      }
      return currentTasks.map(t => t.id === task.id ? { ...t, status: 'sending' } : t);
    });

    // Fire and forget fetch in background
    fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toEmail: task.guessedEmail,
        subject: instruction.substring(0, 50) + "...", // Could generate a subject, but keeping it simple or require subject in draft
        body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">${task.draft.replace(/\n/g, '<br/>')}</div>`,
      }),
    }).then(async (res) => {
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'sent' } : t));
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send');
      }
    }).catch((err) => {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', error: String(err) } : t));
    });
  };
  
  const handleRemove = (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (activeTaskId === taskId) setActiveTaskId(null);
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);

  if (!isLoaded) return null; // Don't render until localStorage is loaded to prevent hydration mismatch

  return (
    <div className="flex h-full relative overflow-hidden min-h-0 bg-white dark:bg-[#161616]">
      {/* Main Area */}
      <div 
        className="flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out min-w-0 overflow-hidden border-r border-gray-100 dark:border-white/5"
        style={{ width: activeTask ? '50%' : '100%' }}
      >
        <header className="h-[68px] px-6 flex items-center justify-between border-b border-gray-100 dark:border-white/5 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-none flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              Launch Queue
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {phase !== 'upload' && (
              <button 
                  onClick={clearWorkspace}
                  className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
              >
                  Clear Workspace
              </button>
            )}
            {phase === 'table' && (
              <button 
                  onClick={startDrafting}
                  disabled={!instruction.trim() || tasks.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                  <Play className="w-4 h-4" />
                  Generate {tasks.length} Drafts
              </button>
            )}
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto ${phase === 'queue' ? 'bg-white dark:bg-[#161616]' : 'p-6 bg-gray-50/30 dark:bg-[#1c1c1c]/50'} flex flex-col`}>
          {phase === 'upload' && (
            <div className="max-w-xl mx-auto w-full mt-12 bg-white dark:bg-[#1c1c1c] p-8 rounded-2xl shadow-sm dark:shadow-none border border-gray-200 dark:border-white/10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Mass Email Writer</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Upload a CSV file containing your contacts. We&apos;ll analyze each row and generate a custom email draft based on your instructions.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload CSV</label>
                  <input 
                    type="file" 
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-purple-600 hover:border-purple-300 dark:hover:border-purple-600 dark:hover:bg-purple-900/20 hover:bg-purple-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-[#202020]/50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    ) : (
                      <Upload className="w-8 h-8 mb-2" />
                    )}
                    <span className="text-sm font-medium">Click to select CSV file</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'table' && (
             <div className="flex flex-col h-full space-y-6">
                <div className="bg-white dark:bg-[#1c1c1c] p-5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Instructions for AI Drafts</label>
                    <textarea 
                        value={instruction}
                        onChange={e => setInstruction(e.target.value)}
                        placeholder="e.g. Write a cold outreach email pitching our new software. Mention their company name and their role. Keep it short."
                        className="w-full h-24 p-3 text-sm bg-gray-50 dark:bg-[#202020] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none text-gray-900 dark:text-gray-100"
                    />
                </div>

                <div className="flex-1 bg-white dark:bg-[#1c1c1c] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden flex flex-col min-h-[300px]">
                    <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                        <TableIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">CSV Data Preview ({tasks.length} rows)</h3>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-[#202020] sticky top-0 z-10 border-b border-gray-100 dark:border-white/5">
                                <tr>
                                    {headers.map((header, i) => (
                                        <th key={i} className="px-6 py-3 font-medium">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {tasks.map((task, i) => (
                                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-[#202020]">
                                        {headers.map((header, j) => (
                                            <td key={j} className="px-6 py-4 text-gray-700 dark:text-gray-300">
                                                {String(task.data[header] || '')}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
          )}
          
          {phase === 'queue' && (
            <div className="w-full flex flex-col">
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => setActiveTaskId(task.id)}
                  className={`flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5 transition-all cursor-pointer group ${activeTaskId === task.id ? 'bg-purple-50 dark:bg-purple-900/10' : 'bg-white dark:bg-[#161616] hover:bg-gray-50 dark:hover:bg-[#1c1c1c]'}`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <Avatar 
                      name={task.guessedName || 'Unknown'} 
                      email={task.guessedEmail || 'no-email'} 
                      size="sm" 
                      className="w-8 h-8 flex-shrink-0 border border-gray-200 dark:border-white/10" 
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                          {task.guessedName || task.guessedEmail || 'Unknown Contact'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {task.guessedEmail ? `<${task.guessedEmail}>` : 'Missing email'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate opacity-80 mt-0.5">
                        {task.draft ? task.draft.replace(/\n/g, ' ') : (task.status === 'drafting' || task.status === 'pending') ? 'Drafting custom email...' : 'Waiting...'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <div className={`px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide ${
                      task.status === 'pending' ? 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' :
                      task.status === 'drafting' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                      task.status === 'drafted' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                      task.status === 'sending' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                      task.status === 'sent' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                      {task.status}
                      </div>
                      <button 
                          onClick={(e) => handleRemove(task.id, e)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove from queue"
                      >
                          <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar for Review */}
      {activeTask && (
        <div className="flex flex-col h-full bg-white dark:bg-[#161616] z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 w-[50%]">
          <div className="h-[68px] px-5 flex items-center justify-between border-b border-gray-100 dark:border-white/5 flex-shrink-0 bg-gray-50/50 dark:bg-[#1c1c1c]/50">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Review Draft
            </h2>
            <button 
              onClick={() => setActiveTaskId(null)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Person Details at Top */}
            <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-[#1c1c1c]/30 flex-shrink-0">
              <h3 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Contact Details</h3>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {Object.entries(activeTask.data).map(([key, value]) => (
                  <div key={key} className="flex flex-col overflow-hidden">
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase truncate">{key}</span>
                    <span className="text-xs text-gray-900 dark:text-gray-100 font-medium truncate" title={String(value)}>{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Draft Below */}
            <div className="flex-1 flex flex-col bg-white dark:bg-[#161616]">
              <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50 dark:border-white/5 flex-shrink-0 sticky top-0 bg-white dark:bg-[#161616] z-10">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email Draft</h3>
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

              {(activeTask.status === 'drafting' || activeTask.status === 'pending') ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 space-y-3 p-5">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="text-sm">Generating personalized draft...</span>
                </div>
              ) : activeTask.status === 'error' ? (
                <div className="text-sm text-red-600 p-4 m-5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                  {activeTask.error}
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {isEditingDraft ? (
                    <div className="flex-1 flex p-5">
                        <textarea
                          value={activeTask.draft}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, draft: val } : t));
                          }}
                          className="flex-1 w-full min-h-[300px] text-sm text-gray-800 dark:text-gray-200 p-4 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none font-sans leading-relaxed shadow-inner"
                        />
                    </div>
                  ) : (
                    <div className="flex-1 p-5">
                        <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">
                          {activeTask.draft}
                        </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Sticky Send Button at Bottom */}
          {activeTask.status !== 'drafting' && activeTask.status !== 'pending' && activeTask.status !== 'error' && (
            <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#161616] flex-shrink-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
              <button
                onClick={() => {
                  setIsEditingDraft(false);
                  handleSend(activeTask);
                }}
                disabled={activeTask.status === 'sending' || activeTask.status === 'sent' || !activeTask.guessedEmail}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white text-base font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
              >
                {activeTask.status === 'sending' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : activeTask.status === 'sent' ? (
                  <>
                    <Check className="w-5 h-5" />
                    Sent!
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Approve & Send
                  </>
                )}
              </button>
              {!activeTask.guessedEmail && (
                  <p className="text-xs text-red-500 dark:text-red-400 text-center mt-2">Cannot send: No email address found in CSV data.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
