const fs = require('fs');

let content = fs.readFileSync('src/components/InboxClient.tsx', 'utf8');

// 1. Remove local filtering for search
content = content.replace(/const filteredEmails = useMemo\(\(\) => \{[\s\S]*?\}, \[emails, searchQuery, activeCategory\]\);/, `
  const filteredEmails = emails; // Search and categories are now handled server-side
`);

// 2. Add useDebounce hook and effect for search/category
content = content.replace(/const \[activeCategory, setActiveCategory\] = useState<string \| null>\(null\);/, `
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Debounce search
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch when search or category changes
  useEffect(() => {
    let q = 'in:inbox';
    if (activeCategory) {
      q = \`label:\${activeCategory.replace(/\\s+/g, '-')}\`; // Simplified mapping for now, or just \`label:\${activeCategory}\`
      // Wait, Gmail expects the actual label name or ID. If it's a custom label, just 'label:MyLabel' works.
    }
    if (debouncedQuery.trim()) {
      q += \` \${debouncedQuery.trim()}\`;
    }
    
    let isMounted = true;
    const fetchFiltered = async () => {
      setIsSyncing(true);
      try {
        const res = await fetch(\`/api/mail/threads?q=\${encodeURIComponent(q)}\`);
        const data = await res.json();
        if (isMounted && res.ok) {
          setEmails(data.emails || []);
          setNextPageToken(data.nextPageToken || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };
    
    // Don't fetch on initial mount if we already have initialEmails and no query
    if (debouncedQuery === "" && !activeCategory && emails === initialEmails) {
      // do nothing
    } else {
      fetchFiltered();
    }
    
    return () => { isMounted = false; };
  }, [debouncedQuery, activeCategory]);

  // Background Polling (Instant Sync)
  useEffect(() => {
    let q = 'in:inbox';
    if (activeCategory) q = \`label:\${activeCategory}\`;
    if (debouncedQuery.trim()) q += \` \${debouncedQuery.trim()}\`;
    
    const interval = setInterval(async () => {
      try {
        // Fetch only the latest 10 to check for new emails efficiently
        const res = await fetch(\`/api/mail/threads?maxResults=10&q=\${encodeURIComponent(q)}\`);
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
  
  // Intersection Observer for Infinite Scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextPageToken && !isLoadingMore) {
        loadMore();
      }
    }, { threshold: 0.1 });
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => observer.disconnect();
  }, [nextPageToken, isLoadingMore]);
`);

// 3. Fix loadMore function to use current query
content = content.replace(/const loadMore = async \(\) => \{[\s\S]*?setIsLoadingMore\(false\);\n  \};/, `
  const loadMore = async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);
    let q = 'in:inbox';
    if (activeCategory) q = \`label:\${activeCategory}\`;
    if (debouncedQuery.trim()) q += \` \${debouncedQuery.trim()}\`;
    
    try {
      const res = await fetch(\`/api/mail/threads?pageToken=\${nextPageToken}&q=\${encodeURIComponent(q)}\`);
      const data = await res.json();
      if (res.ok) {
        setEmails(prev => [...prev, ...(data.emails || [])]);
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (err) {
      console.error("Failed to load more emails", err);
    } finally {
      setIsLoadingMore(false);
    }
  };
`);

// 4. Update JSX to remove the button and add the sentinel div
content = content.replace(/\{\/\* Email List \*\/\}/, `
        {/* Email List */}
`);
content = content.replace(/\{nextPageToken && !searchQuery && \([\s\S]*?\}\)/, `
          {nextPageToken && (
            <div ref={loadMoreRef} className="p-4 flex justify-center">
              {isLoadingMore ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : <div className="h-5" />}
            </div>
          )}
`);

// 5. Add useRef to imports
if (!content.includes('useRef')) {
  content = content.replace(/import \{ useState, useMemo, useEffect \} from "react";/, 'import { useState, useMemo, useEffect, useRef } from "react";');
}

fs.writeFileSync('src/components/InboxClient.tsx', content);

