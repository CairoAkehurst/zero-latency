const fs = require('fs');
let content = fs.readFileSync('src/app/api/send/route.ts', 'utf8');

content = content.replace(
  /const \{ toEmail, ccEmail, bccEmail, subject, body, threadId, messageId \} = await request\.json\(\);/,
  `const { toEmail, ccEmail, bccEmail, subject, body, threadId, messageId, references } = await request.json();`
);

content = content.replace(
  /if \(threadId\) \{\n\s*messageParts\.push\(\`In-Reply-To: \$\{messageId \|\| ''\}\`\);\n\s*messageParts\.push\(\`References: \$\{messageId \|\| ''\}\`\);\n\s*\}/,
  `if (threadId) {
      if (messageId) messageParts.push(\`In-Reply-To: \${messageId}\`);
      const refStr = [references, messageId].filter(Boolean).join(' ');
      if (refStr) messageParts.push(\`References: \${refStr}\`);
    }`
);

fs.writeFileSync('src/app/api/send/route.ts', content);
