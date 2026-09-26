const fs = require('fs');
let content = fs.readFileSync('src/components/InboxClient.tsx', 'utf8');

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

content = content.replace(
  /return \(\n    <>\n      <div className="flex h-full/,
  `${handleScrollCode}\n  return (\n    <>\n      <div className="flex h-full`
);

fs.writeFileSync('src/components/InboxClient.tsx', content);
