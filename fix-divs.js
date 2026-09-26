const fs = require('fs');
let content = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

content = content.replace(
  /          \)\}\n        <\/div>\n      <\/div>\n    <\/div>\n  \);\n\}/,
  `            </div>\n          </div>\n          )}\n        </div>\n      </div>\n    </div>\n  );\n}`
);

fs.writeFileSync('src/components/EmailDetailPeek.tsx', content);
