const fs = require('fs');

let content = fs.readFileSync('src/components/LaunchClient.tsx', 'utf8');

// 1. Sidebar width adjustments
content = content.replace(
  `style={{ width: activeTask ? 'calc(100% - 400px)' : '100%' }}`,
  `style={{ width: activeTask ? '50%' : '100%' }}`
);

// We need to change w-[400px] on the sidebar to w-[50%]
content = content.replace(
  `flex-shrink-0 w-[400px] border-l`,
  `flex-shrink-0 w-[50%] border-l`
);

// 2. Change the Queue Grid into a List
const gridMatch = /\{phase === 'queue' && \([\s\S]*?className=\{`w-full grid gap-5[^>]*>\n\s*\{tasks.map\(task => \(\n\s*<div\n\s*key=\{task.id\}[\s\S]*?<div className="flex-1 text-sm text-gray-700[^>]*>[\s\S]*?<\/div>\n\s*<\/div>\n\s*\)\)}\n\s*<\/div>\n\s*\)\}/;

const newQueueList = `{phase === 'queue' && (
            <div className="w-full flex flex-col">
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => setActiveTaskId(task.id)}
                  className={\`flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5 transition-all cursor-pointer group \${activeTaskId === task.id ? 'bg-purple-50 dark:bg-purple-900/10' : 'bg-white dark:bg-[#161616] hover:bg-gray-50 dark:hover:bg-[#1c1c1c]'}\`}
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
                          {task.guessedEmail ? \`<\${task.guessedEmail}>\` : 'Missing email'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate opacity-80 mt-0.5">
                        {task.draft ? task.draft.replace(/\\n/g, ' ') : (task.status === 'drafting' || task.status === 'pending') ? 'Drafting custom email...' : 'Waiting...'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <div className={\`px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide \${
                      task.status === 'pending' ? 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' :
                      task.status === 'drafting' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                      task.status === 'drafted' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                      task.status === 'sending' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                      task.status === 'sent' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }\`}>
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
          )}`;

content = content.replace(gridMatch, newQueueList);

// Note: To remove padding from the container if it's in queue phase to let the list touch the edges like inbox
content = content.replace(
  `<div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-[#1c1c1c]/50 flex flex-col">`,
  `<div className={\`flex-1 overflow-y-auto \${phase === 'queue' ? 'bg-white dark:bg-[#161616]' : 'p-6 bg-gray-50/30 dark:bg-[#1c1c1c]/50'} flex flex-col\`}>`
);

// 3. Move the Send Button to the bottom (sticky)
// First, extract the button block from the top of the draft
const topButtonRegex = /<div className="pb-4 mb-2">[\s\S]*?<\/div>\s*\{isEditingDraft \?/g;
const buttonBlockMatch = content.match(/<div className="pb-4 mb-2">[\s\S]*?<\/div>/);
if (buttonBlockMatch) {
  let buttonBlock = buttonBlockMatch[0];
  content = content.replace(topButtonRegex, '{isEditingDraft ?');
  
  // Make the button sticky and style it for the bottom
  const stickyButtonBlock = buttonBlock
      .replace('pb-4 mb-2', 'p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#1c1c1c] sticky bottom-0 z-20 mt-auto shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]')
      .replace('py-4 bg-purple-600', 'py-3.5 bg-purple-600');
  
  // Append it to the very bottom of the sidebar flex column
  // Find the end of the sidebar's <div className="flex-1 flex flex-col bg-white dark:bg-[#161616]">...</div>
  // The sidebar has `{/* Draft Below */}`
  // Let's insert it before the closing tags of the sidebar.
  
  const insertIndex = content.lastIndexOf('</div>\n              )}\n            </div>\n          </div>\n        </div>\n      )}');
  if (insertIndex !== -1) {
    // Wait, the structure is:
    // {(activeTask.status === 'drafting') ? ... : (
    //   <div className="flex-1 flex flex-col">
    //     {isEditing...}
    //     ... (end of flex-col)
    //   </div>
    // )}
    // We want the sticky button to be visible ALWAYS at the bottom of the sidebar as long as it's not error or drafting.
    // So right inside the `<div className="flex-1 flex flex-col">` at the end.
    const endFlexColMatch = /<\/div>\s*\}\)\s*<\/div>\s*<\/div>\s*<\/div>\s*\}\)\s*<\/div>/; // Hard to regex
  }
}

fs.writeFileSync('src/components/LaunchClient.tsx', content);
