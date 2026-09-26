const fs = require('fs');

let root = fs.readFileSync('src/app/layout.tsx', 'utf8');
root = root.replace(
  /body className="antialiased h-\[100dvh\] flex overflow-hidden bg-\[#f7f7f5\] p-2 gap-2"/,
  'body className="antialiased h-[100dvh] flex overflow-hidden bg-[#f7f7f5]"'
);
fs.writeFileSync('src/app/layout.tsx', root);

let inbox = fs.readFileSync('src/app/(inbox)/layout.tsx', 'utf8');
inbox = inbox.replace(
  /main className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm border border-gray-200\/50"/,
  'main className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-200/50 my-2 mr-2"'
);
fs.writeFileSync('src/app/(inbox)/layout.tsx', inbox);
