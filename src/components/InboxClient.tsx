"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Wand2, SlidersHorizontal, Settings, RefreshCw, Search, PenSquare, Trash2, Tag, Loader2 } from "lucide-react";
import { EmailRow } from "@/components/EmailRow";
import { EmailDetailPeek } from "@/components/EmailDetailPeek";
import { ComposeEmail } from "@/components/ComposeEmail";
import { FiltersPeek } from "@/components/FiltersPeek";
import { SettingsModal } from "@/components/SettingsModal";
import { createClient } from "@/utils/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function InboxClient({ initialEmails, initialNextPageToken }: { initialEmails: any[], initialNextPageToken: string | null }) {
  const [emails, setEmails] = useState(initialEmails);
  const [nextPageToken, setNextPageToken] = useState(initialNextPageToken);
  const [checkedEmailIds, setCheckedEmailIds] = useState<Set<string>>(new Set());
  const selectionAnchorId = useRef<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isFullView, setIsFullView] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [isComposeFullView, setIsComposeFullView] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState('inbox');

  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isInboxCacheReady, setIsInboxCacheReady] = useState(false);
  
  // Debounce search
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // In-memory cache for fast category switching
  const categoryCache = useRef<Map<string, { emails: any[]; nextPageToken: string | null }>>(
    new Map([['in:inbox', { emails: initialEmails, nextPageToken: initialNextPageToken }]])
  );

  // Keep a local snapshot so revisiting the inbox can paint before the next
  // scheduled Gmail poll runs.
  useEffect(() => {
    try {
      const cached = localStorage.getItem('zero-latency-inbox-cache');
      if (!cached) return;
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed.emails)) {
        setEmails(parsed.emails);
        setNextPageToken(parsed.nextPageToken || null);
        categoryCache.current.set('in:inbox', {
          emails: parsed.emails,
          nextPageToken: parsed.nextPageToken || null,
        });
      }
    } catch (error) {
      console.error('Failed to read inbox cache:', error);
    } finally {
      setIsInboxCacheReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isInboxCacheReady) return;
    try {
      localStorage.setItem('zero-latency-inbox-cache', JSON.stringify({ emails, nextPageToken }));
    } catch (error) {
      console.error('Failed to save inbox cache:', error);
    }
  }, [emails, nextPageToken, isInboxCacheReady]);

  // Fetch when search or category changes
  useEffect(() => {
    let q = 'in:inbox';
    if (activeCategory) {
      if (activeCategory === 'Sent') {
        q = 'in:sent';
      } else if (activeCategory === 'Drafts') {
        q = 'in:draft';
      } else if (activeCategory === 'All Mail') {
        q = '';
      } else {
        q = `label:"${activeCategory}"`;
      }
    }
    if (debouncedQuery.trim()) {
      q += ` ${debouncedQuery.trim()}`;
    }
    
    // Paint cached results immediately while fetching the current Gmail state.
    const cached = categoryCache.current.get(q);
    if (cached) {
      setEmails(cached.emails);
      setNextPageToken(cached.nextPageToken);
    }

    let isMounted = true;
    const fetchFiltered = async () => {
      setIsSyncing(true);
      try {
        const res = await fetch(`/api/mail/threads?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (isMounted && res.ok && data.emails) {
          setEmails(data.emails);
          setNextPageToken(data.nextPageToken || null);
          categoryCache.current.set(q, { emails: data.emails, nextPageToken: data.nextPageToken || null });
        }
      } catch (err) {
        console.error("Failed to fetch filtered emails:", err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };
    
    fetchFiltered();
    
    return () => { isMounted = false; };
  }, [debouncedQuery, activeCategory, refreshKey]);

  // Background Polling (Instant Sync)
  useEffect(() => {
    let q = 'in:inbox';
    if (activeCategory) {
      if (activeCategory === 'Sent') q = 'in:sent';
      else if (activeCategory === 'Drafts') q = 'in:draft';
      else if (activeCategory === 'All Mail') q = '';
      else q = `label:"${activeCategory}"`;
    }
    if (debouncedQuery.trim()) q += ` ${debouncedQuery.trim()}`;
    
    const interval = setInterval(async () => {
      try {
        // Fetch only the latest 10 to check for new emails efficiently
        const res = await fetch(`/api/mail/threads?maxResults=10&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok && data.emails?.length > 0) {
          // Merge new emails, keeping existing ones below them
          setEmails(prev => {
            const newEmails = [...prev];
            let changed = false;
            for (const incoming of data.emails) {
              if (!newEmails.find(e => e.id === incoming.id)) {
                newEmails.unshift(incoming); // Add to top
                changed = true;
              }
            }
            // Optional: update existing emails (like read status)
            for (const incoming of data.emails) {
              const idx = newEmails.findIndex(e => e.id === incoming.id);
              if (idx !== -1 && newEmails[idx].is_unread !== incoming.is_unread) {
                newEmails[idx] = { ...newEmails[idx], is_unread: incoming.is_unread };
                changed = true;
              }
            }
            return changed ? newEmails : prev;
          });
        }
      } catch (e) {
        // ignore background poll errors
      }
    }, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [debouncedQuery, activeCategory]);
  
  // Infinite Scroll handled via onScroll on container


  useEffect(() => {
    const handleOpenCompose = () => {
      setIsComposing(true);
      setIsComposeFullView(false);
      setSelectedEmailId(null);
      setIsFullView(false);
      setIsFiltersOpen(false);
    };
    const handleFilterCategory = (e: any) => {
      setActiveCategory(e.detail === 'Inbox' ? null : e.detail);
      setIsFullView(false);
      setIsComposeFullView(false);
      setSelectedEmailId(null);
      setIsComposing(false);
      setIsFiltersOpen(false);
    };
    const handleOpenSettings = (e: any) => {
      setSettingsSection(e.detail || 'inbox');
      setIsSettingsOpen(true);
    };

    window.addEventListener('open-compose', handleOpenCompose);
    window.addEventListener('filter-category', handleFilterCategory);
    window.addEventListener('open-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('open-compose', handleOpenCompose);
      window.removeEventListener('filter-category', handleFilterCategory);
      window.removeEventListener('open-settings', handleOpenSettings);
    };
  }, []);

  const selectedEmail = useMemo(() => 
    emails.find(e => e.id === selectedEmailId) || null
  , [emails, selectedEmailId]);

  
  const filteredEmails = emails; // Search and categories are now handled server-side


  const handleToggleCheck = (id: string, checked: boolean, event: React.MouseEvent) => {
    const currentIndex = filteredEmails.findIndex(email => email.id === id);
    const anchorIndex = selectionAnchorId.current
      ? filteredEmails.findIndex(email => email.id === selectionAnchorId.current)
      : -1;

    if (event.shiftKey && anchorIndex !== -1 && currentIndex !== -1) {
      const [start, end] = [anchorIndex, currentIndex].sort((a, b) => a - b);
      setCheckedEmailIds(prev => {
        const next = new Set(prev);
        for (const email of filteredEmails.slice(start, end + 1)) next.add(email.id);
        return next;
      });
      return;
    }

    // A regular click toggles this checkbox; Ctrl/Cmd-click therefore adds or
    // removes one email while keeping the other selections intact.
    selectionAnchorId.current = id;
    setCheckedEmailIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    selectionAnchorId.current = null;
    if (checked) {
      setCheckedEmailIds(new Set(filteredEmails.map(e => e.id)));
    } else {
      setCheckedEmailIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (checkedEmailIds.size === 0) return;
    const idsToDelete = Array.from(checkedEmailIds);
    const deletedEmails = filteredEmails.filter(email => idsToDelete.includes(email.id));
    
    // Optimistic UI update
    setEmails(prev => prev.filter(e => !idsToDelete.includes(e.id)));
    setCheckedEmailIds(new Set());
    
    try {
      const res = await fetch("/api/mail/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: idsToDelete, action: "trash" })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete emails in Gmail");
      }
    } catch (error: any) {
      setEmails(prev => [...deletedEmails, ...prev]);
      alert(error.message);
    }
  };

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isAutoLabeling, setIsAutoLabeling] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/mail/threads");
      const data = await res.json();
      if (res.ok) {
        setEmails(data.emails || []);
        setNextPageToken(data.nextPageToken || null);
        setSyncStatus(`Synced successfully!`);
      } else {
        setSyncStatus(`Sync error: ${data.error || res.statusText}`);
      }
    } catch (err) {
      setSyncStatus(`Sync error: ${String(err)}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const handleFocusSearch = () => {
      searchInputRef.current?.focus();
    };
    window.addEventListener('focus-search', handleFocusSearch);
    return () => window.removeEventListener('focus-search', handleFocusSearch);
  }, []);


  const loadMore = async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      let q = 'in:inbox';
      if (activeCategory === 'Sent') q = 'in:sent';
      else if (activeCategory === 'Drafts') q = 'in:draft';
      else if (activeCategory === 'All Mail') q = '';
      else if (activeCategory) q = `label:"${activeCategory}"`;
      if (debouncedQuery.trim()) q += ` ${debouncedQuery.trim()}`;

      const params = new URLSearchParams({ pageToken: nextPageToken, q });
      const res = await fetch(`/api/mail/threads?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setEmails(prev => {
          const existingIds = new Set(prev.map(email => email.id));
          return [...prev, ...(data.emails || []).filter((email: any) => !existingIds.has(email.id))];
        });
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (err) {
      console.error("Failed to load more emails", err);
    } finally {
      setIsLoadingMore(false);
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
        handleSync(); // re-fetch to show new summaries
      } else {
        setSyncStatus(`AI error: ${data.error || data.message || res.statusText}`);
      }
    } catch (err) {
      setSyncStatus(`AI error: ${String(err)}`);
    } finally {
      setIsAutoLabeling(false);
    }
  };

  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      if (nextPageToken && !isLoadingMore) {
        loadMore();
      }
    }
  };

  return (
    <>
      <div className="flex h-full relative overflow-hidden min-h-0">
        {/* Left List Area */}
        <div 
          className={`flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out ${(isFullView || isComposeFullView) ? 'border-0 overflow-hidden opacity-0' : ''}`}
          style={{ width: (isFullView || isComposeFullView) ? '0px' : (isComposing || isFiltersOpen) ? 'calc(100% - 500px)' : selectedEmailId ? '380px' : '100%' }}
        >
          <header className="h-[68px] px-6 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
            {checkedEmailIds.size > 0 ? (
              <div className="flex items-center gap-4 flex-1">
                <div 
                  className="cursor-pointer text-gray-300 hover:text-gray-500 transition-colors flex items-center justify-center"
                  onClick={() => handleSelectAll(!(checkedEmailIds.size === filteredEmails.length && filteredEmails.length > 0))}
                >
                  {checkedEmailIds.size === filteredEmails.length && filteredEmails.length > 0 ? (
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{checkedEmailIds.size} selected</span>
                
                <div className="h-4 w-px bg-gray-200 mx-2" />
                
                <button 
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold text-gray-900 leading-none">{activeCategory || "Inbox"}</h1>
                {isSyncing && <Loader2 className="w-4 h-4 animate-spin text-blue-600" aria-label="Loading emails" />}
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
                  ref={searchInputRef}
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

          <div className="flex-1 overflow-y-auto pb-8" onScroll={handleScroll}>
            {filteredEmails.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm flex flex-col items-center justify-center gap-3">
                {isSyncing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span>Loading emails...</span>
                  </>
                ) : (
                  <span>No emails found. Try syncing or adjusting your search.</span>
                )}
              </div>
            ) : (
              <>
              {isSyncing && (
                <div className="flex justify-center py-3" aria-label="Loading emails">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                </div>
              )}
              {filteredEmails.map((email) => (
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
                  <EmailRow isCompressed={!!selectedEmailId} 
                    email={email} 
                    isSelected={selectedEmailId === email.id}
                    isChecked={checkedEmailIds.has(email.id)}
                    onToggleCheck={(checked, event) => handleToggleCheck(email.id, checked, event)}
                  />
                </div>
              ))}
              </>
            )}
            {isLoadingMore && (
              <div className="flex justify-center py-4" aria-label="Loading more emails">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            )}
            
            {nextPageToken && !searchQuery && (
              <div className="p-4 flex justify-center border-t border-gray-100">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isLoadingMore ? "Loading..." : "Load older emails"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Side Peek Panel */}
        {isComposing ? (
          <ComposeEmail 
            onClose={() => {
              setIsComposing(false);
              setIsComposeFullView(false);
            }} 
            onExpand={() => setIsComposeFullView(!isComposeFullView)}
            isFullView={isComposeFullView}
          />
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

      {isSettingsOpen && (
        <SettingsModal 
          section={settingsSection} setSection={setSettingsSection} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}
    </>
  );
}
