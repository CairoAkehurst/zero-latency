const fs = require('fs');
let content = fs.readFileSync('src/components/ComposeEmail.tsx', 'utf8');

// Replace everything inside the Content div with the new unified Composer look.
const newContent = `
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
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center gap-1.5" title="Help me write">
                  <Sparkles className="w-4 h-4 text-purple-500" />
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
`;

const startIndex = content.indexOf('{/* Content */}');
if (startIndex !== -1) {
  content = content.substring(0, startIndex) + newContent;
}

// Add state for Cc/Bcc
content = content.replace(
  /const \[isSending, setIsSending\] = useState\(false\);/,
  `const [isSending, setIsSending] = useState(false);\n  const [showCcBcc, setShowCcBcc] = useState(false);\n  const [ccText, setCcText] = useState("");\n  const [bccText, setBccText] = useState("");`
);

// Add missing lucide icons
if (!content.includes('Trash2')) {
  content = content.replace(
    /import \{ X, Send, Loader2, Maximize2, Minimize2 \} from "lucide-react";/,
    `import { X, Send, Loader2, Maximize2, Minimize2, Bold, Italic, Underline, Sparkles, Paperclip, Trash2 } from "lucide-react";`
  );
}

fs.writeFileSync('src/components/ComposeEmail.tsx', content);
