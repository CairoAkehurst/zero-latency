'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/client/api';
import { parseTypedAddress } from '@/lib/shared/compose';
import type { Address } from '@/lib/shared/types';
import { Icon } from './icons';

let contactsCache: Promise<Address[]> | null = null;
function loadContacts(): Promise<Address[]> {
  if (!contactsCache) contactsCache = api.contacts().then((r) => r.contacts).catch(() => { contactsCache = null; return []; });
  return contactsCache;
}

export function RecipientField({ label, value, onChange, extra = [], autoFocus, trailing }: {
  label: string; value: Address[]; onChange: (v: Address[]) => void; extra?: Address[]; autoFocus?: boolean; trailing?: React.ReactNode;
}) {
  const [text, setText] = useState('');
  const [contacts, setContacts] = useState<Address[]>([]);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { void loadContacts().then(setContacts); }, []);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const pool = new Map<string, Address>();
    [...extra, ...contacts].forEach((a) => { if (!pool.has(a.email.toLowerCase())) pool.set(a.email.toLowerCase(), a); });
    const taken = new Set(value.map((v) => v.email.toLowerCase()));
    return [...pool.values()].filter((a) => !taken.has(a.email.toLowerCase()) && (a.email.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))).slice(0, 6);
  }, [text, contacts, extra, value]);

  const addRaw = (raw: string): boolean => {
    const parts = raw.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
    const parsed = parts.map(parseTypedAddress);
    if (!parts.length || parsed.some((p) => !p)) return false;
    const taken = new Set(value.map((v) => v.email.toLowerCase()));
    onChange([...value, ...(parsed as Address[]).filter((a) => !taken.has(a.email.toLowerCase()))]);
    setText('');
    return true;
  };
  const pick = (a: Address) => { onChange([...value, a]); setText(''); setActive(0); input.current?.focus(); };

  return (
    <div className="zl-composer-line" onClick={() => input.current?.focus()}>
      <label htmlFor={`rcpt-${label}`}>{label}</label>
      {value.map((a) => (
        <span key={a.email} className="zl-recipient" title={a.email}>
          {a.name || a.email}
          <button type="button" aria-label={`Remove ${a.email}`} onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x.email !== a.email)); }}><Icon name="x" size={12} /></button>
        </span>
      ))}
      <input
        id={`rcpt-${label}`}
        ref={input}
        value={text}
        autoFocus={autoFocus}
        autoComplete="off"
        aria-label={`${label} recipients`}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={`rcpt-${label}-list`}
        aria-expanded={focused && suggestions.length > 0}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (text.trim()) addRaw(text); }}
        onChange={(e) => { setText(e.target.value); setActive(0); }}
        onPaste={(e) => { const t = e.clipboardData.getData('text'); if (/[,;\n]/.test(t) && addRaw(t)) e.preventDefault(); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setActive((i) => (i + 1) % suggestions.length); }
          else if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setActive((i) => (i - 1 + suggestions.length) % suggestions.length); }
          else if ((e.key === 'Enter' || e.key === 'Tab') && suggestions[active]) { e.preventDefault(); pick(suggestions[active]!); }
          else if ((e.key === 'Enter' || e.key === ',' || e.key === ';' || (e.key === 'Tab' && text.trim())) && text.trim()) { if (addRaw(text)) e.preventDefault(); }
          else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
      />
      {trailing}
      {focused && suggestions.length ? (
        <div id={`rcpt-${label}-list`} className="zl-menu zl-suggest" role="listbox" onMouseDown={(e) => e.preventDefault()}>
          {suggestions.map((a, i) => (
            <button key={a.email} type="button" role="option" aria-selected={i === active} className={`zl-menu-item zl-menu-item--2line ${i === active ? 'is-hover' : ''}`} onClick={() => pick(a)}>
              <span className="zl-monogram">{(a.name || a.email)[0]?.toUpperCase()}</span>
              <span className="zl-menu-item-text">{a.name || a.email}{a.name ? <small>{a.email}</small> : null}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
