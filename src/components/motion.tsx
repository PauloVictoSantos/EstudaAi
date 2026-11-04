'use client';
// Peças de motion design reutilizadas em todas as telas.
import { animate, AnimatePresence, motion, useMotionValue, useTransform, type Transition } from 'motion/react';
import { useEffect, useId, useRef } from 'react';

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32 };
export const ease = [0.2, 0.8, 0.2, 1] as const;

export const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.35, ease } };

/** Lista com entrada em cascata. */
export function Stagger({ children, className, style, delay = 0.05, as = 'div' }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; delay?: number; as?: 'div' | 'ul' | 'section' | 'main' }) {
  const C = motion[as];
  return (
    <C className={className} style={style} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: delay } } }}>
      {children}
    </C>
  );
}
export const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } } };

/** Número que conta até o valor (XP, notas, proficiência). */
export function Counter({ value, format = (n: number) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, format);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; mv.set(0); }
    const c = animate(mv, value, { duration: 0.8, ease });
    return c.stop;
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

/** Barra de progresso com crescimento animado. */
export function Bar({ pct, color = 'var(--color-accent)', height = 8, delay = 0 }: { pct: number; color?: string; height?: number; delay?: number }) {
  return (
    <div className="bar" style={{ height, borderRadius: height }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }} transition={{ duration: 0.8, ease, delay }} style={{ background: color, borderRadius: height }} />
    </div>
  );
}

/** Abas com "pílula" que desliza entre as opções (layoutId). */
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { v: T; label: string; icon?: React.ReactNode; badge?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  const id = useId();
  return (
    <div role="tablist" aria-label={label} style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 99, background: 'var(--color-surface)', maxWidth: '100%', overflow: 'auto' }}>
      {tabs.map(t => {
        const on = t.v === value;
        return (
          <button key={t.v} role="tab" aria-selected={on} onClick={() => onChange(t.v)} className="chip" style={{ position: 'relative', border: 0, padding: '8px 16px', fontSize: 14, whiteSpace: 'nowrap' }}>
            {on && <motion.span layoutId={`tab-${id}`} transition={spring} style={{ position: 'absolute', inset: 0, borderRadius: 99, background: 'var(--color-bg)', boxShadow: 'var(--shadow-sm)', zIndex: 0 }} />}
            <span style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'center' }}>
              {t.icon}{t.label}
              <AnimatePresence>
                {!!t.badge && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring} style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: 'var(--color-accent)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{t.badge}</motion.span>
                )}
              </AnimatePresence>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Segmentado (rádio) com pílula animada. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { v: T; label: string }[]; value: T | null; onChange: (v: T) => void; label: string }) {
  const id = useId();
  return (
    <div className="seg" role="radiogroup" aria-label={label} style={{ alignSelf: 'flex-start' }}>
      {options.map(o => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className="seg-opt" onClick={() => onChange(o.v)}>
          {value === o.v && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={spring} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div key={message} role="status" aria-live="polite" initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 12, x: '-50%' }} transition={spring}
          style={{ position: 'fixed', left: '50%', bottom: 24, padding: '12px 18px', borderRadius: 99, background: 'var(--color-text)', color: 'var(--color-bg)', fontSize: 13, boxShadow: 'var(--shadow-lg)', zIndex: 40, maxWidth: 'calc(100% - 32px)' }}>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Dialog({ open, onClose, labelledBy, children, width = 560 }: { open: boolean; onClose?: () => void; labelledBy: string; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    if (!open || !onClose) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="dialog-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="dialog" onClick={e => e.stopPropagation()} style={{ width: `min(${width}px, 100%)` }}
            initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={spring}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { motion, AnimatePresence };
