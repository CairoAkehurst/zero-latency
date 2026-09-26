'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client/api';
import { updateAccount, updateView, useAccountData } from '@/lib/client/store';
import type { View } from '@/lib/shared/views';
import { Glyph, Icon } from './icons';
import { IconButton, Popover, useMenuKeys } from './ui';
import { FOLDERS, useMail } from './mail-context';
import { GlyphPicker, NewViewMenu } from './NewViewMenu';
import { DeleteViewDialog, ViewContextMenu } from './ViewMenu';

function Avatar({ name, picture }: { name: string; picture: string | null }) {
  if (picture) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="zl-avatar" src={picture} alt="" referrerPolicy="no-referrer" style={{ objectFit: 'cover' }} />;
  }
  return <span className="zl-avatar" aria-hidden>{(name[0] ?? '?').toUpperCase()}</span>;
}

function AccountMenu({ anchor, onClose }: { anchor: HTMLElement; onClose: () => void }) {
  const { session, account, openSettings } = useMail();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useMenuKeys(ref);
  const switchTo = async (id: string) => {
    await api.switchAccount(id);
    window.location.reload();
  };
  return (
    <Popover anchor={anchor} onClose={onClose} label="Accounts">
      <div className="zl-menu" ref={ref} style={{ width: 280 }}>
        <div className="zl-menu-label">Accounts</div>
        {session.accounts.map((a) => (
          <button key={a.id} className="zl-menu-item zl-menu-item--2line" onClick={() => (a.id === account.id ? onClose() : switchTo(a.id))} disabled={session.demo}>
            <Avatar name={a.name} picture={a.picture} />
            <span className="zl-menu-item-text">{a.name}<small>{a.email}</small></span>
            {a.id === account.id ? <Icon name="check" className="zl-menu-item-check" /> : null}
          </button>
        ))}
        {!session.demo ? (
          <a className="zl-menu-item" href={`/api/auth/login?returnTo=${encodeURIComponent('/mail')}`}><Icon name="plus" />Add another account</a>
        ) : null}
        <div className="zl-menu-sep" />
        <button className="zl-menu-item" onClick={() => { onClose(); openSettings('inbox'); }}><Icon name="gear" />Settings</button>
        <button className="zl-menu-item" onClick={() => { onClose(); openSettings('account'); }}><Icon name="user" />Manage accounts</button>
        {!session.demo ? (
          <button className="zl-menu-item" onClick={async () => { const r = await api.logout({ accountId: account.id }); if (r.remaining) window.location.reload(); else router.replace('/login'); }}>
            <Icon name="logout" />Sign out of {account.email}
          </button>
        ) : null}
      </div>
    </Popover>
  );
}

