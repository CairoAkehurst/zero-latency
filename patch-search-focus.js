const fs = require('fs');
let content = fs.readFileSync('src/components/InboxClient.tsx', 'utf8');

const effect = `
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const handleFocusSearch = () => {
      searchInputRef.current?.focus();
    };
    window.addEventListener('focus-search', handleFocusSearch);
    return () => window.removeEventListener('focus-search', handleFocusSearch);
  }, []);
`;

content = content.replace(
  /const loadMore = async \(\) => \{/,
  `${effect}\n\n  const loadMore = async () => {`
);

content = content.replace(
  /<input \n                  type="text" \n                  placeholder="Search emails..." \n                  value=\{searchQuery\}/,
  `<input \n                  ref={searchInputRef}\n                  type="text" \n                  placeholder="Search emails..." \n                  value={searchQuery}`
);

// We need to import useRef if not already
// It is imported (we used it for loadMoreRef earlier). But wait, we removed loadMoreRef.
// Let's just make sure useRef is imported.

fs.writeFileSync('src/components/InboxClient.tsx', content);
