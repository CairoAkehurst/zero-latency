"use client";

import { useEffect, useState } from "react";
import { Edit, Inbox, Send, File, ChevronDown, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [labels, setLabels] = useState<any[]>([]);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");

  const fetchLabels = async () => {
    try {
      const res = await fetch('/api/mail/labels');
      const data = await res.json();
      if (res.ok && data.labels) {
        // Filter out system labels for the UI list, or keep USER ones
        const userLabels = data.labels.filter((l: any) => l.type === 'user');
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
      
      if (res.ok) {
        setNewLabelName("");
        setIsAddingLabel(false);
        fetchLabels();
      } else {
        alert("Failed to create label in Gmail");
      }
    } catch (e) {
      console.error(e);
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

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-[#f7f7f5] text-sm text-gray-700 relative z-10">
      <div className="h-[68px] px-4 flex items-center justify-between relative flex-shrink-0 pt-[6px]">
        <div 
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 font-medium cursor-pointer hover:bg-gray-200/50 px-2 py-1 rounded-md transition-colors"
        >
          {user?.user_metadata?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-5 h-5 rounded-full shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-gray-300 to-gray-400 shrink-0" />
          )}
          <span className="truncate max-w-[120px]">{user?.user_metadata?.full_name || user?.email || "Account"}</span>
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </div>

        {showDropdown && (
          <div className="absolute top-12 left-4 w-48 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50">
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

      <div className="flex-1 overflow-y-auto px-2 space-y-6 mt-4">
        <div className="space-y-0.5">
          <div
            onClick={() => window.dispatchEvent(new CustomEvent('filter-category', { detail: 'Inbox' }))}
            className={clsx(
              "sidebar-link cursor-pointer hover:bg-gray-200/50"
            )}
          >
            <Inbox className="w-4 h-4" />
            <span>Inbox</span>
          </div>
          
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
            <div 
              key={folder.name} 
              onClick={() => window.dispatchEvent(new CustomEvent('filter-category', { detail: folder.name }))}
              className="sidebar-link group cursor-pointer hover:bg-gray-200/50"
            >
              <div className={clsx("w-2 h-2 rounded-full flex-shrink-0", folder.color.startsWith('bg-[') ? folder.color : 'bg-gray-400')} style={folder.color.startsWith('bg-[') ? { backgroundColor: folder.color.slice(4,-1) } : {}} />
              <span className="truncate">{folder.name}</span>
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

        <div className="space-y-0.5">
          <div className="pt-2 pb-1 px-3 text-xs font-semibold text-gray-400 tracking-wider">
            MAIL
          </div>
          <div className="sidebar-link">
            <Inbox className="w-4 h-4" />
            <span>All Mail</span>
          </div>
          <div className="sidebar-link">
            <Send className="w-4 h-4" />
            <span>Sent</span>
          </div>
          <div className="sidebar-link">
            <File className="w-4 h-4" />
            <span>Drafts</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
