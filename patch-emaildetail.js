const fs = require('fs');
let content = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

// 1. Fix wrapping names
content = content.replace(
  /<div className="font-medium text-\[#111111\] leading-tight">\{email\.sender_name\}<\/div>/g,
  '<div className="font-medium text-[#111111] leading-tight truncate max-w-[200px]">{email.sender_name}</div>'
);

// 2. Fix the email buttons
content = content.replace(
  /<button\s+className="p-1\.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"[^>]*>\s*<Archive className="w-4 h-4" \/>\s*<\/button>/g,
  `<button onClick={async () => { await fetch('/api/mail/modify', { method: 'POST', body: JSON.stringify({ id: email.google_message_id, action: 'archive' }) }); onClose(); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors" title="Archive"><Archive className="w-4 h-4" /></button>`
);

content = content.replace(
  /<button\s+className="p-1\.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"[^>]*>\s*<Trash2 className="w-4 h-4" \/>\s*<\/button>/g,
  `<button onClick={async () => { await fetch('/api/mail/modify', { method: 'POST', body: JSON.stringify({ id: email.google_message_id, action: 'trash' }) }); onClose(); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>`
);

content = content.replace(
  /<button\s+className="p-1\.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"[^>]*>\s*<Mail className="w-4 h-4" \/>\s*<\/button>/g,
  `<button onClick={async () => { await fetch('/api/mail/modify', { method: 'POST', body: JSON.stringify({ id: email.google_message_id, action: 'unread' }) }); onClose(); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors" title="Mark Unread"><Mail className="w-4 h-4" /></button>`
);

// 3. Fix fonts for HTML rendering
content = content.replace(
  /<div\s+className="text-\[14px\] text-\[#111111\] leading-\[1\.5\]"\s+dangerouslySetInnerHTML=\{\{ __html: email\.body_html \}\}\s*\/>/g,
  '<div className="text-[14px] text-[#111111] leading-[1.5] email-html-container overflow-x-auto" dangerouslySetInnerHTML={{ __html: email.body_html }} />'
);

// 4. Update the Compose Area (Reply Box) to look like Composer.tsx parity
// This is currently a contentEditable div. The user wants the style to be the same as Claude repo.
// We will replace the entire Reply box footer with a much closer replica of the Claude Composer.
const replyBoxRegex = /\{\/\* Composer \*\/\}\s*<div className="mx-5 mb-5[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
// Let's do a more targeted replace of the composer section.
const newComposer = `
        {/* Composer */}
        <div className="mx-5 mb-5 flex-shrink-0 mt-6 shadow-sm border border-gray-200 rounded-xl bg-white focus-within:ring-1 focus-within:ring-blue-500 transition-all overflow-hidden relative">
          <div className="flex flex-col">
            <div className="flex items-center px-4 py-2 border-b border-gray-100 bg-gray-50/50">
              <span className="text-sm text-gray-500 w-10">To:</span>
              <input type="text" value={toText} onChange={e => setToText(e.target.value)} className="flex-1 bg-transparent border-none text-sm focus:ring-0 p-0 text-gray-900 outline-none" />
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

            <div
              ref={replyRef}
              contentEditable
              onInput={e => setDraftText(e.currentTarget.innerHTML)}
              className="px-4 py-3 min-h-[100px] text-[14px] text-gray-900 focus:outline-none"
              data-placeholder="Write, or press space for AI, “/” for commands"
            />

            {/* Formatting Toolbar */}
            <div className="px-3 py-2 flex items-center justify-between border-t border-gray-100 bg-white">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSend}
                  disabled={isSending || !draftText.trim()}
                  className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                </button>
                
                <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                
                {/* Parity formatting buttons */}
                <button onClick={() => applyFormat('bold')} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Bold (Cmd+B)"><Bold className="w-4 h-4" /></button>
                <button onClick={() => applyFormat('italic')} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Italic (Cmd+I)"><Italic className="w-4 h-4" /></button>
                <button onClick={() => applyFormat('underline')} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Underline (Cmd+U)"><Underline className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center gap-1.5" title="Help me write">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-medium text-purple-600">AI</span>
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Attach file">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button onClick={handleDiscard} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Discard">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const startIndex = content.indexOf('{/* Composer */}');
if (startIndex !== -1) {
  content = content.substring(0, startIndex) + newComposer;
}

fs.writeFileSync('src/components/EmailDetailPeek.tsx', content);
