"use client";

import { Search, Edit, Inbox, Send, File, ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const AI_FOLDERS = [
  { name: "Project updates", color: "bg-blue-400" },
  { name: "Leadership updates", color: "bg-orange-400" },
  { name: "Sales leads", color: "bg-purple-400" },
  { name: "Hiring leads", color: "bg-pink-400" },
  { name: "Meeting requests", color: "bg-green-400" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-[#f7f7f5] text-sm text-gray-700">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium cursor-pointer hover:bg-gray-200/50 px-2 py-1 rounded-md transition-colors">
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-gray-300 to-gray-400 shrink-0" />
          <span>Stephanie Lee</span>
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </div>
        <button className="p-1.5 hover:bg-gray-200/50 rounded-md text-gray-500 transition-colors">
          <Edit className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-white/50 border border-gray-200/60 rounded-md pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-300 placeholder-gray-400 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-6">
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
            <span className="ml-auto text-xs text-gray-400 font-medium">3</span>
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
