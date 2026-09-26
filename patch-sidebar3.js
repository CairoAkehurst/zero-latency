const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// The dropdown has:
// <button onClick={() => { setShowDropdown(false); window.dispatchEvent(new CustomEvent('open-settings', { detail: 'inbox' })); }}
// ... Settings
// ... Appearance
// Add Keyboard Shortcuts
const shortcutsBtn = `
                  <button 
                    onClick={() => {
                      setShowDropdown(false);
                      window.dispatchEvent(new CustomEvent('open-settings', { detail: 'shortcuts' }));
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Keyboard shortcuts
                  </button>
`;

content = content.replace(
  /Appearance\s*<\/button>/,
  `Appearance\n                  </button>\n${shortcutsBtn}`
);

fs.writeFileSync('src/components/Sidebar.tsx', content);
