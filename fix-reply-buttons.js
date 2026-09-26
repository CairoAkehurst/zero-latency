const fs = require('fs');
let content = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

// First, fix the syntax error at the bottom
content = content.replace(
  /\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/g,
  `</div>\n      </div>\n    </div>\n  );\n}`
);

// Now apply the conditional render
const buttonsHtml = `
          {!replyMode ? (
            <div className="flex items-center gap-3 mt-4 mb-4">
              <button onClick={() => { setReplyMode('reply'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 shadow-sm">
                <Reply className="w-4 h-4" /> Reply
              </button>
              <button onClick={() => { setReplyMode('replyAll'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 shadow-sm">
                <ReplyAll className="w-4 h-4" /> Reply all
              </button>
              <button onClick={() => { setReplyMode('forward'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 shadow-sm">
                <Forward className="w-4 h-4" /> Forward
              </button>
            </div>
          ) : (
`;

content = content.replace(
  /<div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden flex flex-col transition-all">/,
  `${buttonsHtml}\n            <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden flex flex-col transition-all relative">\n              <button onClick={() => setReplyMode(null)} className="absolute top-3 right-3 p-1 text-gray-400 hover:bg-gray-100 rounded-md z-10"><X className="w-4 h-4"/></button>`
);

content = content.replace(
  /<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/,
  `</div>\n          )}\n        </div>\n      </div>\n    </div>\n  );\n}`
);

fs.writeFileSync('src/components/EmailDetailPeek.tsx', content);
