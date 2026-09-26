"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { Popover } from './ui';

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

function Row({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
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
  const [theme, setTheme] = useState('system');
  const [threadStyle, setThreadStyle] = useState('side');
  const [autoAdvance, setAutoAdvance] = useState('next');
  const [fontSize, setFontSize] = useState('default');
  
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

            {current.id !== 'inbox' && current.id !== 'account' && (
              <p className="zl-field-hint">These settings will be configurable in a future update.</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
