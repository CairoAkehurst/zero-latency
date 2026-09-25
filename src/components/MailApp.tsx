'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, setApiAccount } from '@/lib/client/api';
import { initStores, updateAccount, useAccountData, useSettings, accountStore, settingsStore } from '@/lib/client/store';
import { compileView } from '@/lib/shared/views';
import type { Label, SessionInfo, ThreadSummary } from '@/lib/shared/types';
import { FOLDERS, MailContext, REMINDER_LABEL, type ComposeInit, type MailCtx, type NavTarget, type ThreadAction } from './mail-context';
import { ToastProvider, useToast, Spinner } from './ui';
import { Sidebar } from './Sidebar';
import { SummaryGrid } from './SummaryGrid';
import { ListPane } from './ListPane';
import { ThreadView } from './ThreadView';
import { Composer } from './Composer';
import { EditViewPanel } from './EditViewPanel';
import { SettingsModal } from './SettingsModal';
import { CommandPalette } from './CommandPalette';
import { Onboarding } from './Onboarding';
import { AutoLabelDialog } from './AutoLabelDialog';
import { useShortcuts } from './shortcuts';

export function MailApp() {
  return (
    <ToastProvider>
      <Boot />
    </ToastProvider>
  );
}

function useThemeSync() {
  const s = useSettings();
  useEffect(() => {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') ?? 'system';
    // Cross-fade colours when the theme actually changes (not on first load).
    if (current !== s.theme) root.classList.add('zl-theme-switching');
    if (s.theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', s.theme);
    root.setAttribute('data-font', s.fontSize);
    const t = window.setTimeout(() => root.classList.remove('zl-theme-switching'), 350);
    return () => window.clearTimeout(t);
  }, [s.theme, s.fontSize]);
}

function Boot() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.session().then(async (s) => {
      if (!s.accounts.length || !s.activeId) { router.replace('/login'); return; }
      setApiAccount(s.activeId);
      await initStores(s.activeId, !s.demo);
      setSession(s);
    }).catch((e: Error) => setError(e.message));
  }, [router]);
  useThemeSync();
  if (error) return <main className="zl-center-page"><div className="zl-auth-card"><h1>Couldn’t load ZeroLatency</h1><p>{error}</p><a className="zl-btn zl-btn--primary" href="/mail">Try again</a></div></main>;
  if (!session) return <main className="zl-center-page" aria-busy="true"><Spinner /></main>;
  return <App session={session} />;
}

