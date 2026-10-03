const fs = require('fs');

let content = fs.readFileSync('src/components/LaunchClient.tsx', 'utf8');

const oldHandleSend = `  const handleSend = async (task: LaunchTask) => {
    if (!task.guessedEmail) {
      alert("No email address found for this person.");
      return;
    }

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'sending' } : t));

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: task.guessedEmail,
          subject: instruction.substring(0, 50) + "...", // Could generate a subject, but keeping it simple or require subject in draft
          body: \`<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">\${task.draft.replace(/\\n/g, '<br/>')}</div>\`,
        }),
      });

      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'sent' } : t));
        if (activeTaskId === task.id) {
            setTimeout(() => {
                setActiveTaskId(null);
            }, 1500);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send');
      }
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', error: String(err) } : t));
      alert(\`Failed to send to \${task.guessedEmail}: \${err}\`);
    }
  };`;

const newHandleSend = `  const handleSend = (task: LaunchTask) => {
    if (!task.guessedEmail) {
      alert("No email address found for this person.");
      return;
    }

    // Immediately open the next task in the queue
    setTasks((currentTasks) => {
      const currentIndex = currentTasks.findIndex(t => t.id === task.id);
      if (currentIndex !== -1) {
        const nextTask = currentTasks.slice(currentIndex + 1).find(t => t.status === 'drafted' || t.status === 'drafting' || t.status === 'pending');
        setActiveTaskId(nextTask ? nextTask.id : null);
      }
      return currentTasks.map(t => t.id === task.id ? { ...t, status: 'sending' } : t);
    });

    // Fire and forget fetch in background
    fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toEmail: task.guessedEmail,
        subject: instruction.substring(0, 50) + "...", // Could generate a subject, but keeping it simple or require subject in draft
        body: \`<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">\${task.draft.replace(/\\n/g, '<br/>')}</div>\`,
      }),
    }).then(async (res) => {
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'sent' } : t));
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send');
      }
    }).catch((err) => {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', error: String(err) } : t));
    });
  };`;

// Because oldHandleSend has some exact spacing requirements, we'll try an indexOf based replace just in case.
const startIdx = content.indexOf('  const handleSend = async (task: LaunchTask) => {');
const endIdx = content.indexOf('  const handleRemove = (taskId: string, e: React.MouseEvent) => {');

if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + newHandleSend + '\n  \n' + content.substring(endIdx);
    fs.writeFileSync('src/components/LaunchClient.tsx', content);
    console.log("Success");
} else {
    console.log("Failed to find boundaries");
}
