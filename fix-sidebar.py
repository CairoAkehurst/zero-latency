import re

with open('src/components/LaunchClient.tsx', 'r') as f:
    content = f.read()

# We want to replace everything from {/* Right Sidebar for Review */} to the end of the file
sidebar_start = content.find('{/* Right Sidebar for Review */}')

if sidebar_start != -1:
    before_sidebar = content[:sidebar_start]
    
    new_sidebar = """{/* Right Sidebar for Review */}
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
"""
    with open('src/components/LaunchClient.tsx', 'w') as f:
        f.write(before_sidebar + new_sidebar)
    print("Done")