interface ListState {
  q: string;
  threads: ThreadSummary[];
  next: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

type PanelState = { viewId: string; step: 'root' | 'properties' | 'filters' | 'hover' };
type SideDesc = { kind: 'thread'; threadId: string } | { kind: 'panel'; panel: PanelState } | null;

function sameSide(a: SideDesc, b: SideDesc): boolean {
  if (!a || !b) return a === b;
  if (a.kind === 'thread' && b.kind === 'thread') return a.threadId === b.threadId;
  if (a.kind === 'panel' && b.kind === 'panel') return a.panel === b.panel;
  return false;
}

function navFromUrl(): { nav: NavTarget | null; thread: string | null } {
  const p = new URLSearchParams(window.location.search);
  const v = p.get('view'), f = p.get('folder'), s = p.get('q');
  const nav: NavTarget | null = p.has('summary') ? { kind: 'summary', id: 'inbox' } : v ? { kind: 'view', id: v } : f ? { kind: 'folder', id: f } : s ? { kind: 'search', id: s } : null;
  return { nav, thread: p.get('thread') };
}

function App({ session }: { session: SessionInfo }) {
  const account = session.accounts.find((a) => a.id === session.activeId)!;
  const me = account.email;
  const data = useAccountData();
  const settings = useSettings();
  const { push } = useToast();

  // ---------- labels ----------
  const [labels, setLabels] = useState<Label[]>([]);
  const refreshLabels = useCallback(async () => {
    const r = await api.labels();
    setLabels(r.labels);
    return r.labels;
  }, []);
  useEffect(() => { refreshLabels().catch(() => undefined); }, [refreshLabels]);
  const userLabels = useMemo(() => labels.filter((l) => l.type === 'user' && l.name !== REMINDER_LABEL).sort((a, b) => a.name.localeCompare(b.name)), [labels]);
  const ensureLabel = useCallback(async (name: string) => {
    const existing = labels.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    try {
      const { label } = await api.createLabel(name);
      setLabels((ls) => [...ls, label]);
      return label;
    } catch (e) {
      // Created elsewhere meanwhile: reload and find it.
      const fresh = await refreshLabels();
      const found = fresh.find((l) => l.name.toLowerCase() === name.toLowerCase());
      if (found) return found;
      throw e;
    }
  }, [labels, refreshLabels]);

  // ---------- navigation ----------
  const [nav, setNav] = useState<NavTarget>(() => {
    const fromUrl = typeof window !== 'undefined' ? navFromUrl().nav : null;
    return fromUrl ?? { kind: 'view', id: accountStore.get().views[0]?.id ?? '' };
  });
  const [openThreadId, setOpenThreadId] = useState<string | null>(() => (typeof window !== 'undefined' ? navFromUrl().thread : null));
  const activeView = nav.kind === 'view' ? data.views.find((v) => v.id === nav.id) ?? null : null;

  // Fall back to the first view if the current one was deleted or on first load after onboarding.
  useEffect(() => {
    if (nav.kind === 'view' && !activeView && data.views.length) setNav({ kind: 'view', id: data.views[0]!.id });
    if (nav.kind === 'view' && !data.views.length && data.onboarded) setNav({ kind: 'folder', id: 'all' });
  }, [nav, activeView, data.views, data.onboarded]);

  const query = useMemo(() => {
    if (nav.kind === 'search') return nav.id;
    if (nav.kind === 'folder') return FOLDERS.find((f) => f.id === nav.id)?.q ?? '';
    // Summary shows the primary Inbox (the first view) as cards.
    if (nav.kind === 'summary') return data.views[0] ? compileView(data.views[0].filters) : 'in:inbox';
    return activeView ? compileView(activeView.filters) : '';
  }, [nav, activeView, data.views]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (nav.kind === 'view') p.set('view', nav.id); else if (nav.kind === 'folder') p.set('folder', nav.id); else if (nav.kind === 'summary') p.set('summary', ''); else p.set('q', nav.id);
    if (openThreadId) p.set('thread', openThreadId);
    window.history.replaceState(null, '', `/mail?${p}`);
  }, [nav, openThreadId]);

  const navigate = useCallback((t: NavTarget) => { setNav(t); setOpenThreadId(null); setSelected(new Set()); }, []);

  // ---------- thread list ----------
  const [list, setList] = useState<ListState>({ q: '', threads: [], next: null, loading: true, loadingMore: false, error: null });
  const reqId = useRef(0);
  const loadList = useCallback(async (q: string, mode: 'replace' | 'silent' = 'replace') => {
    const id = ++reqId.current;
    if (mode === 'replace') setList({ q, threads: [], next: null, loading: true, loadingMore: false, error: null });
    try {
      const page = await api.threads(q);
      if (id !== reqId.current) return;
      setList((prev) => {
        if (mode === 'silent' && prev.q === q && prev.threads.length > page.threads.length) {
          // Keep extra pages the user already loaded; refresh the first page in place.
          const fresh = new Map(page.threads.map((t) => [t.id, t]));
          const rest = prev.threads.filter((t) => !fresh.has(t.id) && t.lastDate <= (page.threads[page.threads.length - 1]?.lastDate ?? 0));
          return { ...prev, threads: [...page.threads, ...rest], loading: false, error: null };
        }
        return { q, threads: page.threads, next: page.nextPageToken, loading: false, loadingMore: false, error: null };
      });
    } catch (e) {
      if (id !== reqId.current) return;
      setList((prev) => ({ ...prev, loading: false, error: (e as Error).message }));
    }
  }, []);
  const loadMore = useCallback(async () => {
    if (!list.next || list.loadingMore) return;
    const id = reqId.current;
    setList((p) => ({ ...p, loadingMore: true }));
    try {
      const page = await api.threads(list.q, list.next);
      if (id !== reqId.current) return;
      setList((p) => {
        const have = new Set(p.threads.map((t) => t.id));
        return { ...p, threads: [...p.threads, ...page.threads.filter((t) => !have.has(t.id))], next: page.nextPageToken, loadingMore: false };
      });
    } catch (e) {
      setList((p) => ({ ...p, loadingMore: false, error: (e as Error).message }));
    }
  }, [list.next, list.loadingMore, list.q]);

