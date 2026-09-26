const fs = require('fs');

// 1. Root Layout: add pt-2
let rootContent = fs.readFileSync('src/app/layout.tsx', 'utf8');
rootContent = rootContent.replace(
  'body className="antialiased h-screen flex overflow-hidden bg-[#f7f7f5]"',
  'body className="antialiased h-[100dvh] flex overflow-hidden bg-[#f7f7f5] pt-2"'
);
fs.writeFileSync('src/app/layout.tsx', rootContent);

// 2. Inbox Layout: remove mt-2
let inboxContent = fs.readFileSync('src/app/(inbox)/layout.tsx', 'utf8');
inboxContent = inboxContent.replace(
  'main className="flex-1 overflow-y-auto bg-white rounded-tl-2xl border-t border-l border-gray-200/50 mt-2"',
  'main className="flex-1 overflow-y-auto bg-white rounded-tl-2xl border-t border-l border-gray-200/50"'
);
fs.writeFileSync('src/app/(inbox)/layout.tsx', inboxContent);
