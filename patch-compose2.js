const fs = require('fs');
let content = fs.readFileSync('src/components/ComposeEmail.tsx', 'utf8');

const effect = `
  useEffect(() => {
    if (signatureEnabled && !body) {
      setBody("<br><br><div>-- <br>Sent from AgentMail</div>");
      const el = document.querySelector('[data-placeholder="Write, or press space for AI, “/” for commands"]');
      if (el && !el.innerHTML) el.innerHTML = "<br><br><div>-- <br>Sent from AgentMail</div>";
    }
  }, []);
`;

content = content.replace(
  /const \[bccText, setBccText\] = useState\(""\);/,
  `const [bccText, setBccText] = useState("");\n\n${effect}`
);

if (!content.includes('import { useState, useEffect }')) {
  content = content.replace(/import \{ useState \} from "react";/, 'import { useState, useEffect } from "react";');
}
if (!content.includes('useAccountDataStore')) {
  content = content.replace(/import \{ useState, useEffect \} from "react";/, 'import { useState, useEffect } from "react";\nimport { useAccountDataStore } from "@/lib/client/store";');
}

fs.writeFileSync('src/components/ComposeEmail.tsx', content);
