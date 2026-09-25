'use client';
import { useSyncExternalStore } from 'react';

function current(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', cb);
  return () => { mo.disconnect(); mq.removeEventListener('change', cb); };
}

/** The theme actually shown (resolves "system"), updating live when it changes. */
export function useResolvedTheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, current, () => 'light');
}

function tokenRgb(name: string): number[] | null {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number);
  probe.remove();
  return rgb && rgb.length === 3 ? rgb.map(Math.round) : null;
}

/** A colour token from the app's theme as rgb(). */
export function tokenColor(name: string, fallback: string): string {
  const rgb = tokenRgb(name);
  return rgb ? `rgb(${rgb.join(',')})` : fallback;
}

/** The inverse of a colour token, so that `filter: invert(1)` turns it back into the original. */
export function invertedToken(name: string, fallback: string): string {
  const rgb = tokenRgb(name);
  return rgb ? `rgb(${rgb.map((c) => 255 - c).join(',')})` : fallback;
}
