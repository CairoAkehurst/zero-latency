const fs = require('fs');
let content = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

const buttonsHtml = `
          {!replyMode ? (
            <div className="flex items-center gap-3 mt-8 mb-12">
              <button onClick={() => { setReplyMode('reply'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 shadow-sm">
                <Reply className="w-4 h-4" /> Reply
              </button>
              <button onClick={() => { setReplyMode('replyAll'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 shadow-sm">
                <ReplyAll className="w-4 h-4" /> Reply all
              </button>
              <button onClick={() => { setReplyMode('forward'); setTimeout(() => replyRef.current?.focus(), 50); }} className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2 border border-gray-200 shadow-sm">
                <Forward className="w-4 h-4" /> Forward
              </button>
            </div>
          ) : (
`;

// Insert the buttonsHtml right before the composer container
content = content.replace(
  /<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6 mb-8 flex flex-col focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">/,
  `${buttonsHtml}\n          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6 mb-8 flex flex-col focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">`
);

// Close the conditional render
content = content.replace(
  /<\/div>\n        <\/div>\n      <\/div>\n    <\/div>\n  \);\n\}/,
  `</div>\n          )}\n        </div>\n      </div>\n    </div>\n  );\n}`
);

// Make sure state is there
if (!content.includes('replyMode')) {
  content = content.replace(
    /const \[sendSuccess, setSendSuccess\] = useState\(false\);/,
    `const [sendSuccess, setSendSuccess] = useState(false);\n  const [replyMode, setReplyMode] = useState<'reply'|'replyAll'|'forward'|null>(null);`
  );
}

// Ensure imports
if (!content.includes('ReplyAll')) {
  content = content.replace(
    /Reply, /,
    `Reply, ReplyAll, Forward, `
  );
}

fs.writeFileSync('src/components/EmailDetailPeek.tsx', content);
