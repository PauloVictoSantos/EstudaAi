'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Icon } from './Icon';
import { spring } from './motion';

const LINKS = [
  { href: '/prova', label: 'Prova' },
  { href: '/questoes', label: 'Questões' },
  { href: '/redacao', label: 'Redação' },
  { href: '/painel', label: 'Painel' },
  { href: '/progresso', label: 'Progresso' },
  { href: '/analise', label: 'Análise' },
];

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'); }, []);
  const toggle = () => {
    const t = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('estudaai.theme', t); } catch { /* modo privado */ }
    setTheme(t);
  };
  return { theme, toggle };
}

export function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <button className="btn btn-secondary btn-icon" onClick={toggle} aria-label="Alternar modo claro/escuro">
      <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={spring} style={{ display: 'grid' }}>
        <Icon name={theme === 'light' ? 'moon' : 'sun'} />
      </motion.span>
    </button>
  );
}

export function Brand() {
  return (
    <Link href="/prova" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'inherit', textDecoration: 'none' }}>
      <motion.span whileHover={{ rotate: 12, scale: 1.08 }} transition={spring} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 10, background: 'var(--color-accent)', color: '#fff' }}>
        <Icon name="sparkles" />
      </motion.span>
      EstudaAI
    </Link>
  );
}

export function AppShell({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); };
  return (
    <>
      <header data-noprint="" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-4)', flexWrap: 'wrap' }}>
        <Brand />
        <nav aria-label="Principal" style={{ display: 'flex', gap: 2, marginLeft: 'var(--space-4)', flexWrap: 'wrap', flex: 1 }}>
          {LINKS.map(l => {
            const on = path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={on ? 'page' : undefined} style={{ position: 'relative', fontSize: 14, padding: '8px 12px', color: on ? 'var(--color-accent)' : 'inherit', textDecoration: 'none', fontWeight: on ? 600 : 400 }}>
                {l.label}
                {on && <motion.span layoutId="nav-underline" transition={spring} style={{ position: 'absolute', left: 12, right: 12, bottom: 2, height: 2, borderRadius: 2, background: 'var(--color-accent)' }} />}
              </Link>
            );
          })}
        </nav>
        {extra}
        <ThemeButton />
        <button className="btn btn-ghost" onClick={logout} aria-label="Sair"><Icon name="log-out" size={16} />Sair</button>
      </header>
      {children}
    </>
  );
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...init?.headers }, body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body });
  if (res.status === 401) { location.href = '/login'; throw new Error('UNAUTHORIZED'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || data.error || `HTTP ${res.status}`), { code: data.error, status: res.status });
  return data as T;
}
