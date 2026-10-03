const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-white': 'bg-white dark:bg-[#161616]',
  'bg-gray-50': 'bg-gray-50 dark:bg-[#1c1c1c]',
  'bg-gray-100': 'bg-gray-100 dark:bg-[#202020]',
  'bg-gray-200': 'bg-gray-200 dark:bg-[#262626]',
  'bg-gray-300': 'bg-gray-300 dark:bg-[#333333]',
  'text-gray-900': 'text-gray-900 dark:text-gray-100',
  'text-gray-800': 'text-gray-800 dark:text-gray-200',
  'text-gray-700': 'text-gray-700 dark:text-gray-300',
  'text-gray-600': 'text-gray-600 dark:text-gray-400',
  'text-gray-500': 'text-gray-500 dark:text-gray-400',
  'border-gray-100': 'border-gray-100 dark:border-white/5',
  'border-gray-200': 'border-gray-200 dark:border-white/10',
  'border-gray-300': 'border-gray-300 dark:border-white/20',
  'shadow-sm': 'shadow-sm dark:shadow-none',
  'shadow-md': 'shadow-md dark:shadow-none',
  'shadow-lg': 'shadow-lg dark:shadow-none',
  'hover:bg-gray-50': 'hover:bg-gray-50 dark:hover:bg-[#1c1c1c]',
  'hover:bg-gray-100': 'hover:bg-gray-100 dark:hover:bg-[#202020]',
  'hover:bg-gray-200': 'hover:bg-gray-200 dark:hover:bg-[#262626]',
  'hover:text-gray-900': 'hover:text-gray-900 dark:hover:text-gray-100',
  'hover:text-gray-800': 'hover:text-gray-800 dark:hover:text-gray-200',
  'hover:text-gray-700': 'hover:text-gray-700 dark:hover:text-gray-300',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // We want to match these classes inside className="..." or clsx(...)
  for (const [light, lightAndDark] of Object.entries(replacements)) {
    // Regex to match the light class not followed by the dark variant.
    // This is tricky. Let's just do a string replace carefully, or a regex that ensures we are replacing whole words.
    // Wait, replacing 'bg-white' could match 'bg-white/50'. We need word boundaries.
    // Also, if 'dark:bg-[#161616]' is already present, we shouldn't add it.
    
    // First, let's remove existing dark mode classes we might have added previously (for idempotency if we run multiple times)
    const darkVariant = lightAndDark.split(' ')[1];
    const cleanRegex = new RegExp(` ${darkVariant.replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\//g, '\\/')}`, 'g');
    content = content.replace(cleanRegex, '');

    // Now replace the light class with light + dark
    // Use negative lookahead to avoid matching `bg-white/50` or `text-gray-900/10`
    const regex = new RegExp(`\\b${light}\\b(?!\\/)`, 'g');
    content = content.replace(regex, lightAndDark);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir('./src/components');
walkDir('./src/app');

