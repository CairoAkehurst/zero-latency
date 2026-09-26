const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const aiButton = `
          <Link href="/ai-summary" className="sidebar-link hover:bg-purple-50 text-purple-700 font-medium">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>AI Priority</span>
          </Link>
          <Link href="/" onClick={() => window.dispatchEvent(new CustomEvent('filter-category', { detail: 'Inbox' }))} className="sidebar-link hover:bg-gray-200/50">
            <Inbox className="w-4 h-4" />
            <span>Inbox</span>
            {unreadCount > 0 && (
`;

content = content.replace(
  /<Link href="\/" onClick=\{[\s\S]*?<Inbox className="w-4 h-4" \/>\s*<span>Inbox<\/span>\s*\{unreadCount > 0 && \(/,
  aiButton
);

if (!content.includes('Sparkles')) {
  content = content.replace(/LayoutTemplate, Trash2 \} from "lucide-react";/, 'LayoutTemplate, Trash2, Sparkles } from "lucide-react";');
}

fs.writeFileSync('src/components/Sidebar.tsx', content);
