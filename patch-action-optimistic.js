const fs = require('fs');
let content = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

const replacement = `
  const handleAction = async (action: 'trash' | 'archive' | 'unread') => {
    try {
      onClose(); // Optimistically close
      window.dispatchEvent(new CustomEvent('refresh-inbox')); // Force refresh

      if (action === 'trash') {
        await fetch("/api/mail/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: [email.id], action: "trash" })
        });
      } else if (action === 'archive') {
        await fetch("/api/mail/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: [email.id], action: "modify", removeLabelIds: ['INBOX'] })
        });
      } else if (action === 'unread') {
        await fetch("/api/mail/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: [email.id], action: "modify", addLabelIds: ['UNREAD'] })
        });
      }
    } catch (e) {
      alert("Failed to perform action");
    }
  };
`;

content = content.replace(
  /const handleAction = async \(action: 'trash' \| 'archive' \| 'unread'\) => \{[\s\S]*?alert\("Failed to perform action"\);\n    \}\n  \};/,
  replacement.trim()
);

fs.writeFileSync('src/components/EmailDetailPeek.tsx', content);
