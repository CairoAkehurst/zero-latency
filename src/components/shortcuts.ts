'use client';
import { useEffect, useRef } from 'react';
import type { ThreadSummary } from '@/lib/shared/types';
import type { View } from '@/lib/shared/views';
import type { ComposeInit, NavTarget, ThreadAction } from './mail-context';

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['j', '↓'], label: 'Next thread' },
  { keys: ['k', '↑'], label: 'Previous thread' },
  { keys: ['Enter', 'o'], label: 'Open thread' },
  { keys: ['Esc'], label: 'Close thread / clear selection' },
  { keys: ['x'], label: 'Select thread' },
  { keys: ['e'], label: 'Archive' },
  { keys: ['#'], label: 'Move to Trash' },
  { keys: ['Shift', 'U'], label: 'Mark as unread' },
  { keys: ['Shift', 'I'], label: 'Mark as read' },
  { keys: ['s'], label: 'Star / unstar' },
  { keys: ['h'], label: 'Remind me tomorrow' },
  { keys: ['!'], label: 'Report spam' },
  { keys: ['r'], label: 'Reply' },
  { keys: ['a'], label: 'Reply all' },
  { keys: ['f'], label: 'Forward' },
  { keys: ['c'], label: 'Compose' },
  { keys: ['/'], label: 'Search' },
  { keys: ['g', 'i'], label: 'Go to first view' },
  { keys: ['g', 's'], label: 'Go to Sent' },
  { keys: ['g', 'd'], label: 'Go to Drafts' },
  { keys: ['g', 'a'], label: 'Go to All mail' },
  { keys: ['1…9'], label: 'Go to view by position' },
  { keys: ['⌘/Ctrl', 'K'], label: 'Command palette' },
  { keys: ['⌘/Ctrl', 'Enter'], label: 'Send (in composer)' },
  { keys: ['?'], label: 'Keyboard shortcuts' },
];

export function tomorrowMorning(now = new Date()): number {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || !!t.closest('[role="dialog"]');
}

export function useShortcuts(o: {
  enabled: boolean;
  threads: ThreadSummary[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  openThreadId: string | null;
  setOpenThreadId: (id: string | null) => void;
  act: (ids: string[], a: ThreadAction) => Promise<void>;
  compose: (i: ComposeInit) => void;
  navigate: (t: NavTarget) => void;
  views: View[];
  openPalette: () => void;
  openSearch: () => void;
  openShortcuts: () => void;
}) {
  const focus = useRef<string | null>(null);
  const pendingG = useRef<number>(0);
  const opts = useRef(o);
  useEffect(() => { opts.current = o; }, [o]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = opts.current;
      if (!s.enabled || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return;
      const ts = s.threads;
      const current = s.openThreadId ?? focus.current;
      const idx = ts.findIndex((t) => t.id === current);
      const targets = s.selected.size ? [...s.selected] : current ? [current] : [];
      const setFocus = (i: number) => {
        const t = ts[Math.max(0, Math.min(ts.length - 1, i))];
        if (!t) return;
        focus.current = t.id;
        document.querySelector<HTMLElement>(`[data-thread-id="${CSS.escape(t.id)}"]`)?.focus();
        if (s.openThreadId) s.setOpenThreadId(t.id);
      };

      if (pendingG.current && Date.now() - pendingG.current < 1200) {
        pendingG.current = 0;
        const k = e.key.toLowerCase();
        if (k === 'i' && s.views[0]) s.navigate({ kind: 'view', id: s.views[0].id });
        else if (k === 's') s.navigate({ kind: 'folder', id: 'sent' });
        else if (k === 'd') s.navigate({ kind: 'folder', id: 'drafts' });
        else if (k === 'a') s.navigate({ kind: 'folder', id: 'all' });
        else return;
        e.preventDefault();
        return;
      }

      const key = e.key;
      let handled = true;
      switch (key) {
        case 'j': case 'ArrowDown': setFocus(idx + 1); break;
        case 'k': case 'ArrowUp': setFocus(idx < 0 ? 0 : idx - 1); break;
        case 'Enter': case 'o': if (current) s.setOpenThreadId(current); else handled = false; break;
        case 'Escape':
          if (s.openThreadId) s.setOpenThreadId(null);
          else if (s.selected.size) s.setSelected(new Set());
          else handled = false;
          break;
        case 'x': if (current) { const n = new Set(s.selected); if (n.has(current)) n.delete(current); else n.add(current); s.setSelected(n); } break;
        case 'e': void s.act(targets, { kind: 'archive' }); break;
        case '#': case 'Delete': void s.act(targets, { kind: 'trash' }); break;
        case '!': void s.act(targets, { kind: 'spam' }); break;
        case 'U': void s.act(targets, { kind: 'unread' }); break;
        case 'I': void s.act(targets, { kind: 'read' }); break;
        case 's': {
          const t = ts.find((x) => x.id === targets[0]);
          if (t) void s.act(targets, { kind: t.starred ? 'unstar' : 'star' });
          break;
        }
        case 'h': void s.act(targets, { kind: 'remind', at: tomorrowMorning() }); break;
        case 'c': s.compose({ mode: 'new' }); break;
        case '/': s.openSearch(); break;
        case '?': s.openShortcuts(); break;
        case 'g': pendingG.current = Date.now(); break;
        case 'r': case 'a': case 'f':
          // Handled by the open thread view.
          handled = false;
          if (s.openThreadId) window.dispatchEvent(new CustomEvent('zl:thread-key', { detail: key }));
          break;
        default:
          if (/^[1-9]$/.test(key) && s.views[Number(key) - 1]) s.navigate({ kind: 'view', id: s.views[Number(key) - 1]!.id });
          else handled = false;
      }
      if (handled && targets.length === 0 && ['e', '#', 'Delete', '!', 'U', 'I', 's', 'h'].includes(key)) handled = false;
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
