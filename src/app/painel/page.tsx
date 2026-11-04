'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { AppShell, api } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { Bar, Dialog, ease, item, Segmented, spring, Stagger, Tabs, Toast } from '@/components/motion';
import { areaColor, type Area } from '@/lib/areas';
import { isDue, review, type Card, type Grade } from '@/lib/fsrs';
import type { Explanation } from '@/lib/db';
import { OptionBody, OriginalToggle, QuestionBody, type QView } from '@/components/Question';

interface Stats {
  total: number; lines: { code: Area; label: string; values: number[] }[]; subjects: { label: string; pct: number; n: number }[];
  times: { code: Area; label: string; sec: number }[]; heat: { day: string; n: number }[]; comps: Record<string, number>[];
  report: null | { at: string; mode: 'SMART' | 'SINGLE' | 'MIXED'; prev: number[]; attempts: { subject: string; correct: boolean; chosen: string; timeMs: number; answer: string | null; statement: string; number?: number; explanation: Explanation | null }[] };
}
interface CardRow { id: string; chosen: string; card: Card; q: QView & { id: string; number: number; year: number | null; subject: string; answer: string | null; why: string | null } }
type Tab = 'dash' | 'report' | 'notebook';
const COMP_HUE = [25, 60, 150, 250, 310], hue = (h: number) => `oklch(0.6 0.16 ${h})`;
const DAY = 864e5;

