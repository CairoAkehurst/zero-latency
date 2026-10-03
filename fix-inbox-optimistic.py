import re

with open('src/components/InboxClient.tsx', 'r') as f:
    content = f.read()

# Add handleOptimisticAction inside the useEffect
optimistic_listener = """
    const handleOptimisticAction = (e: any) => {
      const { messageIds, action } = e.detail;
      if (action === 'trash' || action === 'archive') {
         setEmails(prev => prev.filter(email => !messageIds.includes(email.id)));
      } else if (action === 'unread') {
         setEmails(prev => prev.map(email => messageIds.includes(email.id) ? { ...email, is_unread: true } : email));
      }
    };
    window.addEventListener('optimistic-action', handleOptimisticAction);
"""

optimistic_cleanup = """
      window.removeEventListener('optimistic-action', handleOptimisticAction);
"""

# Find the spot to insert the listener
if "window.addEventListener('refresh-inbox', handleRefreshInbox);" in content:
    content = content.replace(
        "window.addEventListener('refresh-inbox', handleRefreshInbox);",
        "window.addEventListener('refresh-inbox', handleRefreshInbox);" + optimistic_listener
    )

if "window.removeEventListener('refresh-inbox', handleRefreshInbox);" in content:
    content = content.replace(
        "window.removeEventListener('refresh-inbox', handleRefreshInbox);",
        "window.removeEventListener('refresh-inbox', handleRefreshInbox);" + optimistic_cleanup
    )

with open('src/components/InboxClient.tsx', 'w') as f:
    f.write(content)
print("Done")
