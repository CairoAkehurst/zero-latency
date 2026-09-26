const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

const shortcutsUI = `
            {current.id === 'shortcuts' && (
              <div className="zl-form-grid">
                <Row title="Compose" desc={<kbd className="zl-kbd">C</kbd>} />
                <Row title="Search" desc={<kbd className="zl-kbd">/</kbd>} />
                <Row title="Reply" desc={<kbd className="zl-kbd">R</kbd>} />
                <Row title="Archive" desc={<kbd className="zl-kbd">E</kbd>} />
                <Row title="Delete" desc={<kbd className="zl-kbd">#</kbd>} />
              </div>
            )}
`;

content = content.replace(
  /\{current\.id === 'shortcuts' && \([\s\S]*?<\/>\n            \)\}/,
  shortcutsUI.trim()
);

fs.writeFileSync('src/components/SettingsModal.tsx', content);
