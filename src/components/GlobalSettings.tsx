"use client";

import { useEffect, useState } from 'react';
import { SettingsModal } from '@/components/SettingsModal';

/** Listens for the `open-settings` event so Settings works on every page with the sidebar. */
export function GlobalSettings() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState('inbox');

  useEffect(() => {
    const handler = (e: any) => {
      setSection(e.detail || 'inbox');
      setOpen(true);
    };
    window.addEventListener('open-settings', handler);
    return () => window.removeEventListener('open-settings', handler);
  }, []);

  if (!open) return null;
  return <SettingsModal section={section} setSection={setSection} onClose={() => setOpen(false)} />;
}
