const fs = require('fs');

const ui = `
  return (
    <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
      
      {/* Standard Header */}
      <header className="h-[60px] px-6 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-gray-700" />
          <h1 className="text-[18px] font-semibold text-gray-900 tracking-tight">Priority Inbox</h1>
          <span className="text-sm text-gray-400 font-normal">Top summaries & suggested actions</span>
        </div>
      </header>

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {emails.map((email) => (
            <div key={email.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium flex-shrink-0">
                    {email.sender_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{email.sender_name}</h3>
                    <p className="text-xs text-gray-500 truncate">{email.subject}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatEmailDate(email.timestamp)}</span>
              </div>
              
              <div className="flex-1 text-sm text-gray-700 leading-relaxed mb-4">
                <span className="font-medium text-gray-900 mr-1">Summary:</span>
                {email.summary || email.snippet}
              </div>

              {email.hasAiMetadata && email.suggestedReply ? (
                <div className="pt-3 border-t border-gray-100 flex items-center gap-2 mt-auto">
                  <button 
                    onClick={() => handleAction(email, 'yes')}
                    className="flex-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve Reply
                  </button>
                  <button 
                    onClick={() => alert("Suggested Reply: " + email.suggestedReply)}
                    className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors text-center"
                  >
                    View Draft
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-50 mt-auto">
                  <span className="text-xs text-gray-400 italic">No automated actions suggested.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
`;

let content = fs.readFileSync('src/components/AiSummaryClient.tsx', 'utf8');
content = content.replace(
  /return \(\n    <div className="flex-1 flex flex-col h-full bg-gray-50 relative overflow-y-auto p-8">[\s\S]*?\n  \);\n\}/,
  `${ui.trim()}\n}`
);

fs.writeFileSync('src/components/AiSummaryClient.tsx', content);
