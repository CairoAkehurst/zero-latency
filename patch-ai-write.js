const fs = require('fs');

function addAi(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Add AI state
  content = content.replace(
    /const \[showSnippets, setShowSnippets\] = useState\(false\);/,
    `const [showSnippets, setShowSnippets] = useState(false);\n  const [isGenerating, setIsGenerating] = useState(false);`
  );

  const aiAction = `
                    onClick={async () => {
                      const instruction = prompt("What should the AI write?");
                      if (!instruction) return;
                      setIsGenerating(true);
                      try {
                        const res = await fetch('/api/ai/write', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ instruction })
                        });
                        const data = await res.json();
                        if (data.text) {
                          document.execCommand('insertHTML', false, data.text.replace(/\\n/g, '<br>'));
                        }
                      } catch(e) {}
                      setIsGenerating(false);
                    }}
  `;

  content = content.replace(
    /onClick=\{\(\) => \{\}\}\s*className="p-1\.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center gap-1\.5" title="Help me write">/,
    `${aiAction.trim()} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center gap-1.5" title="Help me write">`
  );
  
  // also check if onClick doesn't exist yet
  content = content.replace(
    /className="p-1\.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center gap-1\.5" title="Help me write">/g,
    `${aiAction.trim()} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center gap-1.5" title="Help me write">`
  );

  // handle loading state for the icon
  content = content.replace(
    /<Sparkles className="w-4 h-4 text-purple-500" \/>\s*<span className="text-xs font-medium text-purple-600">AI<\/span>/g,
    `{isGenerating ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <Sparkles className="w-4 h-4 text-purple-500" />}\n                  <span className="text-xs font-medium text-purple-600">AI</span>`
  );

  fs.writeFileSync(file, content);
}

addAi('src/components/ComposeEmail.tsx');
addAi('src/components/EmailDetailPeek.tsx');
