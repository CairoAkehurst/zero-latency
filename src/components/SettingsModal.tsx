"use client";

import { useEffect, useState } from "react";
import { X, Inbox, Sparkles, Filter, Code, PenTool, Bell, User, Keyboard, Check, ChevronDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const SECTIONS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox, group: 'Account' },
  { id: 'ai', label: 'AI', icon: Sparkles, group: 'Account' },
  { id: 'filters', label: 'Gmail filters', icon: Filter, group: 'Account' },
  { id: 'snippets', label: 'Snippets', icon: Code, group: 'Account' },
  { id: 'signature', label: 'Signature', icon: PenTool, group: 'Account' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'Account' },
  { id: 'account', label: 'Manage accounts', icon: User, group: 'Account' },
  { id: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard, group: 'Workspace' },
];

function Row({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0">
      <div className="flex flex-col pr-8">
        <strong className="text-sm font-medium text-gray-900">{title}</strong>
        {desc && <small className="text-sm text-gray-500 mt-0.5">{desc}</small>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function SettingsModal({ 
  initialSection = 'inbox', 
  onClose 
}: { 
  initialSection?: string, 
  onClose: () => void 
}) {
  const [section, setSection] = useState(initialSection);
  const current = SECTIONS.find(s => s.id === section) || SECTIONS[0];
  const supabase = createClient();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserEmail(data.user.email || "");
    });
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-xl shadow-2xl flex overflow-hidden flex-col sm:flex-row animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Sidebar */}
        <nav className="w-full sm:w-64 bg-gray-50/50 border-r border-gray-100 flex-shrink-0 flex flex-col h-full overflow-y-auto py-4">
          <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</div>
          {SECTIONS.filter(s => s.group === 'Account').map(s => {
            const Icon = s.icon;
            return (
              <button 
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors w-full text-left ${section === s.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            )
          })}

          <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Workspace</div>
          {SECTIONS.filter(s => s.group === 'Workspace').map(s => {
            const Icon = s.icon;
            return (
              <button 
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors w-full text-left ${section === s.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            )
          })}
        </nav>

        {/* Modal Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex-1 overflow-y-auto px-8 py-10">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">{current.label}</h2>
            
            <div className="max-w-2xl">
              {current.id === 'inbox' && (
                <>
                  <Row title="Theme mode" desc="Choose how ZeroLatency looks on this device">
                    <select className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                      <option>System</option>
                      <option>Light</option>
                      <option>Dark</option>
                    </select>
                  </Row>
                  <Row title="Thread style" desc="Change how open threads are displayed">
                    <select className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                      <option>Side peek</option>
                      <option>Center peek</option>
                      <option>Full page</option>
                    </select>
                  </Row>
                  <Row title="Auto-advance" desc="Choose where to go after archiving or deleting a thread">
                    <select className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                      <option>Go to next thread</option>
                      <option>Go to previous thread</option>
                      <option>Back to the list</option>
                    </select>
                  </Row>
                  <Row title="Font size" desc="Choose the size of the font in the inbox">
                    <select className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                      <option>Default</option>
                      <option>Large</option>
                    </select>
                  </Row>
                </>
              )}

              {current.id === 'account' && (
                <>
                  <Row title="Current Account" desc={userEmail}>
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                      Reconnect
                    </button>
                  </Row>
                  <Row title="Sign out" desc="Sign out of every account on this device.">
                    <button 
                      onClick={handleSignOut}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Sign out
                    </button>
                  </Row>
                </>
              )}
              
              {current.id !== 'inbox' && current.id !== 'account' && (
                <div className="text-gray-500 text-sm mt-4">
                  These settings will be configurable in a future update.
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
