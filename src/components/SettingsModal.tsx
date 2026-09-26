"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { Popover } from './ui';

import { useSettingsStore, useAccountDataStore } from '@/lib/client/store';


const SECTIONS = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox', group: 'Account' },
  { id: 'ai', label: 'AI', icon: 'sparkle', group: 'Account' },
  { id: 'filters', label: 'Gmail filters', icon: 'filter', group: 'Account' },
  { id: 'snippets', label: 'Snippets', icon: 'brackets', group: 'Account' },
  { id: 'signature', label: 'Signature', icon: 'pen', group: 'Account' },
  { id: 'notifications', label: 'Notifications', icon: 'bell', group: 'Account' },
  { id: 'account', label: 'Manage accounts', icon: 'person', group: 'Account' },
  { id: 'shortcuts', label: 'Keyboard shortcuts', icon: 'keyboard', group: 'Workspace' },
];

function Choice<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <button className="zl-select-trigger" aria-haspopup="listbox" aria-expanded={!!anchor} aria-label={label} onClick={(e) => setAnchor(e.currentTarget)}>
        {options.find((o) => o.value === value)?.label}<Icon name="chevDown" />
      </button>
      {anchor ? (
        <Popover anchor={anchor} onClose={() => setAnchor(null)} placement="bottom-end" label={label}>
          <div className="zl-menu" role="listbox" style={{ width: 200 }}>
            {options.map((o) => (
              <button key={o.value} className="zl-menu-item" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setAnchor(null); }}>
                {o.label}{o.value === value ? <Icon name="check" className="zl-menu-item-check" /> : null}
              </button>
            ))}
          </div>
        </Popover>
      ) : null}
    </>
  );
}

function Row({ title, desc, children }: { title: string; desc?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="zl-setting">
      <span className="zl-setting-text">
        <strong>{title}</strong>
        {desc ? <small>{desc}</small> : null}
      </span>
      {children}
    </div>
  );
}

