const fs = require('fs');
let content = fs.readFileSync('src/app/api/mail/labels/route.ts', 'utf8');

content = content.replace(
  /const \{ name \} = await request\.json\(\);/,
  `const { name, instruction } = await request.json();`
);

content = content.replace(
  /const prompt = \`Which of these emails belongs in the label\/category "\$\{name\}"\?\\n/,
  `const prompt = \`Which of these emails belongs in the label/category "\${name}"?\\n\${instruction ? \`Rule description: "\${instruction}"\\n\` : ''}`
);

fs.writeFileSync('src/app/api/mail/labels/route.ts', content);
