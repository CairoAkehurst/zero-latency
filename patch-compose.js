const fs = require('fs');
let content = fs.readFileSync('src/components/ComposeEmail.tsx', 'utf8');

// Import store
if (!content.includes('useAccountDataStore')) {
  content = content.replace(
    /import \{ useState, useEffect \} from "react";/,
    `import { useState, useEffect } from "react";\nimport { useAccountDataStore } from "@/lib/client/store";`
  );
}

// Extract signatureEnabled
content = content.replace(
  /const \[isSending, setIsSending\] = useState\(false\);/,
  `const [isSending, setIsSending] = useState(false);\n  const { signatureEnabled } = useAccountDataStore();`
);

// Init body
content = content.replace(
  /const \[body, setBody\] = useState\(""\);/,
  `const [body, setBody] = useState("");`
);

// On mount effect for signature
content = content.replace(
  /useEffect\(\(\) => \{/,
  `useEffect(() => {
    if (signatureEnabled && !body) {
      setBody("<br><br><div>-- <br>Sent from AgentMail</div>");
      const el = document.querySelector('[data-placeholder="Write, or press space for AI, “/” for commands"]');
      if (el && !el.innerHTML) el.innerHTML = "<br><br><div>-- <br>Sent from AgentMail</div>";
    }
    const handleOpen = () => setIsOpen(true);
`
);
content = content.replace(
  /const handleOpen = \(\) => setIsOpen\(true\);\n\s*window\.addEventListener\('open-compose', handleOpen\);/,
  `const handleOpen = () => setIsOpen(true);\n    window.addEventListener('open-compose', handleOpen);`
);

fs.writeFileSync('src/components/ComposeEmail.tsx', content);