  const viewReady = nav.kind !== 'view' || !!activeView;
  useEffect(() => { if (data.onboarded && viewReady) loadList(query); }, [query, data.onboarded, viewReady, loadList]);
  const refreshList = useCallback(() => loadList(query, 'silent'), [loadList, query]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') refreshList(); }, 60_000);
    const onFocus = () => refreshList();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [refreshList]);

  // ---------- counts ----------
  const [counts, setCounts] = useState<Record<string, number>>({});
  const countKeys = useMemo(() => [
    ...data.views.map((v) => ({ key: `view:${v.id}`, q: `${compileView(v.filters)} is:unread`.trim() })),
    { key: 'folder:drafts', q: 'in:drafts' },
    { key: 'folder:reminders', q: 'label:ZeroLatency-Reminders' },
  ], [data.views]);
  const refreshCounts = useCallback(() => {
    if (!data.onboarded) return;
    api.counts(countKeys.map((k) => k.q)).then((r) => {
      const next: Record<string, number> = {};
      countKeys.forEach((k, i) => { if ((r.counts[i] ?? -1) >= 0) next[k.key] = r.counts[i]!; });
      setCounts(next);
    }).catch(() => undefined);
  }, [countKeys, data.onboarded]);
  useEffect(() => {
    refreshCounts();
    const t = setInterval(() => { if (document.visibilityState === 'visible') refreshCounts(); }, 90_000);
    return () => clearInterval(t);
  }, [refreshCounts]);

  // ---------- selection ----------
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ---------- actions ----------
  const listRef = useRef(list);
  const openRef = useRef(openThreadId);
  useEffect(() => { listRef.current = list; openRef.current = openThreadId; }, [list, openThreadId]);

  const advanceFrom = useCallback((removed: string[]) => {
    const cur = openRef.current;
    if (!cur || !removed.includes(cur)) return;
    const ts = listRef.current.threads;
    const i = ts.findIndex((t) => t.id === cur);
    const remaining = ts.filter((t) => !removed.includes(t.id));
    let next: ThreadSummary | undefined;
    if (settingsStore.get().autoAdvance === 'next') next = ts.slice(i + 1).find((t) => !removed.includes(t.id)) ?? remaining[remaining.length - 1];
    else if (settingsStore.get().autoAdvance === 'previous') next = ts.slice(0, Math.max(i, 0)).reverse().find((t) => !removed.includes(t.id)) ?? remaining[0];
    setOpenThreadId(next?.id ?? null);
  }, []);

