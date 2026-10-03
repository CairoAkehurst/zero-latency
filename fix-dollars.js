const fs = require('fs');
let code = fs.readFileSync('src/components/LaunchClient.tsx', 'utf8');

// Replace \${ with ${
code = code.replace(/\\\$\{/g, '${');

fs.writeFileSync('src/components/LaunchClient.tsx', code);
