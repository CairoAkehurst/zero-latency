const fs = require('fs');

let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (!content.includes('AutoLabelDialog')) {
  content = content.replace(
    /import \{ useState, useEffect \} from 'react';/,
    `import { useState, useEffect } from 'react';\nimport { AutoLabelDialog } from './AutoLabelDialog';`
  );
}

// Remove the inline input logic from render
const inlineInputMatch = /\{isAddingLabel && \([\s\S]*?className="w-full bg-transparent border-none outline-none text-sm text-gray-700"\s*placeholder="New label\.\.\."\s*\/>\s*<\/div>\s*\)\}/;
content = content.replace(inlineInputMatch, '');

// Render AutoLabelDialog if isAddingLabel is true
content = content.replace(
  /<\/aside>\n  \);\n\}/,
  `    {isAddingLabel && (
        <AutoLabelDialog 
          onClose={() => setIsAddingLabel(false)} 
          onSuccess={() => {
            fetchLabels();
          }} 
        />
      )}
    </aside>
  );
}`
);

fs.writeFileSync('src/components/Sidebar.tsx', content);