  const act = useCallback(async (ids: string[], action: ThreadAction, opts: { silent?: boolean; keepRows?: boolean } = {}) => {
    if (!ids.length) return;
    const snapshot = listRef.current.threads;
    const q = listRef.current.q.toLowerCase();
    const inInboxView = /\bin:inbox\b/.test(q);
    let add: string[] = [], remove: string[] = [], removeRows = false, verb = '';
    let undo: ThreadAction[] | null = null;
    switch (action.kind) {
      case 'archive': remove = ['INBOX']; removeRows = inInboxView; verb = 'Archived'; undo = [{ kind: 'inbox' }]; break;
      case 'inbox': add = ['INBOX']; verb = 'Moved to Inbox'; break;
      case 'trash': removeRows = !/\bin:trash\b/.test(q); verb = 'Moved to Trash'; undo = [{ kind: 'untrash' }]; break;
      case 'untrash': removeRows = /\bin:trash\b/.test(q); verb = 'Restored'; break;
      case 'read': remove = ['UNREAD']; removeRows = /\bis:unread\b/.test(q); break;
      case 'unread': add = ['UNREAD']; break;
      case 'star': add = ['STARRED']; break;
      case 'unstar': remove = ['STARRED']; removeRows = /\bis:starred\b/.test(q); break;
      case 'spam': add = ['SPAM']; remove = ['INBOX']; removeRows = true; verb = 'Reported as spam'; undo = [{ kind: 'notSpam' }]; break;
      case 'notSpam': add = ['INBOX']; remove = ['SPAM']; removeRows = /\bin:spam\b/.test(q); verb = 'Moved to Inbox'; break;
      case 'label': add = [action.labelId]; verb = ''; break;
      case 'unlabel': {
        remove = [action.labelId];
        const name = labels.find((l) => l.id === action.labelId)?.name;
        removeRows = !!name && q.includes(`label:${name.toLowerCase().replace(/[\s/]+/g, '-')}`);
        break;
      }
      case 'remind': {
        const label = await ensureLabel(REMINDER_LABEL);
        add = [label.id]; remove = ['INBOX']; undo = [{ kind: 'inbox' }, { kind: 'unlabel', labelId: label.id }]; removeRows = inInboxView; verb = `Reminder set for ${new Date(action.at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`;
        const subjects = new Map(snapshot.map((t) => [t.id, t.subject]));
        updateAccount((d) => ({ ...d, reminders: { ...d.reminders, ...Object.fromEntries(ids.map((id) => [id, { at: action.at, subject: subjects.get(id) ?? '' }])) } }));
        break;
      }
    }

    if (opts.keepRows) removeRows = false;
    // Optimistic update.
    setList((p) => ({
      ...p,
      threads: removeRows ? p.threads.filter((t) => !ids.includes(t.id)) : p.threads.map((t) => {
        if (!ids.includes(t.id)) return t;
        const labelIds = [...new Set([...t.labelIds.filter((l) => !remove.includes(l)), ...add])];
        return { ...t, labelIds, unread: labelIds.includes('UNREAD'), starred: labelIds.includes('STARRED') };
      }),
    }));
    if (removeRows) { advanceFrom(ids); setSelected((s) => { const n = new Set(s); ids.forEach((i) => n.delete(i)); return n; }); }

    try {
      if (action.kind === 'trash') await api.trash(ids);
      else if (action.kind === 'untrash') await api.trash(ids, true);
      else await api.modify(ids, add, remove);
      if (verb && !opts.silent) {
        push({ message: ids.length > 1 ? `${verb} ${ids.length} threads` : verb, action: undo ? { label: 'Undo', run: () => { const steps = undo!; void (async () => { for (const u of steps) await actRef.current(ids, u, { silent: true }); await loadList(listRef.current.q, 'silent'); })(); if (action.kind === 'remind') updateAccount((d) => { const r = { ...d.reminders }; ids.forEach((id) => delete r[id]); return { ...d, reminders: r }; }); } } : undefined });
      }
      refreshCounts();
    } catch (e) {
      setList((p) => ({ ...p, threads: snapshot }));
      push({ message: (e as Error).message, tone: 'error' });
    }
  }, [advanceFrom, ensureLabel, labels, loadList, push, refreshCounts]);
  const actRef = useRef(act);
  useEffect(() => { actRef.current = act; }, [act]);

