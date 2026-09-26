const fs = require('fs');

let content = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

// Hide the expand/minimize button
content = content.replace(
  /<button onClick=\{onExpand\} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors" title=\{isFullView \? "Collapse" : "Expand"\}>\s*\{isFullView \? <Minimize2 className="w-4 h-4" \/> : <Maximize2 className="w-4 h-4" \/>\}\s*<\/button>/,
  ``
);

fs.writeFileSync('src/components/EmailDetailPeek.tsx', content);
