'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { AppShell, api } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { Bar, Counter, item, Stagger } from '@/components/motion';
import { AREAS, ENEM_AREAS, areaColor, type Area } from '@/lib/areas';
import { toEnem } from '@/lib/tri';

interface Me {
  exam: null | {
    name: string; type: 'ENEM' | 'CONCURSO' | 'OUTRA'; date: string; abilities: Record<string, { theta: number; se: number }>;
    plan: { weeks: number } | null; sources: { id: string; title: string; questionCount: number; keyedCount: number }[];
  };
}
const fmt = (n: number) => n.toFixed(2).replace('.', ',');

export default function ProvaPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [editing, setEditing] = useState(false), [raw, setRaw] = useState<Record<string, string>>({});

  const load = () => api<Me>('/api/me').then(m => { if (!m.exam) router.replace('/onboarding'); else setMe(m); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleEdit = async () => {
    if (editing) {
      const areaScores = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== '').map(([k, v]) => [k, Math.min(1000, Math.max(0, +v))]));
      if (Object.keys(areaScores).length) { await api('/api/exam', { method: 'PATCH', json: { areaScores } }); await load(); }
      setRaw({});
    }
    setEditing(!editing);
  };

  const e = me?.exam;
  if (!e) return <AppShell><main className="page" style={{ maxWidth: 720 }}><p className="text-muted">Carregando…</p></main></AppShell>;

  const days = Math.max(0, Math.ceil((new Date(e.date + 'T00:00').getTime() - Date.now()) / 864e5));
  const weeks = e.plan?.weeks ?? Math.max(1, Math.ceil(days / 7));
  const weeksLeft = Math.max(1, Math.ceil(days / 7)), weekNow = Math.min(weeks, Math.max(1, weeks - weeksLeft + 1));
  const areas: Area[] = e.type === 'ENEM' ? ENEM_AREAS : ['GERAL'];
  const total = e.sources.reduce((n, s) => n + s.keyedCount, 0);

  return (
    <AppShell>
      <main className="page" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <span className="text-muted" style={{ fontSize: 13 }}>Minhas provas</span>
        <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="card" style={{ gap: 'var(--space-6)', padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            <motion.span initial={{ rotate: -20, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}
              style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 14, background: 'var(--color-accent)', color: '#fff', flex: 'none' }}><Icon name="graduation-cap" size={24} /></motion.span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 26 }}>{e.name}</h2>
              <span className="text-muted" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" size={14} />
                {{ ENEM: 'ENEM', CONCURSO: 'Concurso', OUTRA: 'Outra prova' }[e.type]} · {new Date(e.date + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 'var(--space-3)' }}>
            <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="text-muted" style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="hourglass" size={14} />Faltam</span>
              <span style={{ font: '700 44px/1 var(--font-heading)', letterSpacing: '-.03em', color: 'var(--color-accent)' }}><Counter value={days} /><span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}> dias</span></span>
            </div>
            <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <span className="text-muted" style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="route" size={14} />Semana {weekNow} de {weeks}</span>
              <Bar pct={(weekNow / weeks) * 100} />
            </div>
            <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="text-muted" style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="file-text" size={14} />Questões reais</span>
              <span style={{ font: '700 32px/1 var(--font-heading)' }}><Counter value={total} /></span>
              <span className="text-muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.sources.map(s => s.title).join(', ')}>{e.sources.map(s => s.title).join(' · ')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h5 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="activity" size={16} />Proficiência por área</h5>
              <button className="btn btn-ghost" onClick={toggleEdit} style={{ fontSize: 13 }}><Icon name="pencil" size={14} />{editing ? 'Salvar' : 'Informar notas'}</button>
            </div>
            <AnimatePresence>{editing && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-muted" style={{ margin: 0, fontSize: 13 }}>Informe sua última nota em cada área (0 a 1000). Ela vira o ponto de partida do θ.</motion.p>}</AnimatePresence>
            <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {areas.map((a, i) => {
                const ab = e.abilities[a] ?? { theta: 0, se: 1 };
                return (
                  <motion.div variants={item} key={a} style={{ display: 'grid', gridTemplateColumns: '40px minmax(0,1fr) auto', gap: 'var(--space-3)', alignItems: 'center', fontSize: 14 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: `color-mix(in oklch, ${areaColor(a)} 14%, transparent)`, color: areaColor(a), fontWeight: 800, fontSize: 12 }}>{a === 'GERAL' ? 'G' : a}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span>{AREAS[a]}</span><Bar pct={((ab.theta + 4) / 8) * 100} color={areaColor(a)} height={6} delay={i * 0.08} /></div>
                    {editing
                      ? <input className="input" type="number" inputMode="numeric" min={0} max={1000} step={10} aria-label={`Nota em ${AREAS[a]}`} placeholder={String(toEnem(ab.theta))} value={raw[a] ?? ''} onChange={ev => setRaw({ ...raw, [a]: ev.target.value })} style={{ width: 96, minHeight: 44, textAlign: 'right' }} />
                      : <span className="tnum" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}><strong style={{ fontSize: 18 }}><Counter value={toEnem(ab.theta)} /></strong><span className="text-muted" style={{ fontSize: 11 }}>θ {fmt(ab.theta)} ± {fmt(ab.se)}</span></span>}
                  </motion.div>
                );
              })}
            </Stagger>
            <p className="text-muted" style={{ margin: 0, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="info" size={14} />Estimativa de estudo, não é a nota oficial.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" href="/questoes" style={{ minHeight: 48, minWidth: 220, justifyContent: 'space-between', paddingInline: 20 }}>Começar sessão <Icon name="arrow-right" /></Link>
            <Link className="btn btn-secondary" href="/onboarding" style={{ minHeight: 48, paddingInline: 20 }}>Editar prova</Link>
          </div>
        </motion.article>
      </main>
    </AppShell>
  );
}
