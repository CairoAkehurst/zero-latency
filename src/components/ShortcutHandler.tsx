"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ShortcutHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        e.metaKey || e.ctrlKey || e.altKey
      ) {
        return;
      }

      switch (e.key) {
        case 'c':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('open-compose'));
          break;
        case 'r':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('focus-reply'));
          break;
        case 'e':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('shortcut-archive'));
          break;
        case '#':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('shortcut-trash'));
          break;
        case '/':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('focus-search'));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return null;
}
