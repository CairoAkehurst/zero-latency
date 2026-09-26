const fs = require('fs');

function addSnippets(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Add snippets to store destruction
  content = content.replace(
    /const \{ signatureEnabled \} = useAccountDataStore\(\);/,
    `const { signatureEnabled, snippets } = useAccountDataStore();\n  const [showSnippets, setShowSnippets] = useState(false);`
  );

  const snippetButton = `
                <div className="relative">
                  <button 
                    onClick={() => setShowSnippets(!showSnippets)}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded text-xs font-medium" 
                    title="Insert Snippet"
                  >
                    \{\}
                  </button>
                  {showSnippets && (
                    <div className="absolute bottom-full mb-1 left-0 w-48 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50">
                      {snippets.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500">No snippets configured.</div>
                      ) : (
                        snippets.map(s => (
                          <button
                            key={s.id}
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-sm text-gray-700 truncate"
                            onClick={() => {
                              document.execCommand('insertHTML', false, s.body.replace(/\\n/g, '<br>'));
                              setShowSnippets(false);
                            }}
                          >
                            {s.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
  `;

  // Insert snippetButton into the toolbar before the Sparkles button
  content = content.replace(
    /<button className="p-1\.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center gap-1\.5" title="Help me write">/g,
    `${snippetButton.trim()}\n                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center gap-1.5" title="Help me write">`
  );

  fs.writeFileSync(file, content);
}

addSnippets('src/components/ComposeEmail.tsx');
addSnippets('src/components/EmailDetailPeek.tsx');
