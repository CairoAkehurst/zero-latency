'use client';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { updateSettings, useAccountData, useSettings } from '@/lib/client/store';
import { Glyph, Icon } from './icons';
import { FOLDERS, useMail } from './mail-context';

interface Cmd { id: string; label: string; hint?: string; icon: React.ReactNode; run: () => void; group: string }

export function CommandPalette({ onClose, openSearch }: { onClose: () => void; openSearch: () => void }) {
  const { navigate, compose, openSettings, openAutoLabel, activeView, openEditView } = useMail();
  const data = useAccountData();
  const settings = useSettings();
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(0);

  const commands = useMemo<Cmd[]>(() => [
    { id: 'compose', label: 'Compose new email', hint: 'C', icon: <Icon name="compose" />, run: () => compose({ mode: 'new' }), group: 'Actions' },
    { id: 'search', label: 'Search mail', hint: '/', icon: <Icon name="search" />, run: openSearch, group: 'Actions' },
    { id: 'autolabel', label: 'Create an auto label', icon: <Icon name="wand" />, run: () => openAutoLabel(), group: 'Actions' },
    ...(activeView ? [{ id: 'edit', label: `Edit view “${activeView.name}”`, hint: 'Ctrl E', icon: <Icon name="gear" />, run: () => openEditView(activeView.id), group: 'Actions' }] : []),
    ...data.views.map((v, i) => ({ id: `v:${v.id}`, label: v.name, hint: i < 9 ? String(i + 1) : undefined, icon: <Glyph name={v.glyph} ink={v.ink} />, run: () => navigate({ kind: 'view', id: v.id }), group: 'Views' })),
    ...FOLDERS.map((f) => ({ id: `f:${f.id}`, label: f.name, icon: <Icon name={f.icon} />, run: () => navigate({ kind: 'folder', id: f.id }), group: 'Mail' })),
    { id: 'theme', label: `Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} theme`, icon: <Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} />, run: () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' }), group: 'Settings' },
    { id: 'style', label: `Open threads in ${settings.threadStyle === 'side' ? 'full page' : 'side peek'}`, icon: <Icon name="sidebar" />, run: () => updateSettings({ threadStyle: settings.threadStyle === 'side' ? 'full' : 'side' }), group: 'Settings' },
    { id: 'settings', label: 'Settings', icon: <Icon name="gear" />, run: () => openSettings('inbox'), group: 'Settings' },
    { id: 'snippets', label: 'Manage snippets', icon: <Icon name="brackets" />, run: () => openSettings('snippets'), group: 'Settings' },
    { id: 'filters', label: 'Gmail filters', icon: <Icon name="filter" />, run: () => openSettings('filters'), group: 'Settings' },
    { id: 'shortcuts', label: 'Keyboard shortcuts', hint: '?', icon: <Icon name="keyboard" />, run: () => openSettings('shortcuts'), group: 'Settings' },
  ], [compose, openSearch, openAutoLabel, activeView, openEditView, data.views, navigate, settings.theme, settings.threadStyle, openSettings]);

  const needle = q.trim().toLowerCase();
  const results = commands.filter((c) => !needle || c.label.toLowerCase().includes(needle) || c.group.toLowerCase().includes(needle));
  const run = (c: Cmd | undefined) => { if (!c) return; onClose(); c.run(); };

  return createPortal(
    <div className="zl-palette-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="zl-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="zl-menu">
          <input className="zl-input zl-menu-search" autoFocus placeholder="Type a command or view…" value={q} aria-label="Command"
            onChange={(e) => { setQ(e.target.value); setIndex(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); run(results[index]); }
              else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            }} />
          <div className="zl-menu-scroll" role="listbox" style={{ maxHeight: 420 }}>
            {results.map((c, i) => (
              <div key={c.id} style={{ display: 'contents' }}>
                {i === 0 || results[i - 1]!.group !== c.group ? <div className="zl-menu-label">{c.group}</div> : null}
                <button className={`zl-menu-item ${i === index ? 'is-hover' : ''}`} role="option" aria-selected={i === index} onMouseEnter={() => setIndex(i)} onClick={() => run(c)}>
                  {c.icon}{c.label}{c.hint ? <span className="zl-menu-item-hint"><span className="zl-kbd">{c.hint}</span></span> : null}
                </button>
              </div>
            ))}
            {!results.length ? <div className="zl-menu-empty">No matching commands.</div> : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
