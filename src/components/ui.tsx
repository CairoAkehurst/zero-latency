'use client';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';

// ---------- Popover ----------

export type Placement = 'bottom-start' | 'bottom-end' | 'right-start' | 'top-start';

export function Popover({ anchor, onClose, placement = 'bottom-start', children, className = '', label }: {
  anchor: HTMLElement | DOMRect | null;
  onClose: () => void;
  placement?: Placement;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchor) return;
    const place = () => {
      const r = anchor instanceof HTMLElement ? anchor.getBoundingClientRect() : anchor;
      const w = el.offsetWidth, h = el.offsetHeight;
      let top = placement === 'right-start' ? r.top : placement === 'top-start' ? r.top - h - 6 : r.bottom + 6;
      let left = placement === 'bottom-end' ? r.right - w : placement === 'right-start' ? r.right + 6 : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      if (top + h > window.innerHeight - 8) top = Math.max(8, (placement === 'right-start' ? window.innerHeight : r.top) - h - 6);
      top = Math.max(8, top);
      setPos({ top, left });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    window.addEventListener('resize', place);
    return () => { ro.disconnect(); window.removeEventListener('resize', place); };
  }, [anchor, placement]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (anchor instanceof HTMLElement && anchor.contains(t)) return;
      // Clicks inside another open popover (nested menus) do not close this one.
      if ((t as HTMLElement).closest?.('.zl-popover')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [anchor, onClose]);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('input, textarea, [data-autofocus]');
    el?.focus();
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div ref={ref} className={`zl-popover ${className}`} role="dialog" aria-label={label} style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
      {children}
    </div>,
    document.body,
  );
}

/** Keyboard navigation for a list of `.zl-menu-item` buttons inside a container. */
export function useMenuKeys(container: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const items = [...el.querySelectorAll<HTMLElement>('.zl-menu-item:not([disabled])')];
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown' ? items[(i + 1) % items.length] : items[(i - 1 + items.length) % items.length];
      next?.focus();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [container]);
}

// ---------- Tooltip + icon button ----------

export function IconButton({ icon, label, shortcut, onClick, pressed, size, className = '', disabled, placement = 'bottom' }: {
  icon: string; label: string; shortcut?: string; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; pressed?: boolean; size?: 'sm'; className?: string; disabled?: boolean; placement?: 'bottom' | 'top' | 'right';
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [tip, setTip] = useState<DOMRect | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = () => { timer.current = setTimeout(() => ref.current && setTip(ref.current.getBoundingClientRect()), 450); };
  const hide = () => { if (timer.current) clearTimeout(timer.current); setTip(null); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`zl-btn zl-btn--icon ${size === 'sm' ? 'zl-btn--sm' : ''} ${className}`}
        aria-label={label}
        aria-pressed={pressed === undefined ? undefined : pressed}
        disabled={disabled}
        onClick={(e) => { hide(); onClick?.(e); }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) show(); }}
        onBlur={hide}
      >
        <Icon name={icon} />
      </button>
      {tip && typeof document !== 'undefined'
        ? createPortal(
          <span className="zl-tooltip" role="tooltip" style={{
            position: 'fixed', zIndex: 'var(--z-tooltip)' as unknown as number,
            ...(placement === 'right' ? { left: tip.right + 6, top: tip.top } : placement === 'top' ? { left: tip.left, bottom: window.innerHeight - tip.top + 6 } : { left: Math.min(tip.left, window.innerWidth - 180), top: tip.bottom + 6 }),
          }}>
            {label}{shortcut ? <small>{shortcut}</small> : null}
          </span>,
          document.body,
        )
        : null}
    </>
  );
}

// ---------- Toasts ----------

interface Toast { id: number; message: string; action?: { label: string; run: () => void }; busy?: boolean; tone?: 'error' }
interface ToastApi { push: (t: Omit<Toast, 'id'> & { duration?: number }) => number; dismiss: (id: number) => void }
const ToastCtx = createContext<ToastApi>({ push: () => 0, dismiss: () => undefined });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((t: Omit<Toast, 'id'> & { duration?: number }) => {
    const id = ++seq.current;
    // One toast at a time: the newest replaces the previous one.
    setToasts([{ ...t, id }]);
    if (!t.busy) setTimeout(() => dismiss(id), t.duration ?? (t.action ? 6000 : 4000));
    return id;
  }, [dismiss]);
  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div className="zl-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="zl-toast" role={t.tone === 'error' ? 'alert' : 'status'}>
            {t.busy ? <span className="zl-spinner" aria-hidden /> : null}
            <span>{t.message}</span>
            {t.action ? <button onClick={() => { t.action!.run(); dismiss(t.id); }}>{t.action.label}</button> : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Dialog ----------

export function Dialog({ title, children, onClose, actions, wide }: { title: string; children: ReactNode; onClose: () => void; actions?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); prev?.focus?.(); };
  }, [onClose]);
  return createPortal(
    <div className="zl-dialog-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="zl-dialog" role="dialog" aria-modal="true" aria-label={title} style={wide ? { width: 'min(640px, 100%)' } : undefined}>
        <h2>{title}</h2>
        {children}
        {actions ? <div className="zl-dialog-actions">{actions}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="zl-toggle" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />;
}

export function Check({ checked, onChange, label, mixed }: { checked: boolean; onChange: (v: boolean) => void; label?: string; mixed?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!mixed; }, [mixed]);
  return (
    <label className="zl-check" onClick={(e) => e.stopPropagation()}>
      <input ref={ref} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label ?? 'Select'} />
      <span className="zl-check-box"><svg viewBox="0 0 10 10" aria-hidden><path d="M2 5.2 4.1 7.3 8 2.8" /></svg></span>
      {label ? <span className="zl-visually-hidden">{label}</span> : null}
    </label>
  );
}

export function Spinner() {
  return <span className="zl-spinner" aria-hidden />;
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
