'use client';
import { useRef } from 'react';
import { deleteView, duplicateView, useAccountData } from '@/lib/client/store';
import type { View } from '@/lib/shared/views';
import { Icon } from './icons';
import { Dialog, Popover, useMenuKeys } from './ui';
import { useMail } from './mail-context';

/** Right-click menu for a view in the sidebar. */
export function ViewContextMenu({ view, at, onRename, onChangeIcon, onDelete, onClose }: {
  view: View;
  at: DOMRect;
  onRename: () => void;
  onChangeIcon: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { navigate, openEditView } = useMail();
  const ref = useRef<HTMLDivElement>(null);
  useMenuKeys(ref);
  const run = (fn: () => void) => () => { onClose(); fn(); };
  return (
    <Popover anchor={at} onClose={onClose} label={`${view.name} options`}>
      <div className="zl-menu" ref={ref} role="menu" style={{ width: 220 }}>
        <button className="zl-menu-item" role="menuitem" autoFocus onClick={run(onRename)}><Icon name="pen" />Rename</button>
        <button className="zl-menu-item" role="menuitem" onClick={run(onChangeIcon)}><Icon name="sparkle" />Change icon</button>
        <button className="zl-menu-item" role="menuitem" onClick={run(() => { navigate({ kind: 'view', id: view.id }); openEditView(view.id); })}><Icon name="gear" />Edit view</button>
        <button className="zl-menu-item" role="menuitem" onClick={run(() => navigate({ kind: 'view', id: duplicateView(view) }))}><Icon name="plus" />Duplicate</button>
        <div className="zl-menu-sep" />
        <button className="zl-menu-item zl-menu-item--danger" role="menuitem" onClick={run(onDelete)}><Icon name="trash" />Delete view</button>
      </div>
    </Popover>
  );
}

/** Confirms deleting a view. Keeps at least one view so the app always has an inbox to show. */
export function DeleteViewDialog({ view, onClose, onDeleted }: { view: View; onClose: () => void; onDeleted?: () => void }) {
  const data = useAccountData();
  const last = data.views.length <= 1;
  return (
    <Dialog
      title="Delete view"
      onClose={onClose}
      actions={
        <>
          <button className="zl-btn zl-btn--secondary" onClick={onClose}>Cancel</button>
          <button className="zl-btn zl-btn--danger-solid" disabled={last} onClick={() => { deleteView(view.id); onClose(); onDeleted?.(); }}>Delete</button>
        </>
      }
    >
      <p>{last ? 'This is your only view. Create another view before deleting it.' : <>Delete “{view.name}”? Your email isn’t affected: the view is just a saved filter.</>}</p>
    </Dialog>
  );
}
