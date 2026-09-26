const fs = require('fs');
let content = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');

// Find everything from "{isSending ? 'Sending...' : sendSuccess ? 'Sent!' : 'Send'}" to the end of the file
const findRegex = /\{isSending \? "Sending\.\.\." : sendSuccess \? "Sent!" : "Send"\}\n\s*<\/button>\n\s*<\/div>\n\s*<\/div>[\s\S]*?\n\}/;

const replaceWith = `{isSending ? "Sending..." : sendSuccess ? "Sent!" : "Send"}
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}`;

content = content.replace(findRegex, replaceWith);
fs.writeFileSync('src/components/EmailDetailPeek.tsx', content);
