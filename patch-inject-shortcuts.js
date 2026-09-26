const fs = require('fs');

let root = fs.readFileSync('src/app/layout.tsx', 'utf8');
root = root.replace(
  'import "./globals.css";',
  'import "./globals.css";\nimport { ShortcutHandler } from "@/components/ShortcutHandler";'
);
root = root.replace(
  '{children}',
  '{children}\n        <ShortcutHandler />'
);
fs.writeFileSync('src/app/layout.tsx', root);
