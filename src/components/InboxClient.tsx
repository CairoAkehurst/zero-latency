"use client";

import { useState, useMemo } from "react";
import { Wand2, SlidersHorizontal, Settings, RefreshCw, Search, PenSquare } from "lucide-react";
import { EmailRow } from "@/components/EmailRow";
import { EmailDetailPeek } from "@/components/EmailDetailPeek";
import { ComposeEmail } from "@/components/ComposeEmail";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function InboxClient({ initialEmails }: { initialEmails: any[] }) {
  const [emails] = useState(initialEmails);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const selectedEmail = useMemo(() => 
    emails.find(e => e.id === selectedEmailId) || null
  , [emails, selectedEmailId]);

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails;
    const lowerQ = searchQuery.toLowerCase();
    return emails.filter(e => 
      e.sender_name?.toLowerCase().includes(lowerQ) ||
      e.sender_email?.toLowerCase().includes(lowerQ) ||
      e.subject?.toLowerCase().includes(lowerQ) ||
      e.snippet?.toLowerCase().includes(lowerQ)
    );
  }, [emails, searchQuery]);

  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus(`Synced ${data.syncedCount} new emails!`);
        // Trigger AI processing in background
        fetch("/api/ai/process", { method: "POST" });
        // Refresh page to get new data after a short delay
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncStatus(`Sync error: ${data.error || res.statusText}`);
      }
    } catch (err) {
      setSyncStatus(`Sync error: ${String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex h-full bg-white relative rounded-tl-2xl border-t border-l border-gray-200/50 shadow-sm overflow-hidden">
      {/* Left List Area */}
      <div className="flex flex-col h-full flex-1">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
            
            <div className="relative flex-1 max-w-md ml-4">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search emails..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm ml-4">
            <button 
              onClick={() => {
                setSelectedEmailId(null);
                setIsComposing(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              <PenSquare className="w-3.5 h-3.5" />
              Compose
            </button>

            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Gmail"}
            </button>

            <button 
              onClick={() => fetch("/api/ai/process", { method: "POST" }).then(() => window.location.reload())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Auto label
            </button>
            
            <div className="h-4 w-px bg-gray-200" />
            
            <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Sync Status Banner */}
        {syncStatus && (
          <div className={`px-6 py-2 text-sm ${syncStatus.includes('error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {syncStatus}
          </div>
        )}

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No emails found. Try syncing or adjusting your search.</div>
          ) : (
            filteredEmails.map((email) => (
              <div 
                key={email.id} 
                onClick={() => {
                  setIsComposing(false);
                  setSelectedEmailId(email.id);
                }}
              >
                <EmailRow 
                  email={email} 
                  isSelected={selectedEmailId === email.id} 
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Side Peek Panel */}
      {isComposing ? (
        <ComposeEmail onClose={() => setIsComposing(false)} />
      ) : selectedEmailId ? (
        <EmailDetailPeek 
          email={selectedEmail} 
          onClose={() => setSelectedEmailId(null)} 
        />
      ) : null}
    </div>
  );
}
