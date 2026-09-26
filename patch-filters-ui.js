const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

// We need an array for filters in store
// In store.ts:
let store = fs.readFileSync('src/lib/client/store.ts', 'utf8');
if (!store.includes('filters: ')) {
  store = store.replace(/snippets: Snippet\[\];/, `snippets: Snippet[];\n  filters: { id: string; from: string; label: string }[];`);
  store = store.replace(/snippets: \[\],/, `snippets: [],\n      filters: [],`);
  fs.writeFileSync('src/lib/client/store.ts', store);
}

const filtersUI = `
            {current.id === 'filters' && (
              <>
                <Row title="Filters" desc="Automatically categorize or archive incoming emails based on rules.">
                  <button className="zl-btn zl-btn--secondary" onClick={() => updateAccount(d => ({ ...d, filters: [...(d.filters||[]), { id: Math.random().toString(), from: '*@example.com', label: 'Updates' }] }))}><Icon name="plus" />New filter</button>
                </Row>
                <div className="zl-list-card mt-4">
                  {(!filters || filters.length === 0) ? <p className="zl-field-hint">No filters yet.</p> : null}
                  {(filters||[]).map(f => (
                    <div key={f.id} className="zl-list-card-row">
                      <span className="zl-setting-text"><strong>If from {f.from}</strong><small>Apply label: {f.label}</small></span>
                      <button className="zl-btn zl-btn--danger zl-btn--sm" onClick={() => updateAccount(d => ({ ...d, filters: d.filters.filter(x => x.id !== f.id) }))}>Delete</button>
                    </div>
                  ))}
                </div>
              </>
            )}
`;

content = content.replace(
  /const \{ snippets, signatureEnabled, updateAccount \} = useAccountDataStore\(\);/,
  `const { snippets, filters, signatureEnabled, updateAccount } = useAccountDataStore();`
);

content = content.replace(
  /current\.id !== 'snippets' && current\.id !== 'shortcuts'/,
  `current.id !== 'snippets' && current.id !== 'shortcuts' && current.id !== 'filters'`
);

content = content.replace(
  /\{current\.id !== 'inbox'/,
  `${filtersUI.trim()}\n                {current.id !== 'inbox'`
);

fs.writeFileSync('src/components/SettingsModal.tsx', content);
