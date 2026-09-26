const fs = require('fs');
let content = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

content = content.replace(
  /bcc\?: string;\n  \} \| null;/,
  `bcc?: string;\n    message_id_header?: string;\n    references_header?: string;\n  } | null;`
);

// We need to pass message_id_header and references_header in the /api/send payload
content = content.replace(
  /threadId: email\.google_thread_id,\n\s*messageId: email\.google_message_id/,
  `threadId: email.google_thread_id,\n          messageId: email.message_id_header,\n          references: email.references_header`
);

// Add signature to draft
content = content.replace(
  /const \[draftText, setDraftText\] = useState\(""\);/,
  `const [draftText, setDraftText] = useState("");\n  const { signatureEnabled } = useAccountDataStore();`
);

// We need to import useAccountDataStore
content = content.replace(
  /import \{ formatEmailDate \} from "@\/utils\/formatDate";/,
  `import { formatEmailDate } from "@/utils/formatDate";\nimport { useAccountDataStore } from "@/lib/client/store";`
);

// Update init useEffect to add signature
content = content.replace(
  /setDraftText\(""\);\n\s*setCcText\(""\);/,
  `setDraftText("");\n      if (signatureEnabled) {\n        setDraftText("<br><br><div>-- <br>Sent from AgentMail</div>");\n        if (replyRef.current) replyRef.current.innerHTML = "<br><br><div>-- <br>Sent from AgentMail</div>";\n      }\n      setCcText("");`
);

fs.writeFileSync('src/components/EmailDetailPeek.tsx', content);
