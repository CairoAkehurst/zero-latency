const fs = require('fs');

let inbox = fs.readFileSync('src/components/InboxClient.tsx', 'utf8');

// 1. Add event listener for optimistic action
const eventListenerCode = `
    const handleOptimisticAction = (e: any) => {
      const { messageIds, action } = e.detail;
      if (action === 'trash' || action === 'archive') {
         setEmails(prev => prev.filter(email => !messageIds.includes(email.id)));
      } else if (action === 'unread') {
         setEmails(prev => prev.map(email => messageIds.includes(email.id) ? { ...email, is_unread: true } : email));
      }
    };
    window.addEventListener('optimistic-action', handleOptimisticAction);
    
    return () => {
      window.removeEventListener('refresh-inbox', fetchEmails);
      window.removeEventListener('optimistic-action', handleOptimisticAction);
`;
inbox = inbox.replace(
  "return () => window.removeEventListener('refresh-inbox', fetchEmails);", 
  eventListenerCode
);

// 2. Change handleBulkAction to fire and forget
const oldBulkAction = /const handleBulkAction = async \(\) => \{[\s\S]*?catch \(error: any\) \{[\s\S]*?alert\(error.message\);\n\s*\}\n\s*\};/;

const newBulkAction = `const handleBulkAction = () => {
    if (checkedEmailIds.size === 0) return;
    const idsToDelete = Array.from(checkedEmailIds);
    const deletedEmails = filteredEmails.filter(email => idsToDelete.includes(email.id));
    
    // Optimistic UI update
    setEmails(prev => prev.filter(e => !idsToDelete.includes(e.id)));
    setCheckedEmailIds(new Set());
    
    fetch("/api/mail/modify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: idsToDelete, action: "trash" })
    }).then(async res => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error(data.error || "Failed to delete emails in Gmail");
      }
      window.dispatchEvent(new CustomEvent('refresh-inbox'));
    }).catch(error => {
      console.error(error);
    });
  };`;

inbox = inbox.replace(oldBulkAction, newBulkAction);

fs.writeFileSync('src/components/InboxClient.tsx', inbox);


let peek = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

// 3. Change handleAction in Peek to fire and forget
const oldHandleAction = /const handleAction = async \(action: 'trash' \| 'archive' \| 'unread'\) => \{[\s\S]*?catch \(e\) \{[\s\S]*?alert\(e instanceof Error \? e.message : "Failed to perform action"\);\n\s*\}\n\s*\};/;

const newHandleAction = `const handleAction = (action: 'trash' | 'archive' | 'unread') => {
    const body = action === 'unread'
      ? { messageIds: [email?.id], action: 'modify', addLabelIds: ['UNREAD'] }
      : { messageIds: [email?.id], action };
      
    window.dispatchEvent(new CustomEvent('optimistic-action', { detail: { messageIds: [email?.id], action } }));
    onClose();

    fetch("/api/mail/modify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(async res => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error(data.error || \`Failed to \${action} email\`);
      }
      window.dispatchEvent(new CustomEvent('refresh-inbox'));
    }).catch(e => {
      console.error(e);
    });
  };`;
  
peek = peek.replace(oldHandleAction, newHandleAction);


// 4. Also handleApplyLabel fire and forget
const oldApplyLabel = /const handleApplyLabel = async \(labelId: string\) => \{[\s\S]*?finally \{[\s\S]*?setIsLabeling\(false\);\n\s*\}\n\s*\};/;
const newApplyLabel = `const handleApplyLabel = (labelId: string) => {
    if (!email) return;
    setShowLabelMenu(false);
    // Fire and forget
    fetch("/api/mail/modify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadIds: email.google_thread_id ? [email.google_thread_id] : [], messageIds: email.id ? [email.id] : [], action: "modify", addLabelIds: [labelId] })
    }).then(async res => {
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('refresh-inbox'));
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Failed to apply label in Gmail: " + (err.error || "Unknown error"));
      }
    }).catch(e => {
      console.error("Error applying label:", e);
    });
  };`;

peek = peek.replace(oldApplyLabel, newApplyLabel);

fs.writeFileSync('src/components/EmailDetailPeek.tsx', peek);

console.log("Done");

