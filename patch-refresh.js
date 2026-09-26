const fs = require('fs');
let content = fs.readFileSync('src/components/InboxClient.tsx', 'utf8');

const effect = `
  useEffect(() => {
    const handleRefresh = () => {
      // Force a reload by resetting token and triggering fetch
      setNextPageToken(null);
      setEmails([]);
      fetchEmails();
    };
    window.addEventListener('refresh-inbox', handleRefresh);
    return () => window.removeEventListener('refresh-inbox', handleRefresh);
  }, [fetchEmails]);
`;

// Insert it somewhere inside InboxClient before return
content = content.replace(
  /const handleScroll = \(e: React.UIEvent<HTMLDivElement>\)/,
  `${effect}\n\n  const handleScroll = (e: React.UIEvent<HTMLDivElement>)`
);

fs.writeFileSync('src/components/InboxClient.tsx', content);
