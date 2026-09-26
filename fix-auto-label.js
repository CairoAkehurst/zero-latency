const fs = require('fs');
let content = fs.readFileSync('src/components/AutoLabelDialog.tsx', 'utf8');

// Replace the broken backticks
content = content.replace(/alert\\\(\\\`Failed to create label: \\\$\\{data\.error\\}\\\`\\\);/g, 'alert(`Failed to create label: ${data.error}`);');
content = content.replace(/alert\\\(\`Failed to create label: \\\$\\{data\.error\\}\`\\\);/g, 'alert(`Failed to create label: ${data.error}`);');

fs.writeFileSync('src/components/AutoLabelDialog.tsx', content);
