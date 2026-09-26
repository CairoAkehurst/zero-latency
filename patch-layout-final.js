const fs = require('fs');

let root = fs.readFileSync('src/app/layout.tsx', 'utf8');
root = root.replace(
  'body className="antialiased h-[100dvh] flex overflow-hidden bg-[#f7f7f5] pt-2"',
  'body className="antialiased h-[100dvh] flex overflow-hidden bg-[#f7f7f5] p-2 gap-2"'
);
fs.writeFileSync('src/app/layout.tsx', root);

let inbox = fs.readFileSync('src/app/(inbox)/layout.tsx', 'utf8');
inbox = inbox.replace(
  'main className="flex-1 overflow-y-auto bg-white rounded-tl-2xl border-t border-l border-gray-200/50"',
  'main className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm border border-gray-200/50"'
);
fs.writeFileSync('src/app/(inbox)/layout.tsx', inbox);

let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  'aside className="w-64 flex-shrink-0 flex flex-col h-full bg-[#f7f7f5] text-sm text-gray-700 relative z-10"',
  'aside className="w-64 flex-shrink-0 flex flex-col h-full bg-transparent text-sm text-gray-700 relative z-10"'
);
fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
