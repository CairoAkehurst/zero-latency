const fs = require('fs');

let content = fs.readFileSync('src/components/InboxClient.tsx', 'utf8');

content = content.replace(
  /style=\{\{ width: \(isFullView \|\| isComposeFullView\) \? '0px' : \(isComposing \|\| isFiltersOpen \|\| selectedEmailId\) \? 'calc\(100% - 500px\)' : '100%' \}\}/,
  `style={{ width: (isFullView || isComposeFullView || selectedEmailId) ? '0px' : (isComposing || isFiltersOpen) ? 'calc(100% - 500px)' : '100%' }}`
);

fs.writeFileSync('src/components/InboxClient.tsx', content);
