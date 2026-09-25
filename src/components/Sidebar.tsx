"use client";

import { useEffect, useState } from "react";
import { Edit, Inbox, Send, File, ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";

const AI_FOLDERS = [
  { name: "Project updates", color: "bg-blue-400" },
  { name: "Leadership updates", color: "bg-orange-400" },
  { name: "Sales leads", color: "bg-purple-400" },
  { name: "Hiring leads", color: "bg-pink-400" },
  { name: "Meeting requests", color: "bg-green-400" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
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
      <div className="p-4 flex items-center justify-between relative">
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
          <Link
            href="/"
            className={clsx(
              "sidebar-link",
              pathname === "/" && "sidebar-link-active"
            )}
          >
            <Inbox className="w-4 h-4" />
            <span>Inbox</span>
          </Link>
          
          <div className="pt-2 pb-1 px-3 text-xs font-semibold text-gray-400 tracking-wider">
            VIEWS
          </div>
          {AI_FOLDERS.map((folder) => (
            <div key={folder.name} className="sidebar-link group">
              <div className={clsx("w-2 h-2 rounded-full", folder.color)} />
              <span className="truncate">{folder.name}</span>
            </div>
          ))}
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
