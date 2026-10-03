const fs = require('fs');

let content = fs.readFileSync('src/components/LaunchClient.tsx', 'utf8');

// The block to move
const buttonBlock = `                  <div className="pt-4 mt-auto">
                    <button
                      onClick={() => {
                        setIsEditingDraft(false);
                        handleSend(activeTask);
                      }}
                      disabled={activeTask.status === 'sending' || activeTask.status === 'sent' || !activeTask.guessedEmail}
                      className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white text-base font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
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
                  </div>`;

// Replace it with nothing where it currently is
content = content.replace(buttonBlock, '');

// The block to insert
const newButtonBlock = buttonBlock.replace('pt-4 mt-auto', 'pb-4 mb-2');

// Insert it right after <div className="flex-1 flex flex-col">
// But wait, there are multiple "flex-1 flex flex-col". We want the one inside activeTask.status condition.
content = content.replace(
  /<div className="flex-1 flex flex-col">\s*\{isEditingDraft \?/g,
  `<div className="flex-1 flex flex-col">\n${newButtonBlock}\n                  {isEditingDraft ?`
);

fs.writeFileSync('src/components/LaunchClient.tsx', content);
