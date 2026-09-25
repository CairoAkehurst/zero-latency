'use client';
import { useSyncExternalStore } from 'react';
import { uid, type Ink, type View } from '../shared/views';
import { createClient } from '@/utils/supabase/client';

// ---------- Types ----------

export type Theme = 'system' | 'light' | 'dark';
export type ThreadStyle = 'side' | 'center' | 'full';
export type AutoAdvance = 'next' | 'previous' | 'list';
export type FontSize = 'default' | 'large';

export interface Settings {
  theme: Theme;
  threadStyle: ThreadStyle;
  autoAdvance: AutoAdvance;
  fontSize: FontSize;
  desktopNotifications: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system', threadStyle: 'side', autoAdvance: 'next', fontSize: 'large', desktopNotifications: false,
};

export type PropertyType = 'text' | 'number' | 'select' | 'multiSelect' | 'status' | 'date' | 'checkbox' | 'url';

export interface PropertyOption {
  id: string;
  name: string;
  ink: Ink;
  /** Status only: which of the four fixed states this option represents. */
  state?: 'todo' | 'progress' | 'done' | 'canceled';
}

export interface PropertyDef {
  id: string;
  name: string;
  type: PropertyType;
  options: PropertyOption[];
  defaultOptionId?: string;
}

export type PropertyValue = string | number | boolean | string[] | null;

export interface AutoLabel {
  id: string;
  name: string;
  description: string;
  labelId: string;
  enabled: boolean;
  /** Keep matching mail in the inbox (true) or move it into its own view (false: archive after labelling). */
  keepInInbox: boolean;
  createdAt: number;
}

export interface Snippet {
  id: string;
  name: string;
  /** Plain text with blank-line paragraphs. `{{availability}}` expands to open times from the calendar. */
  body: string;
}

export interface Reminder {
  at: number;
  subject: string;
}

export interface AccountData {
  onboarded: boolean;
  views: View[];
  /** Custom properties per view id. */
  properties: Record<string, PropertyDef[]>;
  /** Property values per thread id per property id. */
  values: Record<string, Record<string, PropertyValue>>;
  autoLabels: AutoLabel[];
  /** Thread id → historyId already classified by auto label. */
  autoLabelSeen: Record<string, string>;
  snippets: Snippet[];
  reminders: Record<string, Reminder>;
  labelInks: Record<string, Ink>;
  signatureOnReplies: boolean;
  signatureEnabled: boolean;
  /** Per-view notification high-water mark (newest lastDate notified). */
  notifiedUntil: Record<string, number>;
}

export const emptyAccountData = (): AccountData => ({
  onboarded: false, views: [], properties: {}, values: {}, autoLabels: [], autoLabelSeen: {}, snippets: [], reminders: {}, labelInks: {},
  signatureOnReplies: true, signatureEnabled: false, notifiedUntil: {},
});

// ---------- Persistence ----------

const SETTINGS_KEY = 'zl:v1:settings';
const acctKey = (id: string) => `zl:v1:acct:${id}`;

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<T>) } : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked: keep in memory */ }
}

// ---------- Store ----------

type Listener = () => void;

function createStore<T>(initial: T, persistKey: () => string | null, onChange?: () => void) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set(next: T | ((s: T) => T)) {
      state = typeof next === 'function' ? (next as (s: T) => T)(state) : next;
      const k = persistKey();
      if (k) save(k, state);
      listeners.forEach((l) => l());
      onChange?.();
    },
    replace(next: T) {
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

// ---------- Supabase sync ----------
// Settings and per-account data (views, properties, snippets, auto labels…) are stored in public.user_prefs so they
// follow the user across browsers. localStorage stays as an instant cache and as the fallback when offline.

let remoteUser: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePush() {
  if (!remoteUser) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = null; void pushRemote(); }, 800);
}

async function pushRemote() {
  if (!remoteUser) return;
  const { error } = await createClient().from('user_prefs').upsert({
    user_id: remoteUser,
    settings: settingsStore.get(),
    account_data: accountStore.get(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) console.warn('[zl] could not save preferences to Supabase:', error.message);
}

if (typeof window !== 'undefined') {
  // Flush a pending save when the tab is hidden or closed.
  window.addEventListener('pagehide', () => { if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; void pushRemote(); } });
}

export const settingsStore = createStore<Settings>(DEFAULT_SETTINGS, () => SETTINGS_KEY, schedulePush);
let activeAccount: string | null = null;
export const accountStore = createStore<AccountData>(emptyAccountData(), () => (activeAccount ? acctKey(activeAccount) : null), schedulePush);

/**
 * Loads settings and account data: localStorage first, then Supabase (which wins when it has a saved copy).
 * `sync` is false in demo mode, where nothing leaves the browser.
 */
export async function initStores(accountId: string, sync = true) {
  settingsStore.replace(load(SETTINGS_KEY, DEFAULT_SETTINGS));
  activeAccount = accountId;
  accountStore.replace(load(acctKey(accountId), emptyAccountData()));
  remoteUser = null;
  if (!sync) return;
  try {
    const { data, error } = await createClient()
      .from('user_prefs')
      .select('settings, account_data')
      .eq('user_id', accountId)
      .maybeSingle<{ settings: Partial<Settings> | null; account_data: Partial<AccountData> | null }>();
    if (error) throw error;
    if (data) {
      const settings = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) };
      const account = { ...emptyAccountData(), ...(data.account_data ?? {}) };
      save(SETTINGS_KEY, settings);
      save(acctKey(accountId), account);
      settingsStore.replace(settings);
      accountStore.replace(account);
      remoteUser = accountId;
    } else {
      // First run with Supabase: upload whatever this browser already has.
      remoteUser = accountId;
      await pushRemote();
    }
  } catch (e) {
    console.warn('[zl] preferences are browser-only for now (Supabase user_prefs unavailable):', (e as Error).message);
  }
}

export function useSettings(): Settings {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.get, () => DEFAULT_SETTINGS);
}

const EMPTY = emptyAccountData();
export function useAccountData(): AccountData {
  return useSyncExternalStore(accountStore.subscribe, accountStore.get, () => EMPTY);
}

export function updateAccount(fn: (d: AccountData) => AccountData) {
  accountStore.set(fn);
}

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((s) => ({ ...s, ...patch }));
}

export function updateView(id: string, fn: (v: View) => View) {
  updateAccount((d) => ({ ...d, views: d.views.map((v) => (v.id === id ? fn(v) : v)) }));
}

/** Copies a view (with fresh ids and its properties) and returns the copy's id. */
export function duplicateView(view: View): string {
  const copy: View = { ...view, id: uid('v_'), name: `${view.name} copy`, filters: view.filters.map((f) => ({ ...f, id: uid('f_') })) };
  updateAccount((d) => {
    const at = d.views.findIndex((v) => v.id === view.id);
    const views = [...d.views];
    views.splice(at < 0 ? views.length : at + 1, 0, copy);
    return { ...d, views, properties: { ...d.properties, [copy.id]: d.properties[view.id] ?? [] } };
  });
  return copy.id;
}

/** Removes a view and its properties. Mail is not touched. */
export function deleteView(id: string) {
  updateAccount((d) => {
    const properties = { ...d.properties };
    delete properties[id];
    return { ...d, views: d.views.filter((v) => v.id !== id), properties };
  });
}
