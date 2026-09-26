const fs = require('fs');
let content = fs.readFileSync('src/components/InboxClient.tsx', 'utf8');

// Replace IntersectionObserver with onScroll
content = content.replace(
  /\/\/ Intersection Observer for Infinite Scroll[\s\S]*?return \(\) => observer\.disconnect\(\);\n  \}, \[nextPageToken, isLoadingMore\]\);/,
  `// Infinite Scroll handled via onScroll on container`
);

// Add handleScroll function
const handleScrollCode = `
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      if (nextPageToken && !isLoadingMore) {
        loadMore();
      }
    }
  };
`;

// Insert it before the return
content = content.replace(
  /return \(\n    <div className="flex-1 flex h-full relative">/,
  `${handleScrollCode}\n  return (\n    <div className="flex-1 flex h-full relative">`
);

// Add onScroll to the div
content = content.replace(
  /<div className="flex-1 overflow-y-auto pb-8">/,
  `<div className="flex-1 overflow-y-auto pb-8" onScroll={handleScroll}>`
);

// We still need the loader at the bottom.
// Ensure loadMoreRef is removed from the div since we don't need it.
content = content.replace(/ref=\{loadMoreRef\}/, '');

fs.writeFileSync('src/components/InboxClient.tsx', content);
