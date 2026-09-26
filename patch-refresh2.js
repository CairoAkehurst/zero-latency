const fs = require('fs');
let content = fs.readFileSync('src/components/InboxClient.tsx', 'utf8');

// 1. Add refreshKey state
content = content.replace(
  /const \[activeCategory, setActiveCategory\] = useState<string \| null>\(null\);/,
  `const [activeCategory, setActiveCategory] = useState<string | null>(null);\n  const [refreshKey, setRefreshKey] = useState(0);`
);

// 2. Add refreshKey to useEffect dependency array
content = content.replace(
  /\}, \[debouncedQuery, activeCategory\]\);/,
  `}, [debouncedQuery, activeCategory, refreshKey]);`
);

// 3. Update the handleRefresh function
content = content.replace(
  /const handleRefresh = \(\) => \{[\s\S]*?\};\n    window\.addEventListener/,
  `const handleRefresh = () => { setRefreshKey(prev => prev + 1); };\n    window.addEventListener`
);

// 4. Also remove the fetchEmails dependency from that useEffect
content = content.replace(
  /return \(\) => window\.removeEventListener\('refresh-inbox', handleRefresh\);\n  \}, \[fetchEmails\]\);/,
  `return () => window.removeEventListener('refresh-inbox', handleRefresh);\n  }, []);`
);

fs.writeFileSync('src/components/InboxClient.tsx', content);