export function Sidebar({ onSearch }: { onSearch: () => void }) {
  const { account, nav, navigate, counts, compose, openSettings } = useMail();
  const data = useAccountData();
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const [newViewAnchor, setNewViewAnchor] = useState<HTMLElement | null>(null);
  const [showAllFolders, setShowAllFolders] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [collapsedViews, setCollapsedViews] = useState(false);
  const [menu, setMenu] = useState<{ view: View; at: DOMRect; el: HTMLElement } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [iconFor, setIconFor] = useState<{ view: View; el: HTMLElement } | null>(null);
  const [deleting, setDeleting] = useState<View | null>(null);

  const [pinnedView, ...otherViews] = data.views;
  const scrollViews = collapsedViews ? otherViews.slice(0, 5) : otherViews;
  const folders = showAllFolders ? FOLDERS : FOLDERS.filter((f) => ['all', 'sent', 'drafts', 'reminders'].includes(f.id));

  const reorder = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    updateAccount((d) => {
      const views = [...d.views];
      const from = views.findIndex((v) => v.id === dragId);
      const to = views.findIndex((v) => v.id === targetId);
      if (from < 0 || to < 0) return d;
      const [moved] = views.splice(from, 1);
      views.splice(to, 0, moved!);
      return { ...d, views };
    });
  };

  const openMenu = (v: View, e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    // Keyboard (context-menu key / Shift+F10) reports 0,0: anchor to the item instead of the pointer.
    const at = e.clientX || e.clientY ? new DOMRect(e.clientX, e.clientY, 0, 0) : el.getBoundingClientRect();
    setMenu({ view: v, at, el });
  };

  const renderView = (v: View, i: number, pinned = false) => {
    const active = nav.kind === 'view' && nav.id === v.id;
    const count = counts[`view:${v.id}`];
    if (renamingId === v.id) {
      const done = (name: string | null) => {
        const trimmed = name?.trim();
        if (trimmed && trimmed !== v.name) updateView(v.id, (x) => ({ ...x, name: trimmed.slice(0, 80) }));
        setRenamingId(null);
      };
      return (
        <div key={v.id} className="zl-nav-rename">
          <Glyph name={v.glyph} ink={v.ink} />
          <input autoFocus defaultValue={v.name} aria-label="View name" maxLength={80}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => done(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.preventDefault(); done(null); } }} />
        </div>
      );
    }
    return (
      <button
        key={v.id}
        className={`zl-nav-item${dragId === v.id ? ' is-dragging' : ''}${menu?.view.id === v.id ? ' is-hover' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={() => navigate({ kind: 'view', id: v.id })}
        onContextMenu={(e) => openMenu(v, e)}
        onDoubleClick={() => setRenamingId(v.id)}
        draggable={!pinned}
        onDragStart={() => setDragId(v.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => { if (!pinned) reorder(v.id); setDragId(null); }}
        onDragEnd={() => setDragId(null)}
        aria-label={`${v.name}${count ? `, ${count} unread` : ''}${i < 9 ? `, shortcut ${i + 1}` : ''}`}
        aria-haspopup="menu"
      >
        <Glyph name={v.glyph} ink={v.ink} />
        <span>{v.name}</span>
        {count ? <span className="zl-nav-count">{count >= 100 ? '99+' : count}</span> : null}
      </button>
    );
  };

  return (
    <nav className="zl-sidebar" aria-label="Mailbox">
      <div className="zl-account">
        <button className="zl-btn zl-btn--ghost" style={{ flex: 1, justifyContent: 'flex-start', padding: '0 4px', height: 36, minWidth: 0, gap: 8 }} onClick={(e) => setAccountAnchor(e.currentTarget)} aria-haspopup="menu" aria-label="Switch account">
          <Avatar name={account.name} picture={account.picture} />
          <span className="zl-account-id" style={{ textAlign: 'left' }}><strong>{account.name}</strong><small>{account.email}</small></span>
          <Icon name="chevDown" size={12} />
        </button>
        <IconButton icon="compose" label="Compose a new email" shortcut="C" onClick={() => compose({ mode: 'new' })} />
      </div>
      <button className="zl-nav-item" onClick={onSearch}><Icon name="search" className="zl-icon--lg" /><span>Search</span></button>

      {/* The primary Inbox sits on its own above the Views list, which scrolls independently. */}
      {pinnedView ? renderView(pinnedView, 0, true) : null}
      <div className="zl-nav-section">
        <span className="zl-section-label">Views</span>
        <IconButton icon="plus" label="New view" size="sm" onClick={(e) => setNewViewAnchor(e.currentTarget)} />
      </div>
      <div className="zl-nav-scroll">
        {scrollViews.map((v, i) => renderView(v, i + 1))}
      </div>
      {/* Outside the scroll area so it is always reachable. */}
      {data.views.length > 6 ? (
        <button className="zl-nav-item" onClick={() => setCollapsedViews((c) => !c)}><Icon name={collapsedViews ? 'chevDown' : 'chevUp'} className="zl-icon--lg" /><span>{collapsedViews ? 'More' : 'Less'}</span></button>
      ) : null}

      <div className="zl-nav-section"><span className="zl-section-label">Mail</span></div>
      {folders.map((f) => {
        const active = nav.kind === 'folder' && nav.id === f.id;
        const count = f.id === 'drafts' || f.id === 'reminders' ? counts[`folder:${f.id}`] : undefined;
        if (f.id === 'reminders' && !count && !active) return null;
        return (
          <button key={f.id} className="zl-nav-item" aria-current={active ? 'page' : undefined} onClick={() => navigate({ kind: 'folder', id: f.id })}>
            <Icon name={f.icon} className="zl-icon--lg" /><span>{f.name}</span>
            {count ? <span className="zl-nav-count">{count >= 100 ? '99+' : count}</span> : null}
          </button>
        );
      })}
      <button className="zl-nav-item" onClick={() => setShowAllFolders((s) => !s)}>
        <Icon name={showAllFolders ? 'chevUp' : 'chevDown'} className="zl-icon--lg" /><span>{showAllFolders ? 'Less' : 'More'}</span>
      </button>

      <div className="zl-sidebar-foot">
        <IconButton icon="gear" label="Settings" placement="top" onClick={() => openSettings('inbox')} />
        <IconButton icon="keyboard" label="Keyboard shortcuts" shortcut="?" placement="top" onClick={() => openSettings('shortcuts')} />
        <IconButton icon="help" label="Help & feedback" placement="top" onClick={() => window.open('https://github.com/Dead-Zone27/ZeroLatency-Claude/issues', '_blank', 'noopener')} />
      </div>

      {accountAnchor ? <AccountMenu anchor={accountAnchor} onClose={() => setAccountAnchor(null)} /> : null}
      {newViewAnchor ? <NewViewMenu anchor={newViewAnchor} onClose={() => setNewViewAnchor(null)} /> : null}
      {menu ? (
        <ViewContextMenu
          view={menu.view}
          at={menu.at}
          onRename={() => setRenamingId(menu.view.id)}
          onChangeIcon={() => setIconFor({ view: menu.view, el: menu.el })}
          onDelete={() => setDeleting(menu.view)}
          onClose={() => setMenu(null)}
        />
      ) : null}
      {iconFor ? <GlyphPicker anchor={iconFor.el} glyph={iconFor.view.glyph} ink={iconFor.view.ink} onPick={(g, ink) => updateView(iconFor.view.id, (x) => ({ ...x, glyph: g, ink }))} onClose={() => setIconFor(null)} /> : null}
      {deleting ? <DeleteViewDialog view={deleting} onClose={() => setDeleting(null)} /> : null}
    </nav>
  );
}