export default function PainelPage() {
  const [tab, setTab] = useState<Tab>('dash');
  const [stats, setStats] = useState<Stats | null>(null), [cards, setCards] = useState<CardRow[]>([]);
  const [hidden, setHidden] = useState<string[]>([]), [hover, setHover] = useState<number | null>(null);
  const [filter, setFilter] = useState<'due' | 'all'>('due'), [reviewing, setReviewing] = useState<string | null>(null), [revealed, setRevealed] = useState(false);
  const [toast, setToast] = useState(''), [original, setOriginal] = useState(false);

  useEffect(() => {
    api<Stats>('/api/stats').then(setStats).catch(() => {});
    api<CardRow[]>('/api/cards').then(setCards).catch(() => {});
  }, []);

  const now = Date.now();
  const due = cards.filter(c => isDue(c.card, now));
  const rv = cards.find(c => c.id === reviewing) ?? null;

  const rate = async (g: Grade) => {
    if (!rv) return;
    const r = await api<{ card: Card & { days: number } }>('/api/cards', { method: 'POST', json: { id: rv.id, grade: g } });
    const nextCards = cards.map(c => (c.id === rv.id ? { ...c, card: r.card } : c));
    setCards(nextCards);
    const nx = nextCards.find(c => c.id !== rv.id && isDue(c.card, now));
    setReviewing(nx?.id ?? null); setRevealed(false);
    setToast(`Próxima revisão em ${r.card.days} ${r.card.days === 1 ? 'dia' : 'dias'}${nx ? '' : ' · revisões do dia concluídas'}`); setTimeout(() => setToast(''), 2600);
  };

  return (
    <AppShell>
      <div data-noprint="" style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 var(--space-4) var(--space-4)' }}>
        <Tabs label="Seções" value={tab} onChange={setTab} tabs={[
          { v: 'dash', label: 'Painel', icon: <Icon name="chart-line" size={16} /> },
          { v: 'report', label: 'Relatório', icon: <Icon name="file-text" size={16} /> },
          { v: 'notebook', label: 'Caderno de erros', icon: <Icon name="notebook-pen" size={16} />, badge: due.length },
        ]} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease }} style={{ flex: 1, display: 'flex' }}>
          {!stats ? <main className="page" style={{ maxWidth: 1100 }}><p className="text-muted">Carregando…</p></main>
            : tab === 'dash' ? <Dash s={stats} hidden={hidden} setHidden={setHidden} hover={hover} setHover={setHover} />
              : tab === 'report' ? <Report s={stats} />
                : (
                  <main className="page" style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                      <div><h2 style={{ margin: 0 }}>Caderno de erros</h2><span className="text-muted" style={{ fontSize: 14 }}>{due.length} vencidas · {cards.length} erros guardados</span></div>
                      <button className="btn btn-primary" onClick={() => { setReviewing(due[0]?.id ?? null); setRevealed(false); }} disabled={!due.length} style={{ minHeight: 48, paddingInline: 20 }}><Icon name="play" size={16} />Revisar vencidas</button>
                    </div>
                    <Segmented label="Filtro" value={filter} onChange={setFilter} options={[{ v: 'due', label: 'Vencidas' }, { v: 'all', label: 'Todas' }]} />
                    {(filter === 'due' ? due : cards).length === 0 && <p style={{ margin: 0, padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', background: 'var(--ok-100)', color: 'var(--ok)' }}>{cards.length ? 'Tudo em dia. Nenhuma revisão vencida.' : 'Nenhum erro guardado ainda. Questões que você errar aparecem aqui.'}</p>}
                    <Stagger key={filter} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} delay={0.04}>
                      {(filter === 'due' ? due : cards).map(c => {
                        const late = c.card.dueAt <= now, d = Math.round((c.card.dueAt - now) / DAY);
                        return (
                          <motion.button variants={item} whileHover={{ x: 4 }} key={c.id} onClick={() => { setReviewing(c.id); setRevealed(false); }} className="card"
                            style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px 16px', alignItems: 'center', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                              <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><span className="tag tag-neutral">{c.q.subject}</span><span className="text-muted" style={{ fontSize: 12 }}>Questão {c.q.number} · estabilidade {c.card.stability.toFixed(1).replace('.', ',')} d · dificuldade {c.card.difficulty.toFixed(1).replace('.', ',')}</span></span>
                              <span style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.q.statement}</span>
                            </span>
                            <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', background: late ? 'var(--color-accent-100)' : 'var(--color-bg)', color: late ? 'var(--color-accent-800)' : 'inherit' }}>{d < 0 ? `venceu há ${-d} d` : d === 0 ? 'vence hoje' : `em ${d} d`}</span>
                          </motion.button>
                        );
                      })}
                    </Stagger>
                  </main>
                )}
        </motion.div>
      </AnimatePresence>

      <Dialog open={!!rv} onClose={() => setReviewing(null)} labelledBy="rv-title" width={600}>
        {rv && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span id="rv-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="tag tag-accent">{rv.q.subject}</span><span className="text-muted" style={{ fontSize: 12 }}>{rv.q.year ? `ENEM ${rv.q.year} · ` : ''}{rv.card.reps}ª revisão · você marcou {rv.chosen}</span><OriginalToggle q={rv.q} on={original} onChange={setOriginal} /></span>
            <button className="btn btn-secondary btn-icon" onClick={() => setReviewing(null)} aria-label="Fechar"><Icon name="x" /></button>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={rv.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ maxHeight: 360, overflow: 'auto' }}><QuestionBody q={rv.q} original={original} size={16} /></div>
              {rv.q.options.map(o => {
                const right = revealed && o.k === rv.q.answer, wrong = revealed && o.k === rv.chosen && !right;
                return (
                  <div key={o.k} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${right ? 'var(--ok)' : wrong ? 'var(--color-accent)' : 'var(--line)'}`, background: right ? 'var(--ok-100)' : 'transparent', transition: 'all .3s' }}>
                    <span style={{ display: 'grid', placeItems: 'center', flex: 'none', width: 28, height: 28, borderRadius: '50%', fontWeight: 800, fontSize: 12, background: right ? 'var(--ok)' : wrong ? 'var(--color-accent)' : 'var(--color-bg)', color: right || wrong ? '#fff' : 'inherit', transition: 'all .3s' }}>{o.k}</span><OptionBody o={o} size={14} />
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
          {!revealed
            ? <button className="btn btn-secondary" onClick={() => setRevealed(true)} style={{ minHeight: 48, justifyContent: 'space-between', paddingInline: 20 }}>Pense na resposta e revele<Icon name="eye" size={16} /></button>
            : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ margin: 0, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--ok-100)', fontSize: 14, lineHeight: 1.5 }}><strong style={{ color: 'var(--ok)' }}>Por que a correta é a correta.</strong> {rv.q.why ?? `A alternativa ${rv.q.answer}: “${rv.q.options.find(o => o.k === rv.q.answer)?.t ?? ''}”.`}</p>
                <span style={{ fontSize: 13 }}>Como foi lembrar desta vez?</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 6 }}>
                  {([[1, 'Errei', 'var(--color-accent)'], [2, 'Difícil', 'var(--warn)'], [3, 'Bom', 'var(--ok)'], [4, 'Fácil', 'var(--color-text)']] as const).map(([g, label, color]) => {
                    const nx = review(rv.card, g, now);
                    return (
                      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} key={g} onClick={() => rate(g)} style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 56, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${color}` }}>
                        <strong style={{ fontSize: 14, color }}>{label}</strong><span className="text-muted" style={{ fontSize: 11 }}>{nx.days} {nx.days === 1 ? 'dia' : 'dias'}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
        </>}
      </Dialog>
      <Toast message={toast} />
    </AppShell>
  );
}