export function SettingsModal({ section, setSection, onClose }: { section: string; setSection: (s: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme, threadStyle, setThreadStyle, autoAdvance, setAutoAdvance, fontSize, setFontSize } = useSettingsStore();
  const { snippets, filters, signatureEnabled, signatureText, updateAccount } = useAccountDataStore();
  const [editingSnippet, setEditingSnippet] = useState<any>(null);
  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape' && !document.querySelector('.zl-popover, .zl-dialog')) { 
        e.stopPropagation(); 
        onClose(); 
      } 
    };
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]!;

  return createPortal(
    <div className="zl-modal-host">
      <div className="zl-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="zl-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" ref={ref}>
          <nav className="zl-modal-nav" aria-label="Settings">
            {(['Account', 'Workspace'] as const).map((g) => (
              <div key={g} style={{ display: 'contents' }}>
                <span className="zl-section-label">{g}</span>
                {SECTIONS.filter((s) => s.group === g).map((s) => (
                  <button key={s.id} className="zl-nav-item" aria-current={s.id === current.id ? 'page' : undefined} onClick={() => setSection(s.id)}>
                    <Icon name={s.icon as any} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="zl-modal-main">
            <button className="zl-btn zl-btn--icon zl-modal-close" aria-label="Close settings" onClick={onClose}>
              <Icon name="x" />
            </button>
            <h2 id="settings-title">{current.label}</h2>
            
            {current.id === 'inbox' && (
              <>
                <Row title="Theme mode" desc="Choose how ZeroLatency looks on this device">
                  <Choice label="Theme mode" value={theme} onChange={setTheme} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
                </Row>
                <Row title="Thread style" desc="Change how open threads are displayed">
                  <Choice label="Thread style" value={threadStyle} onChange={setThreadStyle} options={[{ value: 'side', label: 'Side peek' }, { value: 'center', label: 'Center peek' }, { value: 'full', label: 'Full page' }]} />
                </Row>
                <Row title="Auto-advance" desc="Choose where to go after archiving or deleting a thread">
                  <Choice label="Auto-advance" value={autoAdvance} onChange={setAutoAdvance} options={[{ value: 'next', label: 'Go to next thread' }, { value: 'previous', label: 'Go to previous thread' }, { value: 'list', label: 'Back to the list' }]} />
                </Row>
                <Row title="Font size" desc="Choose the size of the font in the inbox">
                  <Choice label="Font size" value={fontSize} onChange={setFontSize} options={[{ value: 'default', label: 'Default' }, { value: 'large', label: 'Large' }]} />
                </Row>
              </>
            )}

            {current.id === 'account' && (
              <>
                <Row title="Current Account" desc="Connected via Supabase">
                   <button className="zl-btn zl-btn--secondary">Reconnect</button>
                </Row>
                <Row title="Sign out" desc="Sign out of every account on this device.">
                   <button className="zl-btn zl-btn--danger">Sign out</button>
                </Row>
              </>
            )}

            
            {current.id === 'snippets' && (
              <>
                <Row title="Snippets" desc="Reusable text. Put {{availability}} in a snippet to insert open times from your calendar.">
                  <button className="zl-btn zl-btn--secondary" onClick={() => setEditingSnippet({ id: Math.random().toString(), name: '', body: '' })}><Icon name="plus" />New snippet</button>
                </Row>
                {editingSnippet ? (
                  <div className="zl-form-grid">
                    <div className="zl-field"><label className="zl-field-label">Name</label><input autoFocus value={editingSnippet.name} onChange={e => setEditingSnippet({...editingSnippet, name: e.target.value})} className="zl-input" /></div>
                    <div className="zl-field"><label className="zl-field-label">Text</label><textarea value={editingSnippet.body} onChange={e => setEditingSnippet({...editingSnippet, body: e.target.value})} className="zl-input zl-textarea" rows={4} /></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="zl-btn zl-btn--primary" onClick={() => {
                        updateAccount(d => ({ ...d, snippets: [...d.snippets.filter(s => s.id !== editingSnippet.id), editingSnippet] }));
                        setEditingSnippet(null);
                      }}>Save snippet</button>
                      <button className="zl-btn zl-btn--ghost" onClick={() => setEditingSnippet(null)}>Cancel</button>
                    </div>
                  </div>
                ) : null}
                <div className="zl-list-card mt-4">
                  {snippets.length === 0 && !editingSnippet ? <p className="zl-field-hint">No snippets yet.</p> : null}
                  {snippets.map(s => (
                    <div key={s.id} className="zl-list-card-row">
                      <span className="zl-setting-text"><strong>{s.name}</strong><small>{s.body}</small></span>
                      <button className="zl-btn zl-btn--text zl-btn--sm" onClick={() => setEditingSnippet(s)}>Edit</button>
                      <button className="zl-btn zl-btn--danger zl-btn--sm" onClick={() => updateAccount(d => ({ ...d, snippets: d.snippets.filter(x => x.id !== s.id) }))}>Delete</button>
                    </div>
                  ))}
                </div>
              </>
            )}


            {current.id === 'shortcuts' && (
              <div className="zl-form-grid">
                <Row title="Compose" desc={<kbd className="zl-kbd">C</kbd>} />
                <Row title="Search" desc={<kbd className="zl-kbd">/</kbd>} />
                <Row title="Reply" desc={<kbd className="zl-kbd">R</kbd>} />
                <Row title="Archive" desc={<kbd className="zl-kbd">E</kbd>} />
                <Row title="Delete" desc={<kbd className="zl-kbd">#</kbd>} />
              </div>
            )}

{current.id === 'filters' && (
              <>
                <Row title="Filters" desc="Automatically categorize or archive incoming emails based on rules.">
                  <button className="zl-btn zl-btn--secondary" onClick={() => updateAccount(d => ({ ...d, filters: [...(d.filters||[]), { id: Math.random().toString(), from: '*@example.com', label: 'Updates' }] }))}><Icon name="plus" />New filter</button>
                </Row>
                <div className="zl-list-card mt-4">
                  {(!filters || filters.length === 0) ? <p className="zl-field-hint">No filters yet.</p> : null}
                  {(filters||[]).map(f => (
                    <div key={f.id} className="zl-list-card-row">
                      <span className="zl-setting-text"><strong>If from {f.from}</strong><small>Apply label: {f.label}</small></span>
                      <button className="zl-btn zl-btn--danger zl-btn--sm" onClick={() => updateAccount(d => ({ ...d, filters: d.filters.filter(x => x.id !== f.id) }))}>Delete</button>
                    </div>
                  ))}
                </div>
              </>
            )}
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
                {current.id !== 'inbox' && current.id !== 'account' && current.id !== 'snippets' && current.id !== 'shortcuts' && current.id !== 'filters' && current.id !== 'signature' && (<p className="zl-field-hint">These settings will be configurable in a future update.</p>)}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
