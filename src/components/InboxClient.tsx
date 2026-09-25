"use client";

import { useState, useMemo, useEffect } from "react";
import { Wand2, SlidersHorizontal, Settings, RefreshCw, Search, PenSquare, Trash2, Tag } from "lucide-react";
import { EmailRow } from "@/components/EmailRow";
import { EmailDetailPeek } from "@/components/EmailDetailPeek";
import { ComposeEmail } from "@/components/ComposeEmail";
import { FiltersPeek } from "@/components/FiltersPeek";
import { createClient } from "@/utils/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function InboxClient({ initialEmails }: { initialEmails: any[] }) {
  const [emails, setEmails] = useState(initialEmails);
  const [checkedEmailIds, setCheckedEmailIds] = useState<Set<string>>(new Set());
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isFullView, setIsFullView] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenCompose = () => {
      setIsComposing(true);
      setSelectedEmailId(null);
      setIsFullView(false);
      setIsFiltersOpen(false);
    };
    const handleFilterCategory = (e: any) => {
      setActiveCategory(e.detail === 'Inbox' ? null : e.detail);
      setIsFullView(false);
      setSelectedEmailId(null);
      setIsComposing(false);
      setIsFiltersOpen(false);
    };
    window.addEventListener('open-compose', handleOpenCompose);
    window.addEventListener('filter-category', handleFilterCategory);
    return () => {
      window.removeEventListener('open-compose', handleOpenCompose);
      window.removeEventListener('filter-category', handleFilterCategory);
    };
  }, []);

  const selectedEmail = useMemo(() => 
    emails.find(e => e.id === selectedEmailId) || null
  , [emails, selectedEmailId]);

  const filteredEmails = useMemo(() => {
    let result = emails;
    if (activeCategory) {
      result = result.filter(e => e.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.sender_name?.toLowerCase().includes(lowerQ) ||
        e.sender_email?.toLowerCase().includes(lowerQ) ||
        e.subject?.toLowerCase().includes(lowerQ) ||
        e.snippet?.toLowerCase().includes(lowerQ)
      );
    }
    return result;
  }, [emails, searchQuery, activeCategory]);

  const handleToggleCheck = (id: string, checked: boolean) => {
    const newSet = new Set(checkedEmailIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setCheckedEmailIds(newSet);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setCheckedEmailIds(new Set(filteredEmails.map(e => e.id)));
    } else {
      setCheckedEmailIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (checkedEmailIds.size === 0) return;
    const supabase = createClient();
    const idsToDelete = Array.from(checkedEmailIds);
    
    setEmails(prev => prev.filter(e => !idsToDelete.includes(e.id)));
    setCheckedEmailIds(new Set());
    
    const { error } = await supabase.from('emails').delete().in('id', idsToDelete);
    if (error) {
      alert("Failed to delete emails: " + error.message);
    }
  };

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isAutoLabeling, setIsAutoLabeling] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus(`Synced ${data.syncedCount} new emails!`);
        fetch("/api/ai/process", { method: "POST" });
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

  const handleAutoLabel = async () => {
    setIsAutoLabeling(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/ai/process", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus(`Auto-labeled ${data.processedCount || 0} emails!`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncStatus(`AI error: ${data.error || data.message || res.statusText}`);
      }
    } catch (err) {
      setSyncStatus(`AI error: ${String(err)}`);
    } finally {
      setIsAutoLabeling(false);
    }
  };

  return (
    <div className="flex h-full bg-white relative rounded-tl-2xl border-t border-l border-gray-200/50 shadow-sm overflow-hidden min-h-0">
      {/* Left List Area */}
      <div className={`flex flex-col h-full transition-all duration-300 ease-in-out ${isFullView ? 'w-0 overflow-hidden opacity-0 flex-none border-0' : 'flex-1 min-w-0'}`}>
        <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          {checkedEmailIds.size > 0 ? (
            <div className="flex items-center gap-4 flex-1">
              <input 
                type="checkbox" 
                checked={checkedEmailIds.size === filteredEmails.length && filteredEmails.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-blue-600 bg-white cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{checkedEmailIds.size} selected</span>
              
              <div className="h-4 w-px bg-gray-200 mx-2" />
              
              <button 
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>

              <button 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                <Tag className="w-3.5 h-3.5" />
                Label
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900 leading-none">{activeCategory || "Inbox"}</h1>
            </div>
          )}
          
          <div className="flex items-center gap-3 text-sm ml-4">
            {checkedEmailIds.size === 0 && (
              <>
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync emails"}
                </button>

                <button 
                  onClick={handleAutoLabel}
                  disabled={isAutoLabeling}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  <Wand2 className={`w-3.5 h-3.5 ${isAutoLabeling ? "animate-spin" : ""}`} />
                  {isAutoLabeling ? "Labeling..." : "Auto label"}
                </button>
              </>
            )}
            
            <div className="relative w-64 flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search emails..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-normal"
              />
            </div>
            
            <div className="h-4 w-px bg-gray-200 mx-1" />
            
            <button 
              onClick={() => {
                setIsFiltersOpen(true);
                setIsComposing(false);
                setSelectedEmailId(null);
              }}
              className={`p-1.5 transition-colors rounded-full ${isFiltersOpen ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
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
                  setIsFiltersOpen(false);
                  setSelectedEmailId(email.id);
                }}
                onDoubleClick={() => {
                  setIsComposing(false);
                  setIsFiltersOpen(false);
                  setSelectedEmailId(email.id);
                  setIsFullView(true);
                }}
              >
                <EmailRow 
                  email={email} 
                  isSelected={selectedEmailId === email.id}
                  isCompressed={isComposing || isFiltersOpen || !!selectedEmailId}
                  isChecked={checkedEmailIds.has(email.id)}
                  onToggleCheck={() => handleToggleCheck(email.id, !checkedEmailIds.has(email.id))}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Side Peek Panel */}
      {isComposing ? (
        <ComposeEmail onClose={() => setIsComposing(false)} />
      ) : isFiltersOpen ? (
        <FiltersPeek onClose={() => setIsFiltersOpen(false)} />
      ) : selectedEmailId ? (
        <EmailDetailPeek 
          email={selectedEmail} 
          onClose={() => {
            setSelectedEmailId(null);
            setIsFullView(false);
          }} 
          onExpand={() => setIsFullView(!isFullView)}
          isFullView={isFullView}
        />
      ) : null}
    </div>
  );
}
