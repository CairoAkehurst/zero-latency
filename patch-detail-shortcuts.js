const fs = require('fs');
let content = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

const effect = `
  useEffect(() => {
    const handleFocusReply = () => {
      replyRef.current?.focus();
      handleScrollToReply();
    };
    const handleArchive = () => handleAction('archive');
    const handleTrash = () => handleAction('trash');

    window.addEventListener('focus-reply', handleFocusReply);
    window.addEventListener('shortcut-archive', handleArchive);
    window.addEventListener('shortcut-trash', handleTrash);
    
    return () => {
      window.removeEventListener('focus-reply', handleFocusReply);
      window.removeEventListener('shortcut-archive', handleArchive);
      window.removeEventListener('shortcut-trash', handleTrash);
    };
  }, [email]);
`;

content = content.replace(
  /if \(!email\) return null;/,
  `${effect}\n\n  if (!email) return null;`
);

fs.writeFileSync('src/components/EmailDetailPeek.tsx', content);
