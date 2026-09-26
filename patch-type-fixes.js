const fs = require('fs');

// SettingsModal Row Fix
let settings = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');
settings = settings.replace(
  /function Row\(\{ title, desc, children \}: \{ title: string; desc\?: string; children\?: React\.ReactNode \}\)/,
  `function Row({ title, desc, children }: { title: string; desc?: React.ReactNode; children?: React.ReactNode })`
);
fs.writeFileSync('src/components/SettingsModal.tsx', settings);

// ComposeEmail store import fix
let compose = fs.readFileSync('src/components/ComposeEmail.tsx', 'utf8');
if (!compose.includes('import { useAccountDataStore }')) {
  compose = compose.replace(
    /import \{ useState, useEffect \} from "react";/,
    `import { useState, useEffect } from "react";\nimport { useAccountDataStore } from "@/lib/client/store";`
  );
}
// Any missing `s` implicitly any in ComposeEmail snippet mapping
compose = compose.replace(
  /snippets\.map\(s => \(/,
  `snippets.map((s: any) => (`
);
fs.writeFileSync('src/components/ComposeEmail.tsx', compose);
