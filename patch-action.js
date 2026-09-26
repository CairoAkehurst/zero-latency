const fs = require('fs');
let content = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

const newAction = `
  const handleAction = async (action: 'trash' | 'archive' | 'unread') => {
    try {
      // Optimistic close
      onClose();
      // Inform parent to refresh
      window.dispatchEvent(new CustomEvent('refresh-inbox'));

      if (action === 'trash') {
        await fetch("/api/mail/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: [email.google_message_id], action: "trash" })
        });
      } else if (action === 'archive') {
        await fetch("/api/mail/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: [email.google_message_id], action: "modify", removeLabelIds: ['INBOX'] })
        });
      } else if (action === 'unread') {
        await fetch("/api/mail/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: [email.google_message_id], action: "modify", addLabelIds: ['UNREAD'] })
        });
      }
    } catch (e) {
      console.error(e);
    }
  };
`;

content = content.replace(
  /const handleAction = async \(action: 'trash' \| 'archive' \| 'unread'\) => \{[\s\S]*?\}\s*catch \(e\) \{\s*console\.error\(e\);\s*\}\s*\};/,
  newAction.trim()
);

fs.writeFileSync('src/components/EmailDetailPeek.tsx', content);