  // ---------- reminders ----------
  useEffect(() => {
    const tick = async () => {
      const due = Object.entries(accountStore.get().reminders).filter(([, r]) => r.at <= Date.now());
      if (!due.length) return;
      const label = labels.find((l) => l.name === REMINDER_LABEL);
      const ids = due.map(([id]) => id);
      try {
        await api.modify(ids, ['INBOX', 'UNREAD'], label ? [label.id] : []);
        updateAccount((d) => { const r = { ...d.reminders }; ids.forEach((id) => delete r[id]); return { ...d, reminders: r }; });
        push({ message: due.length === 1 ? `Reminder: ${due[0]![1].subject || '(no subject)'}` : `${due.length} reminders are back in your inbox` });
        refreshList(); refreshCounts();
      } catch { /* retry next tick */ }
    };
    if (!labels.length) return;
    void tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [labels, push, refreshList, refreshCounts]);

  // ---------- auto labels ----------
  const autoRunning = useRef(false);
  useEffect(() => {
    if (!session.aiEnabled || autoRunning.current || !list.threads.length) return;
    const rules = data.autoLabels.filter((r) => r.enabled && labels.some((l) => l.id === r.labelId));
    if (!rules.length) return;
    const pending = list.threads.filter((t) => t.labelIds.includes('INBOX') && !data.autoLabelSeen[t.id] && t.lastDate >= Math.min(...rules.map((r) => r.createdAt)) - 14 * 86_400_000).slice(0, 25);
    if (!pending.length) return;
    autoRunning.current = true;
    api.aiAutoLabel(rules.map((r) => ({ id: r.id, name: r.name, description: r.description, labelId: r.labelId })), pending.map((t) => ({ id: t.id, subject: t.subject, snippet: t.snippet, participants: t.participants })))
      .then(async (res) => {
        updateAccount((d) => {
          const seen = { ...d.autoLabelSeen };
          res.processed.forEach((id) => { seen[id] = '1'; });
          const keys = Object.keys(seen);
          if (keys.length > 3000) keys.slice(0, keys.length - 3000).forEach((k) => delete seen[k]);
          return { ...d, autoLabelSeen: seen };
        });
        const toArchive: string[] = [];
        setList((p) => ({
          ...p,
          threads: p.threads.map((t) => {
            const ruleIds = res.assignments[t.id] ?? [];
            if (!ruleIds.length) return t;
            const add = ruleIds.map((rid) => rules.find((r) => r.id === rid)!).filter(Boolean);
            if (add.some((r) => !r.keepInInbox)) toArchive.push(t.id);
            return { ...t, labelIds: [...new Set([...t.labelIds, ...add.map((r) => r.labelId)])] };
          }),
        }));
        if (toArchive.length) await actRef.current(toArchive, { kind: 'archive' }, { silent: true });
        refreshCounts();
      })
      .catch((e: ApiError) => { if (e.code !== 'network') push({ message: `Auto label: ${e.message}`, tone: 'error' }); })
      .finally(() => { autoRunning.current = false; });
  }, [list.threads, data.autoLabels, data.autoLabelSeen, labels, session.aiEnabled, push, refreshCounts]);

  // ---------- desktop notifications ----------
  useEffect(() => {
    if (!settings.desktopNotifications || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const check = async () => {
      for (const v of accountStore.get().views.filter((x) => x.notify).slice(0, 4)) {
        try {
          const page = await api.threads(`${compileView(v.filters)} is:unread`.trim(), undefined, 10);
          const until = accountStore.get().notifiedUntil[v.id];
          const newest = Math.max(0, ...page.threads.map((t) => t.lastDate));
          if (until !== undefined) {
            for (const t of page.threads.filter((x) => x.lastDate > until).slice(0, 3)) {
              const from = t.participants[t.participants.length - 1];
              new Notification(from?.name || from?.email || v.name, { body: t.subject || t.snippet, tag: t.id });
            }
          }
          if (until === undefined || newest > until) updateAccount((d) => ({ ...d, notifiedUntil: { ...d.notifiedUntil, [v.id]: Math.max(newest, until ?? 0) } }));
        } catch { /* ignore */ }
      }
    };
    void check();
    const t = setInterval(check, 120_000);
    return () => clearInterval(t);
  }, [settings.desktopNotifications]);

  // ---------- overlays ----------
  const [floating, setFloating] = useState<(ComposeInit & { key: number }) | null>(null);
  const [inline, setInline] = useState<(ComposeInit & { key: number }) | null>(null);
  const composeSeq = useRef(0);
  const compose = useCallback((init: ComposeInit) => {
    const withKey = { ...init, key: ++composeSeq.current };
    if (init.inline) setInline(withKey); else setFloating(withKey);
  }, []);
  const [panel, setPanel] = useState<PanelState | null>(null);

  // ---------- right-side tab transitions ----------
  // What the tab shows now, and what it showed before a switch/close, so the old content can fade out while the
  // column resizes and the new content fades in (instead of both snapping at once).
  const currentSide: SideDesc = openThreadId && settings.threadStyle === 'side' ? { kind: 'thread', threadId: openThreadId } : panel ? { kind: 'panel', panel } : null;
  const [shownSide, setShownSide] = useState<SideDesc>(currentSide);
  const [leavingSide, setLeavingSide] = useState<SideDesc>(null);
  if (!sameSide(shownSide, currentSide)) {
    if (shownSide && shownSide.kind !== currentSide?.kind) setLeavingSide(shownSide);
    setShownSide(currentSide);
  }
  useEffect(() => {
    if (!leavingSide) return;
    const t = window.setTimeout(() => setLeavingSide(null), 420);
    return () => window.clearTimeout(t);
  }, [leavingSide]);
  const [settingsOpen, setSettingsOpen] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [autoLabelSeed, setAutoLabelSeed] = useState<{ name?: string; description?: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  useEffect(() => {
    const onReauth = (e: Event) => push({ message: (e as CustomEvent<string>).detail ?? 'Please sign in again.', tone: 'error', action: { label: 'Sign in', run: () => { window.open(`/api/auth/login?hint=${encodeURIComponent(me)}`, '_self'); } }, duration: 20000 });
    window.addEventListener('zl:reauth', onReauth);
    return () => window.removeEventListener('zl:reauth', onReauth);
  }, [me, push]);

  // The right side holds one tab at a time: opening a thread closes the edit-view panel and vice versa.
  const showThread = useCallback((id: string | null) => { setOpenThreadId(id); if (id) setPanel(null); }, []);
  const ctx: MailCtx = {
    session, account, me, labels, userLabels, refreshLabels, ensureLabel, nav, navigate, activeView, query, threads: list.threads,
    act, openThread: showThread, openThreadId, compose,
    openSettings: (s) => setSettingsOpen(s ?? 'inbox'),
    openEditView: (viewId, step = 'root') => { setPanel({ viewId, step }); if (settings.threadStyle === 'side') setOpenThreadId(null); },
    openAutoLabel: (seed) => setAutoLabelSeed(seed ?? {}),
    counts, refreshList, refreshCounts, aiEnabled: session.aiEnabled,
  };

  const anyOverlay = !!settingsOpen || paletteOpen || !!autoLabelSeed;
  useShortcuts({
    enabled: data.onboarded && !anyOverlay,
    threads: list.threads,
    selected, setSelected,
    openThreadId, setOpenThreadId: showThread,
    act, compose, navigate, views: data.views,
    openPalette: () => setPaletteOpen(true),
    openSearch: () => setSearchOpen(true),
    openShortcuts: () => setSettingsOpen('shortcuts'),
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'p') && !e.shiftKey && !e.altKey) { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!data.onboarded) {
    return (
      <MailContext.Provider value={ctx}>
        <Onboarding />
      </MailContext.Provider>
    );
  }

  const peek = openThreadId && settings.threadStyle === 'side';
  const full = openThreadId && settings.threadStyle === 'full';
  const center = openThreadId && settings.threadStyle === 'center';
  const side: 'thread' | 'panel' | null = peek ? 'thread' : panel ? 'panel' : null;
  const renderThread = (id: string) => (
    <ThreadView
      key={id}
      threadId={id}
      summary={list.threads.find((t) => t.id === id) ?? null}
      mode={settings.threadStyle}
      onClose={() => setOpenThreadId(null)}
      inlineCompose={inline && inline.threadId === id ? inline : null}
      onCloseInline={() => setInline(null)}
    />
  );
  const threadView = openThreadId ? renderThread(openThreadId) : null;
  const renderSide = (d: NonNullable<SideDesc>) => d.kind === 'thread'
    ? renderThread(d.threadId)
    : <EditViewPanel key={d.panel.viewId} viewId={d.panel.viewId} step={d.panel.step} setStep={(step) => setPanel({ ...d.panel, step })} onClose={() => setPanel(null)} />;
  const leaving = leavingSide && leavingSide.kind !== currentSide?.kind ? leavingSide : null;

  return (
    <MailContext.Provider value={ctx}>
      <div className={`zl-app-root${mobileSidebar ? ' show-sidebar' : ''}`} onClick={(e) => { if (mobileSidebar && (e.target as HTMLElement).closest('.zl-nav-item')) setMobileSidebar(false); }}>
        <Sidebar onSearch={() => { setSearchOpen(true); setMobileSidebar(false); }} />
        <div className={`zl-workspace${side ? ` has-side has-side--${side}` : ''}`}>
          {full ? <div className="zl-full" style={{ display: 'grid', minHeight: 0 }}>{threadView}</div> : nav.kind === 'summary' && !searchOpen ? (
            <SummaryGrid state={list} onLoadMore={loadMore} onRetry={() => loadList(query)} onOpenSidebar={() => setMobileSidebar(true)} />
          ) : (
            <ListPane
              state={list}
              selected={selected}
              setSelected={setSelected}
              onLoadMore={loadMore}
              onRetry={() => loadList(query)}
              searchOpen={searchOpen}
              setSearchOpen={setSearchOpen}
              onOpenSidebar={() => setMobileSidebar(true)}
            />
          )}
          {currentSide || leaving ? (
            // One tab card; its content layers cross-fade when switching between a thread and Edit view.
            <aside className={`zl-sidepane${currentSide ? '' : ' is-closing'}`}>
              {/* One keyed array so a layer keeps its state (no refetch) when it becomes the leaving one. */}
              {[
                leaving ? <div key={leaving.kind} className="zl-sidepane-layer is-leaving" aria-hidden inert>{renderSide(leaving)}</div> : null,
                currentSide ? <div key={currentSide.kind} className="zl-sidepane-layer">{renderSide(currentSide)}</div> : null,
              ]}
            </aside>
          ) : null}
        </div>
      </div>
      {center ? <div className="zl-center-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenThreadId(null); }}>{threadView}</div> : null}
      {floating ? <div className="zl-composer-dock"><Composer key={floating.key} init={floating} onClose={() => setFloating(null)} /></div> : null}
      {settingsOpen ? <SettingsModal section={settingsOpen} setSection={setSettingsOpen} onClose={() => setSettingsOpen(null)} /> : null}
      {paletteOpen ? <CommandPalette onClose={() => setPaletteOpen(false)} openSearch={() => setSearchOpen(true)} /> : null}
      {autoLabelSeed ? <AutoLabelDialog seed={autoLabelSeed} onClose={() => setAutoLabelSeed(null)} /> : null}
    </MailContext.Provider>
  );
}
