const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// 1. Reorder labels & mail
content = content.replace(
  /<div className="space-y-0.5">\s*<div className="pt-2 pb-1 px-3 text-xs font-semibold text-gray-400 tracking-wider">\s*MAIL\s*<\/div>[\s\S]*?<\/div>/g, 
  'MAIL_SECTION_PLACEHOLDER'
);

const labelsBlockMatch = content.match(/<div className="pt-2 pb-1 px-3 flex items-center justify-between text-xs font-semibold text-gray-400 tracking-wider">\s*<span>LABELS<\/span>[\s\S]*?\{\s*isAddingLabel[\s\S]*?<\/div>\s*\)\}\s*<\/div>/);
if (labelsBlockMatch) {
  content = content.replace(labelsBlockMatch[0], 'LABELS_SECTION_PLACEHOLDER');
}

const mailBlock = `
        <div className="space-y-0.5">
          <div className="pt-2 pb-1 px-3 text-xs font-semibold text-gray-400 tracking-wider">
            MAIL
          </div>
          <Link href="/" onClick={() => window.dispatchEvent(new CustomEvent('filter-category', { detail: 'All Mail' }))} className="sidebar-link hover:bg-gray-200/50">
            <Inbox className="w-4 h-4" />
            <span>All Mail</span>
          </Link>
          <Link href="/" onClick={() => window.dispatchEvent(new CustomEvent('filter-category', { detail: 'Sent' }))} className="sidebar-link hover:bg-gray-200/50">
            <Send className="w-4 h-4" />
            <span>Sent</span>
          </Link>
          <Link href="/" onClick={() => window.dispatchEvent(new CustomEvent('filter-category', { detail: 'Drafts' }))} className="sidebar-link hover:bg-gray-200/50">
            <File className="w-4 h-4" />
            <span>Drafts</span>
          </Link>
        </div>
`;

content = content.replace('MAIL_SECTION_PLACEHOLDER', 'LABELS_SECTION_PLACEHOLDER');
content = content.replace('LABELS_SECTION_PLACEHOLDER', mailBlock);
content = content.replace('LABELS_SECTION_PLACEHOLDER', `
        <div className="space-y-0.5 mb-8 pb-4">
          <div className="pt-2 pb-1 px-3 flex items-center justify-between text-xs font-semibold text-gray-400 tracking-wider">
            <span>LABELS</span>
            <button 
              onClick={() => setIsAddingLabel(true)}
              className="p-1 hover:bg-gray-200/50 rounded transition-colors text-gray-400 hover:text-gray-600"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {labels.map((folder) => (
            <div key={folder.id} className="group relative">
              <Link 
                href="/"
                onClick={() => window.dispatchEvent(new CustomEvent('filter-category', { detail: folder.name }))}
                className="sidebar-link cursor-pointer hover:bg-gray-200/50 pr-8"
              >
                <div className={clsx("w-2 h-2 rounded-full flex-shrink-0", folder.color.startsWith('bg-[') ? folder.color : 'bg-gray-400')} style={folder.color.startsWith('bg-[') ? { backgroundColor: folder.color.slice(4,-1) } : {}} />
                <span className="truncate">{folder.name}</span>
              </Link>
              <button 
                onClick={async (e) => {
                  e.preventDefault();
                  if (confirm(\`Delete label \${folder.name}?\`)) {
                    await fetch(\`/api/mail/labels?id=\${folder.id}\`, { method: 'DELETE' });
                    fetchLabels();
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {isAddingLabel && (
            <div className="sidebar-link px-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-300" />
              <input 
                autoFocus
                type="text" 
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onBlur={handleAddLabel}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddLabel();
                  if (e.key === 'Escape') {
                    setIsAddingLabel(false);
                    setNewLabelName("");
                  }
                }}
                className="w-full bg-transparent border-none outline-none text-sm text-gray-700"
                placeholder="New label..."
              />
            </div>
          )}
        </div>
`);

// 2. Add Sparkles button above Inbox
const inboxRegex = /<Link href="\/" onClick=\{\(\) => window.dispatchEvent\(new CustomEvent\('filter-category', \{ detail: 'Inbox' \}\)\)\} className="sidebar-link hover:bg-gray-200\/50">/;
content = content.replace(inboxRegex, `
          <Link href="/ai-summary" className="sidebar-link hover:bg-purple-50 text-purple-700 font-medium">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>AI Priority</span>
          </Link>
          <Link href="/" onClick={() => window.dispatchEvent(new CustomEvent('filter-category', { detail: 'Inbox' }))} className="sidebar-link hover:bg-gray-200/50">
`);

// 3. Add Keyboard Shortcuts
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
content = content.replace(/Appearance\s*<\/button>/, `Appearance\n                  </button>\n${shortcutsBtn}`);

if (!content.includes('Sparkles')) {
  content = content.replace(/LayoutTemplate \} from "lucide-react";/, 'LayoutTemplate, Trash2, Sparkles } from "lucide-react";');
}

fs.writeFileSync('src/components/Sidebar.tsx', content);
