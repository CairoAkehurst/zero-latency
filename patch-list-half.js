const fs = require('fs');

let content = fs.readFileSync('src/components/InboxClient.tsx', 'utf8');

// Revert the 0px change
content = content.replace(
  /style=\{\{ width: \(isFullView \|\| isComposeFullView \|\| selectedEmailId\) \? '0px' : \(isComposing \|\| isFiltersOpen\) \? 'calc\(100% - 500px\)' : '100%' \}\}/,
  `style={{ width: (isFullView || isComposeFullView) ? '0px' : (isComposing || isFiltersOpen) ? 'calc(100% - 500px)' : selectedEmailId ? '380px' : '100%' }}`
);

// We need to pass a "compact={!!selectedEmailId}" prop to EmailRow, or just style it smaller if selectedEmailId is true.
// Actually let's look at EmailRow.tsx.
fs.writeFileSync('src/components/InboxClient.tsx', content);
