const fs = require('fs');
let content = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

content = content.replace(
  /const \[sendSuccess, setSendSuccess\] = useState\(false\);/,
  `const [sendSuccess, setSendSuccess] = useState(false);\n  const [replyMode, setReplyMode] = useState<'reply'|'replyAll'|'forward'|null>(null);`
);

// We need to inject the buttons before the composer, and wrap the composer in a check for replyMode
const buttonsHtml = `
          {!replyMode ? (
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setReplyMode('reply')} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2">
                <Reply className="w-4 h-4" /> Reply
              </button>
              <button onClick={() => setReplyMode('replyAll')} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2">
                <ReplyAll className="w-4 h-4" /> Reply all
              </button>
              <button onClick={() => setReplyMode('forward')} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full text-sm transition-colors flex items-center gap-2">
                <Forward className="w-4 h-4" /> Forward
              </button>
            </div>
          ) : (
`;

content = content.replace(
  /\{\/\* Quick Reply Box \*\/\}/,
  `{/* Reply Action Buttons */}\n${buttonsHtml}\n\n          {/* Quick Reply Box */}`
);

// We need to close the `) : (` for the conditional render
content = content.replace(
  /<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/,
  `</div>\n          )} \n        </div>\n      </div>\n    </div>\n  );\n}`
);

// We need to import ReplyAll and Forward from lucide-react
if (!content.includes('ReplyAll')) {
  content = content.replace(
    /Reply, /,
    `Reply, ReplyAll, Forward, `
  );
}

fs.writeFileSync('src/components/EmailDetailPeek.tsx', content);
