const fs = require('fs');

const code = fs.readFileSync('/Users/cairoakehurst/Documents/GitHub/ZeroLatency-Claude/web/src/components/SettingsModal.tsx', 'utf8');

// We need to replace the imports that don't exist with stubs
let newCode = code.replace(
  `import { api } from '@/lib/client/api';
import { updateAccount, updateSettings, useAccountData, useSettings, type AutoAdvance, type FontSize, type Snippet, type Theme, type ThreadStyle } from '@/lib/client/store';
import { uid } from '@/lib/shared/views';
import type { GmailFilter } from '@/lib/shared/types';`,
  `// Stubs
import { uid } from './stub-utils';
export type Theme = 'system' | 'light' | 'dark';
export type ThreadStyle = 'side' | 'center' | 'full';
export type AutoAdvance = 'next' | 'previous' | 'list';
export type FontSize = 'default' | 'large';
export type Snippet = { id: string; name: string; body: string };
export type GmailFilter = any;
`
).replace(
  `import { REMINDER_LABEL, useMail } from './mail-context';`,
  `// useMail stub
const REMINDER_LABEL = 'reminders';
const useMail = () => ({ session: { accounts: [{ id: '1', name: 'User', email: 'user@example.com', canReadFreeBusy: true }], demo: false }, account: { id: '1', email: 'user@example.com', name: 'User' }, me: 'user@example.com' });
`
).replace(
  `import { SHORTCUTS } from './shortcuts';`,
  `// Shortcuts stub
const SHORTCUTS = [
  { label: 'Compose', keys: ['C'] },
  { label: 'Search', keys: ['/'] },
];
`
);

// Inject stubs at the top
const stubs = `
import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

const api = {
  sendAs: async () => ({ sendAs: [{ email: 'user@example.com', signature: '<i>ZeroLatency</i>' }] }),
  logout: async () => ({ remaining: 0 }),
};

// Global state stubs
let globalSettings = { theme: 'system', threadStyle: 'side', autoAdvance: 'next', fontSize: 'default', desktopNotifications: false };
const updateSettings = (s) => { Object.assign(globalSettings, s); };
const useSettings = () => { const [s, setS] = useState(globalSettings); return s; };

let globalAccountData = { signatureOnReplies: false, signatureEnabled: true, snippets: [], views: [] };
const updateAccount = (fn) => { globalAccountData = fn(globalAccountData); };
const useAccountData = () => { const [d, setD] = useState(globalAccountData); return d; };

`;

newCode = newCode.replace(`'use client';\nimport { useEffect, useRef, useState } from 'react';`, `'use client';\nimport { useEffect, useRef, useState, useCallback } from 'react';\n` + stubs);

fs.writeFileSync('src/components/SettingsModal.tsx', newCode);
fs.writeFileSync('src/components/stub-utils.ts', 'export const uid = (prefix) => prefix + Math.random().toString(36).slice(2);');