function Empty() {
  return <p className="card" style={{ flex: '1 1 100%' }}>Ainda não há respostas suficientes. <Link href="/questoes">Faça uma sessão de questões</Link> para ver seus gráficos.</p>;
}

function Dash({ s, hidden, setHidden, hover, setHover }: { s: Stats; hidden: string[]; setHidden: (h: string[]) => void; hover: number | null; setHover: (h: number | null) => void }) {
  const all = s.lines.flatMap(l => l.values);
  const lo = Math.min(300, ...all) - 20, hi = Math.max(700, ...all) + 20;
  const Y = (v: number) => 200 - ((v - lo) / (hi - lo)) * 190, X = (i: number) => 50 + i * (530 / 7);
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((lo + ((hi - lo) * i) / 4) / 10) * 10);
  const visible = s.lines.filter(l => !hidden.includes(l.code));
  const maxSec = Math.max(60, ...s.times.map(t => t.sec));
  const comps = s.comps;

  return (
    <Stagger as="main" className="page grid-flow" style={{ maxWidth: 1100 }}>
      {!s.total && <Empty />}
      <motion.section variants={item} className="card" style={{ flex: '2 1 520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h5>Proficiência por área</h5>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {s.lines.map(l => { const on = !hidden.includes(l.code); return (
              <button key={l.code} aria-pressed={on} onClick={() => setHidden(on ? [...hidden, l.code] : hidden.filter(x => x !== l.code))} className="chip" style={{ minHeight: 32, padding: '4px 10px', fontSize: 12, opacity: on ? 1 : 0.4, background: 'transparent', color: 'inherit', borderColor: 'var(--line)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: areaColor(l.code) }} />{l.label}</button>); })}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 600 225" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }} role="img" aria-label="Proficiência por área nas últimas 8 semanas">
            {ticks.map(v => <g key={v}><line x1={40} x2={590} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeDasharray="3 4" /><text x={0} y={Y(v) + 4} fontSize={11} fill="currentColor" opacity={0.55}>{v}</text></g>)}
            {s.lines.map(l => (
              <motion.polyline key={l.code} points={l.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke={areaColor(l.code)} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1, opacity: hidden.includes(l.code) ? 0 : 1 }} transition={{ pathLength: { duration: 1.4, ease }, opacity: { duration: 0.2 } }} />
            ))}
            {hover != null && <line x1={X(hover)} x2={X(hover)} y1={10} y2={200} stroke="currentColor" opacity={0.3} />}
            {hover != null && visible.map(l => <motion.circle key={l.code} initial={{ r: 0 }} animate={{ r: 5 }} cx={X(hover)} cy={Y(l.values[hover])} fill={areaColor(l.code)} stroke="var(--color-surface)" strokeWidth={2} />)}
            {Array.from({ length: 8 }, (_, i) => <g key={i}><rect x={X(i) - 33} y={0} width={66} height={220} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} /><text x={X(i)} y={222} fontSize={11} fill="currentColor" opacity={0.55} textAnchor="middle">{i === 7 ? 'agora' : `−${7 - i} sem`}</text></g>)}
          </svg>
          <AnimatePresence>
            {hover != null && visible.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, left: `${(X(hover) / 600) * 100}%` }} exit={{ opacity: 0 }} transition={spring}
                style={{ position: 'absolute', top: 0, transform: 'translateX(-50%)', pointerEvents: 'none', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-text)', color: 'var(--color-bg)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2, boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap' }}>
                <strong>{hover === 7 ? 'Esta semana' : `Há ${7 - hover} semana${7 - hover > 1 ? 's' : ''}`}</strong>
                {visible.map(l => <span key={l.code} style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}><span>{l.label}</span><strong>{l.values[hover]}</strong></span>)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span className="text-muted" style={{ fontSize: 12 }}>Escala 100θ + 500 · estimativa de estudo, não é a nota oficial.</span>
      </motion.section>
      <motion.section variants={item} className="card" style={{ flex: '1 1 300px' }}>
        <h5>Acerto por assunto</h5>
        {s.subjects.map((x, i) => (
          <div key={x.label} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>{x.label} <span className="text-muted">· {x.n}</span></span><strong className="tnum">{x.pct}%</strong></span>
            <Bar pct={x.pct} delay={i * 0.06} color={x.pct >= 70 ? 'var(--ok)' : x.pct >= 50 ? 'var(--warn)' : 'var(--color-accent)'} />
          </div>
        ))}
      </motion.section>
      <motion.section variants={item} className="card" style={{ flex: '1 1 300px' }}>
        <h5>Tempo médio por questão</h5>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 160, paddingTop: 16 }}>
          {s.times.map((t, i) => (
            <div key={t.code} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <strong className="tnum" style={{ fontSize: 12 }}>{Math.floor(t.sec / 60)}:{String(t.sec % 60).padStart(2, '0')}</strong>
              <motion.div title={t.label} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, ease, delay: i * 0.08 }} style={{ width: '100%', maxWidth: 48, height: `${(t.sec / maxSec) * 100}%`, borderRadius: '8px 8px 4px 4px', background: areaColor(t.code), transformOrigin: 'bottom' }} />
              <span className="text-muted" style={{ fontSize: 11 }}>{t.code}</span>
            </div>
          ))}
        </div>
      </motion.section>
      <motion.section variants={item} className="card" style={{ flex: '2 1 520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}><h5>Consistência de estudo</h5><span className="text-muted" style={{ fontSize: 12 }}>{s.heat.filter(h => h.n).length} de 84 dias com estudo</span></div>
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(7,1fr)', gridAutoFlow: 'column', gridAutoColumns: 'minmax(0,1fr)', gap: 4 }}>
          {s.heat.map((h, i) => (
            <motion.div key={h.day} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.006, ...spring }} title={`${h.day}: ${h.n} questões`}
              style={{ aspectRatio: 1, borderRadius: 4, maxHeight: 28, background: h.n === 0 ? 'var(--line)' : h.n < 8 ? 'color-mix(in srgb,var(--color-accent) 30%,var(--color-surface))' : h.n < 18 ? 'color-mix(in srgb,var(--color-accent) 65%,var(--color-surface))' : 'var(--color-accent)' }} />
          ))}
        </div>
      </motion.section>
      <motion.section variants={item} className="card" style={{ flex: '1 1 100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h5>Competências da redação</h5>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>{COMP_HUE.map((h, k) => <span key={k} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: hue(h) }} />C{k + 1}</span>)}</div>
        </div>
        {comps.length < 2 ? <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Salve ao menos duas versões em <Link href="/redacao">Redação</Link> para ver a evolução.</p> : (
          <svg viewBox="0 0 900 200" style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Competências C1 a C5 por versão">
            {[0, 50, 100, 150, 200].map(v => <g key={v}><line x1={40} x2={890} y1={180 - (v / 200) * 170} y2={180 - (v / 200) * 170} stroke="var(--line)" strokeDasharray="3 4" /><text x={0} y={184 - (v / 200) * 170} fontSize={11} fill="currentColor" opacity={0.55}>{v}</text></g>)}
            {COMP_HUE.map((h, k) => <motion.polyline key={k} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease, delay: k * 0.1 }} fill="none" stroke={hue(h)} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              points={comps.map((c, i) => `${60 + i * (800 / Math.max(1, comps.length - 1)) + k * 2},${180 - ((c[`c${k + 1}`] ?? 0) / 200) * 170}`).join(' ')} />)}
            {comps.map((_, i) => <text key={i} x={60 + i * (800 / Math.max(1, comps.length - 1))} y={198} fontSize={11} fill="currentColor" opacity={0.55} textAnchor="middle">V{i + 1}</text>)}
          </svg>
        )}
      </motion.section>
    </Stagger>
  );
}

