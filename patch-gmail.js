const fs = require('fs');
let content = fs.readFileSync('src/lib/server/gmail.ts', 'utf8');

const replacement = `
  const dateHeader = getHeader('Date');
  const message_id_header = getHeader('Message-ID');
  const references_header = getHeader('References') || getHeader('In-Reply-To') || '';
`;
content = content.replace(/const dateHeader = getHeader\('Date'\);/, replacement.trim());

const returnReplacement = `
  return {
    subject,
    sender_name,
    sender_email,
    to_email: to,
    cc,
    bcc,
    message_id_header,
    references_header,
    timestamp: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
`;
content = content.replace(/return \{\n\s*subject,\n\s*sender_name,\n\s*sender_email,\n\s*to_email: to,\n\s*cc,\n\s*bcc,\n\s*timestamp: dateHeader \? new Date\(dateHeader\)\.toISOString\(\) : new Date\(\)\.toISOString\(\),/, returnReplacement.trim());

fs.writeFileSync('src/lib/server/gmail.ts', content);
