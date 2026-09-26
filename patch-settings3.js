const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

// Add Zustand imports and update state
const imports = `
import { useSettingsStore, useAccountDataStore } from '@/lib/client/store';
`;
content = content.replace(/import \{ Popover \} from '\.\/ui';/, `import { Popover } from './ui';\n${imports}`);

content = content.replace(
  /const \[theme, setTheme\] = useState\('system'\);\n  const \[threadStyle, setThreadStyle\] = useState\('side'\);\n  const \[autoAdvance, setAutoAdvance\] = useState\('next'\);\n  const \[fontSize, setFontSize\] = useState\('default'\);/,
  `const { theme, setTheme, threadStyle, setThreadStyle, autoAdvance, setAutoAdvance, fontSize, setFontSize } = useSettingsStore();
  const { snippets, signatureEnabled, updateAccount } = useAccountDataStore();
  const [editingSnippet, setEditingSnippet] = useState<any>(null);`
);

const snippetsCode = `
            {current.id === 'snippets' && (
              <>
                <Row title="Snippets" desc="Reusable text. Put {{availability}} in a snippet to insert open times from your calendar.">
                  <button className="zl-btn zl-btn--secondary" onClick={() => setEditingSnippet({ id: Math.random().toString(), name: '', body: '' })}><Icon name="plus" />New snippet</button>
                </Row>
                {editingSnippet ? (
                  <div className="zl-form-grid">
                    <div className="zl-field"><label className="zl-field-label">Name</label><input autoFocus value={editingSnippet.name} onChange={e => setEditingSnippet({...editingSnippet, name: e.target.value})} className="zl-input" /></div>
                    <div className="zl-field"><label className="zl-field-label">Text</label><textarea value={editingSnippet.body} onChange={e => setEditingSnippet({...editingSnippet, body: e.target.value})} className="zl-input zl-textarea" rows={4} /></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="zl-btn zl-btn--primary" onClick={() => {
                        updateAccount(d => ({ ...d, snippets: [...d.snippets.filter(s => s.id !== editingSnippet.id), editingSnippet] }));
                        setEditingSnippet(null);
                      }}>Save snippet</button>
                      <button className="zl-btn zl-btn--ghost" onClick={() => setEditingSnippet(null)}>Cancel</button>
                    </div>
                  </div>
                ) : null}
                <div className="zl-list-card mt-4">
                  {snippets.length === 0 && !editingSnippet ? <p className="zl-field-hint">No snippets yet.</p> : null}
                  {snippets.map(s => (
                    <div key={s.id} className="zl-list-card-row">
                      <span className="zl-setting-text"><strong>{s.name}</strong><small>{s.body}</small></span>
                      <button className="zl-btn zl-btn--text zl-btn--sm" onClick={() => setEditingSnippet(s)}>Edit</button>
                      <button className="zl-btn zl-btn--danger zl-btn--sm" onClick={() => updateAccount(d => ({ ...d, snippets: d.snippets.filter(x => x.id !== s.id) }))}>Delete</button>
                    </div>
                  ))}
                </div>
              </>
            )}
`;

const shortcutsCode = `
            {current.id === 'shortcuts' && (
              <>
                <Row title="Compose" desc="C" />
                <Row title="Search" desc="/" />
                <Row title="Reply" desc="R" />
                <Row title="Archive" desc="E" />
                <Row title="Delete" desc="#" />
              </>
            )}
`;

content = content.replace(
  /\{current\.id !== 'inbox' && current\.id !== 'account' && \(\s*<p className="zl-field-hint">These settings will be configurable in a future update\.<\/p>\s*\)\}/,
  `${snippetsCode}\n${shortcutsCode}\n{current.id !== 'inbox' && current.id !== 'account' && current.id !== 'snippets' && current.id !== 'shortcuts' && (<p className="zl-field-hint">These settings will be configurable in a future update.</p>)}`
);

fs.writeFileSync('src/components/SettingsModal.tsx', content);
