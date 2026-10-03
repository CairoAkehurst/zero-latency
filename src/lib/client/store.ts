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
      signatureText: "-- \nSent from Zero Latency",
      snippets: [],
      filters: [],
      views: [{ id: 'inbox', name: 'Inbox', notify: true }],
      updateAccount: (fn) => set((state) => fn(state)),
    }),
    { name: 'zl-account-data' }
  )
);

export type AiToneType = 'professional' | 'casual' | 'concise' | 'custom';

export interface AiToneSettings {
  activeTone: AiToneType;
  professionalPrompt: string;
  casualPrompt: string;
  concisePrompt: string;
  customPrompt: string;
  setActiveTone: (tone: AiToneType) => void;
  updatePrompts: (prompts: Partial<Omit<AiToneSettings, 'activeTone' | 'setActiveTone' | 'updatePrompts'>>) => void;
}

export const useAiToneStore = create<AiToneSettings>()(
  persist(
    (set) => ({
      activeTone: 'professional',
      professionalPrompt: "Write in a professional, courteous, and structured tone. Use proper business etiquette, clear sentences, and clear next steps.",
      casualPrompt: "Write in a warm, approachable, and conversational tone. Keep it friendly and natural like a peer or teammate.",
      concisePrompt: "Be direct, brief, and straight to the point. No fluff or filler, just the essential answer or confirmation in 1-3 sentences.",
      customPrompt: "Match the user's communication style. Be helpful, clear, and proactive in suggesting next steps.",
      setActiveTone: (activeTone) => set({ activeTone }),
      updatePrompts: (prompts) => set((state) => ({ ...state, ...prompts })),
    }),
    { name: 'zl-ai-tone-settings' }
  )
);

