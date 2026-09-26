const fs = require('fs');

let store = fs.readFileSync('src/lib/client/store.ts', 'utf8');
if (!store.includes('signatureText:')) {
  store = store.replace(/signatureEnabled: boolean;/, `signatureEnabled: boolean;\n  signatureText: string;`);
  store = store.replace(/signatureEnabled: true,/, `signatureEnabled: true,\n      signatureText: "-- \\nSent from AgentMail",`);
  fs.writeFileSync('src/lib/client/store.ts', store);
}

let content = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');
if (!content.includes('signatureText')) {
  content = content.replace(
    /const \{ snippets, filters, signatureEnabled, updateAccount \} = useAccountDataStore\(\);/,
    `const { snippets, filters, signatureEnabled, signatureText, updateAccount } = useAccountDataStore();`
  );

  const sigUI = `
            {current.id === 'signature' && (
              <>
                <Row title="Enable signature" desc="Automatically append signature to new emails.">
                  <input type="checkbox" checked={signatureEnabled} onChange={e => updateAccount(d => ({ ...d, signatureEnabled: e.target.checked }))} />
                </Row>
                {signatureEnabled && (
                  <div className="zl-form-grid mt-4">
                    <div className="zl-field">
                      <label className="zl-field-label">Signature HTML</label>
                      <textarea value={signatureText} onChange={e => updateAccount(d => ({ ...d, signatureText: e.target.value }))} className="zl-input zl-textarea" rows={4} />
                    </div>
                  </div>
                )}
              </>
            )}
  `;
  
  content = content.replace(
    /current\.id !== 'snippets' && current\.id !== 'shortcuts' && current\.id !== 'filters'/,
    `current.id !== 'snippets' && current.id !== 'shortcuts' && current.id !== 'filters' && current.id !== 'signature'`
  );
  
  content = content.replace(
    /\{current\.id !== 'inbox'/,
    `${sigUI.trim()}\n                {current.id !== 'inbox'`
  );
  fs.writeFileSync('src/components/SettingsModal.tsx', content);
}

let compose = fs.readFileSync('src/components/ComposeEmail.tsx', 'utf8');
compose = compose.replace(/const \{ signatureEnabled \} = useAccountDataStore\(\);/, `const { signatureEnabled, signatureText } = useAccountDataStore();`);
compose = compose.replace(/setBody\("<br><br><div>-- <br>Sent from AgentMail<\/div>"\);/g, `setBody("<br><br><div>" + signatureText.replace(/\\n/g, '<br>') + "</div>");`);
compose = compose.replace(/if \(el && !el\.innerHTML\) el\.innerHTML = "<br><br><div>-- <br>Sent from AgentMail<\/div>";/g, `if (el && !el.innerHTML) el.innerHTML = "<br><br><div>" + signatureText.replace(/\\n/g, '<br>') + "</div>";`);
fs.writeFileSync('src/components/ComposeEmail.tsx', compose);

let peek = fs.readFileSync('src/components/EmailDetailPeek.tsx', 'utf8');
peek = peek.replace(/const \{ signatureEnabled, snippets \} = useAccountDataStore\(\);/, `const { signatureEnabled, signatureText, snippets } = useAccountDataStore();`);
peek = peek.replace(/setDraftText\("<br><br><div>-- <br>Sent from AgentMail<\/div>"\);/g, `setDraftText("<br><br><div>" + signatureText.replace(/\\n/g, '<br>') + "</div>");`);
peek = peek.replace(/if \(replyRef\.current\) replyRef\.current\.innerHTML = "<br><br><div>-- <br>Sent from AgentMail<\/div>";/g, `if (replyRef.current) replyRef.current.innerHTML = "<br><br><div>" + signatureText.replace(/\\n/g, '<br>') + "</div>";`);
fs.writeFileSync('src/components/EmailDetailPeek.tsx', peek);