function Report({ s }: { s: Stats }) {
  const r = s.report;
  const view = useMemo(() => {
    if (!r) return null;
    const n = r.attempts.length, ok = r.attempts.filter(a => a.correct).length, pct = Math.round((ok / Math.max(1, n)) * 100);
    const subs = [...new Set(r.attempts.map(a => a.subject))].map(x => { const a = r.attempts.filter(t => t.subject === x), c = a.filter(t => t.correct).length; return { x, v: `${c}/${a.length}`, color: c === a.length ? 'var(--ok)' : c ? 'var(--warn)' : 'var(--color-accent-700)' }; });
    const weak = [...s.subjects].sort((a, b) => a.pct - b.pct).map(x => x.label);
    return { n, ok, pct, subs, cmp: [...r.prev, pct], weak };
  }, [r, s.subjects]);
  if (!r || !view) return <main className="page" style={{ maxWidth: 820 }}><Empty /></main>;
  const plan = [['Seg', `Revisar ${view.weak[0] ?? 'erros'}`, '15 questões'], ['Qua', `Praticar ${view.weak[1] ?? view.weak[0] ?? 'questões'}`, '12 questões'], ['Sex', `Reforço em ${view.weak[2] ?? view.weak[0] ?? 'questões'}`, '10 questões'], ['Sáb', 'Redação completa', '1 texto'], ['Dom', 'Revisões vencidas (FSRS)', 'caderno']];

  return (
    <Stagger as="main" className="page" style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div><span className="text-muted" style={{ fontSize: 13 }}>{new Date(r.at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} · {{ SMART: 'Modo inteligente', SINGLE: 'Um assunto', MIXED: 'Misturado' }[r.mode]}</span><h2 style={{ margin: 0 }}>Relatório da sessão</h2></div>
        <button data-noprint="" className="btn btn-primary" onClick={() => window.print()} style={{ minHeight: 44 }}><Icon name="download" size={16} />Baixar PDF</button>
      </motion.div>
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        {[['Acertos', `${view.ok}/${view.n}`], ['Taxa de acerto', `${view.pct}%`], ['Tempo médio', `${Math.round(r.attempts.reduce((x, a) => x + a.timeMs, 0) / Math.max(1, view.n) / 1000)} s`]].map(([l, v]) => (
          <div key={l} className="card" style={{ borderRadius: 'var(--radius-md)', padding: 16, gap: 0 }}><span className="text-muted" style={{ fontSize: 12 }}>{l}</span><strong className="tnum" style={{ fontSize: 28 }}>{v}</strong></div>
        ))}
      </motion.div>
      <motion.section variants={item} style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div className="card" style={{ flex: '1 1 300px', gap: 8 }}>
          <h5>Acerto por assunto</h5>
          {view.subs.map(x => <div key={x.x} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--line)' }}><span>{x.x}</span><span className="tnum" style={{ color: x.color, fontWeight: 600 }}>{x.v}</span></div>)}
        </div>
        <div className="card" style={{ flex: '1 1 300px' }}>
          <h5>Comparação com as anteriores</h5>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 140 }}>
            {view.cmp.map((v, i) => {
              const last = i === view.cmp.length - 1;
              return (
                <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{v}%</span>
                  <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.7, ease, delay: i * 0.06 }} style={{ width: '100%', maxWidth: 40, height: `${Math.max(2, v)}%`, borderRadius: '6px 6px 3px 3px', background: last ? 'var(--color-accent)' : 'var(--line)', transformOrigin: 'bottom' }} />
                  <span className="text-muted" style={{ fontSize: 11 }}>{last ? 'Hoje' : `−${view.cmp.length - 1 - i}`}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>
      <motion.section variants={item} className="card">
        <h5>Erros explicados</h5>
        {r.attempts.every(a => a.correct) && <p style={{ margin: 0, color: 'var(--ok)' }}>Nenhum erro nesta sessão.</p>}
        {r.attempts.filter(a => !a.correct).map((e, i) => (
          <article key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0', borderTop: '1px solid var(--line)', breakInside: 'avoid' }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><span className="tag tag-accent">{e.subject}</span><span className="text-muted" style={{ fontSize: 12 }}>Questão {e.number} · você marcou {e.chosen} · correta {e.answer}</span></span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.statement}</p>
            {e.explanation && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}><span style={{ color: 'var(--color-accent-700)', fontWeight: 600 }}>Onde errou:</span> {e.explanation.wrong} <span style={{ color: 'var(--ok)', fontWeight: 600 }}>Por que a correta:</span> {e.explanation.why} <b>Próximo passo:</b> {e.explanation.next}</p>}
          </article>
        ))}
      </motion.section>
      <motion.section variants={item} className="card" style={{ background: 'var(--color-accent)', color: '#fff' }}>
        <h5>Plano da próxima semana</h5>
        {plan.map(([d, w, q]) => <div key={d} style={{ display: 'grid', gridTemplateColumns: '72px minmax(0,1fr) auto', gap: 12, alignItems: 'center', fontSize: 14, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,.3)' }}><strong>{d}</strong><span>{w}</span><span style={{ opacity: 0.9 }}>{q}</span></div>)}
      </motion.section>
    </Stagger>
  );
}
