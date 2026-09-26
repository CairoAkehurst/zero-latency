import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'system' | 'light' | 'dark';
export type ThreadStyle = 'side' | 'center' | 'full';
export type AutoAdvance = 'next' | 'previous' | 'list';
export type FontSize = 'default' | 'large';
export type Snippet = { id: string; name: string; body: string };

interface SettingsState {
  theme: Theme;
  threadStyle: ThreadStyle;
  autoAdvance: AutoAdvance;
  fontSize: FontSize;
  desktopNotifications: boolean;
  setTheme: (t: Theme) => void;
  setThreadStyle: (t: ThreadStyle) => void;
  setAutoAdvance: (a: AutoAdvance) => void;
  setFontSize: (s: FontSize) => void;
  setDesktopNotifications: (d: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      threadStyle: 'side',
      autoAdvance: 'next',
      fontSize: 'default',
      desktopNotifications: false,
      setTheme: (theme) => set({ theme }),
      setThreadStyle: (threadStyle) => set({ threadStyle }),
      setAutoAdvance: (autoAdvance) => set({ autoAdvance }),
      setFontSize: (fontSize) => set({ fontSize }),
      setDesktopNotifications: (desktopNotifications) => set({ desktopNotifications }),
    }),
    { name: 'zl-settings' }
  )
);

interface AccountDataState {
  signatureOnReplies: boolean;
  signatureEnabled: boolean;
  signatureText: string;
  snippets: Snippet[];
  filters: { id: string; from: string; label: string }[];
  views: { id: string; name: string; notify: boolean }[];
  updateAccount: (fn: (d: AccountDataState) => Partial<AccountDataState>) => void;
}

export const useAccountDataStore = create<AccountDataState>()(
  persist(
    (set) => ({
      signatureOnReplies: false,
      signatureEnabled: true,
      signatureText: "-- \nSent from AgentMail",
      snippets: [],
      filters: [],
      views: [{ id: 'inbox', name: 'Inbox', notify: true }],
      updateAccount: (fn) => set((state) => fn(state)),
    }),
    { name: 'zl-account-data' }
  )
);
