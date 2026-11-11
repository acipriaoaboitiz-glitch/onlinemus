import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useToasts } from '../lib/toast.ts';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ok';

export function Button({
  variant = 'secondary', block, className = '', ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }) {
  return <button type="button" {...rest} className={`btn btn--${variant}${block ? ' btn--block' : ''} focus-visible:ring-2 focus-visible:ring-amber-300 ${className}`} />;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-root">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__grab" />
        {title && <h2 className="sheet__title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

/** Botón que hay que mantener pulsado: para el órdago, que no se puede cantar sin querer. */
export function HoldButton({
  children, onConfirm, disabled, holdMs = 650, className = '',
}: { children: ReactNode; onConfirm: () => void; disabled?: boolean; holdMs?: number; className?: string }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  const start = () => {
    if (disabled) return;
    setHolding(true);
    timer.current = setTimeout(() => { timer.current = null; setHolding(false); onConfirm(); }, holdMs);
  };
  return (
    <button
      type="button"
      disabled={disabled}
      className={`btn btn--ordago hold${holding ? ' hold--on' : ''} ${className}`}
      style={{ ['--hold-ms' as string]: `${holdMs}ms` }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onClick={(e) => { if (e.detail === 0 && !disabled) onConfirm(); }} /* pulsación con teclado */
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold__fill" />
      <span className="hold__label">{children}</span>
      <span className="hold__hint">{holding ? 'Sigue pulsando…' : 'Mantén pulsado'}</span>
    </button>
  );
}

export function Avatar({ name, tone = 'neutral', size = 44 }: { name: string; tone?: 'us' | 'them' | 'me' | 'neutral'; size?: number }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span className={`avatar avatar--${tone}`} style={{ width: size, height: size, fontSize: size * 0.44 }} aria-hidden="true">
      {initial}
    </span>
  );
}

export function Toaster() {
  const items = useToasts();
  return (
    <div className="toaster" aria-live="polite">
      {items.map((t) => (<div key={t.id} className={`toast toast--${t.tone}`}>{t.text}</div>))}
    </div>
  );
}
