"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inbox, File, Send, Edit, MoreVertical, LogOut, Settings, LayoutTemplate, Plus, ChevronDown, Sparkles, Trash2, Keyboard } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [labels, setLabels] = useState<Array<{ id: string, name: string; color: string }>>([]);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchLabels = async () => {
    try {
      const res = await fetch('/api/mail/labels');
      const data = await res.json();
      if (data.labels) {
        const userLabels = data.labels.filter((l: any) => l.type === 'user' && l.name !== 'CATEGORY_PROMOTIONS' && l.name !== 'CATEGORY_UPDATES' && l.name !== 'CATEGORY_SOCIAL' && l.name !== 'CATEGORY_FORUMS');
        setLabels(userLabels.map((c: any) => ({
          id: c.id,
          name: c.name,
          color: c.color?.backgroundColor ? `bg-[${c.color.backgroundColor}]` : 'bg-gray-400'
        })));
      }
    } catch (e) {
      console.error("Failed to fetch labels", e);
    }
  };

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) {
      setIsAddingLabel(false);
      return;
    }
    
    try {
      const res = await fetch('/api/mail/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLabelName.trim() })
      });
      
      const data = await res.json();
      if (res.ok) {
        setNewLabelName("");
        setIsAddingLabel(false);
        fetchLabels();
      } else {
        alert(`Failed to create label in Gmail: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to create label in Gmail");
    }
  };

  useEffect(() => {
    fetchLabels();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
      }
    });
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const openSettings = (section: string) => {
    setShowDropdown(false);
    window.dispatchEvent(new CustomEvent('open-settings', { detail: section }));
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-transparent text-sm text-gray-700 relative z-10">
      <div className="h-[68px] px-4 flex items-center justify-between relative flex-shrink-0 pt-[6px]">
        <div 
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 font-medium cursor-pointer hover:bg-gray-200/50 px-2 py-1 rounded-md transition-colors"
        >
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-5 h-5 rounded-full shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-gray-300 to-gray-400 shrink-0" />
          )}
          <span className="truncate max-w-[120px]">{user?.user_metadata?.full_name || user?.email || "Account"}</span>
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </div>

        {showDropdown && (
          <div className="absolute top-12 left-4 w-56 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-100 mb-1">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Accounts</div>
              <div className="flex items-center gap-2 mt-2">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-gray-300 to-gray-400" />
                )}
                <div className="text-sm font-medium truncate">{user?.user_metadata?.full_name || user?.email || "Account"}</div>
              </div>
            </div>
            
            <button 
              onClick={() => openSettings('inbox')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            
            <button 
              onClick={() => openSettings('inbox')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <LayoutTemplate className="w-4 h-4" />
              Appearance
            </button>

            <button 
              onClick={() => openSettings('shortcuts')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <Keyboard className="w-4 h-4" />
              Keyboard shortcuts
            </button>
            
            <div className="h-px bg-gray-100 my-1" />
            
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}

        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-compose'))}
          className="p-1.5 hover:bg-gray-200/50 rounded-md text-gray-500 transition-colors"
          title="Compose"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-4 mt-4 mb-4">
        <div className="space-y-0.5">
          <Link
            href="/ai-summary"
            className={clsx(
              "sidebar-link cursor-pointer hover:bg-purple-50 text-purple-700 font-medium",
              pathname === '/ai-summary' ? "bg-purple-50" : ""
            )}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Priority</span>
          </Link>
          
          <Link
            href="/"
            onClick={() => window.dispatchEvent(new CustomEvent('filter-category', { detail: 'Inbox' }))}
            className={clsx(
              "sidebar-link cursor-pointer hover:bg-gray-200/50",
              pathname === '/' && !activeCategoryCheck() ? "bg-gray-200/50 font-medium" : ""
            )}
          >
            <Inbox className="w-4 h-4" />
            <span>Inbox</span>
          </Link>
        </div>

        <div className="space-y-0.5 pb-2">
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

        <div className="space-y-0.5 pb-6">
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
                  if (confirm(`Delete label ${folder.name}?`)) {
                    await fetch(`/api/mail/labels?id=${folder.id}`, { method: 'DELETE' });
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
      </div>
    </aside>
  );

  function activeCategoryCheck() {
    return false;
  }
}
