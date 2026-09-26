const fs = require('fs');

let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// The labels section
const labelsRegex = /<div className="pt-2 pb-1 px-3 flex items-center justify-between text-xs font-semibold text-gray-400 tracking-wider">[\s\S]*?\{\/\* END LABELS \*\//;

// Wait, let's just do it directly using a simple regex replace or string replacement.
content = content.replace(
  /<div className="space-y-0.5">\s*<div className="pt-2 pb-1 px-3 text-xs font-semibold text-gray-400 tracking-wider">\s*MAIL\s*<\/div>[\s\S]*?<\/div>/g, 
  'MAIL_SECTION_PLACEHOLDER'
);

const labelsBlockMatch = content.match(/<div className="pt-2 pb-1 px-3 flex items-center justify-between text-xs font-semibold text-gray-400 tracking-wider">\s*<span>LABELS<\/span>[\s\S]*?\{\s*isAddingLabel[\s\S]*?<\/div>\s*\)\}\s*<\/div>/);
if (labelsBlockMatch) {
  content = content.replace(labelsBlockMatch[0], 'LABELS_SECTION_PLACEHOLDER');
} else {
  // alternative matching
  const startIdx = content.indexOf('<div className="pt-2 pb-1 px-3 flex items-center justify-between text-xs font-semibold text-gray-400 tracking-wider">');
  const endIdx = content.indexOf('MAIL_SECTION_PLACEHOLDER');
  if (startIdx !== -1 && endIdx !== -1) {
    const labelsBlock = content.substring(startIdx, endIdx);
    content = content.replace(labelsBlock, 'LABELS_SECTION_PLACEHOLDER\n        ');
  }
}

// Mail section block
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

// Replace placeholders
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
              {/* Context menu or delete button can go here, just adding a simple delete button for now */}
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

if (!content.includes('Trash2')) {
  content = content.replace('Settings, LayoutTemplate } from "lucide-react";', 'Settings, LayoutTemplate, Trash2 } from "lucide-react";');
}

fs.writeFileSync('src/components/Sidebar.tsx', content);

