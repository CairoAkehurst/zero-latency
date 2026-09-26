const fs = require('fs');

let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(/AI Priority/g, 'Priority');
fs.writeFileSync('src/components/Sidebar.tsx', sidebar);

let client = fs.readFileSync('src/components/AiSummaryClient.tsx', 'utf8');
client = client.replace(/AI Priority Inbox/g, 'Priority Inbox');
fs.writeFileSync('src/components/AiSummaryClient.tsx', client);
