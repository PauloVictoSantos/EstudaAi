'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppShell, api } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { Bar, ease, item, Segmented, Stagger } from '@/components/motion';
import { AREAS, areaColor, type Area } from '@/lib/areas';

interface Item {
  id: string; number: number; variant: string | null; year: number | null; area: Area; subject: string; answer: string;
  official: boolean; a: number; b: number; c: number; bEnem: number;
  n: number; pct: number; pSup: number | null; pInf: number | null; disc: number | null; alts: { k: string; pct: number; bis: number | null }[]; flags: string[];
}
const pc = (v: number) => `${Math.round(v * 100)}%`;
const f2 = (v: number | null) => (v == null ? '—' : v.toFixed(2).replace('.', ','));

export default function AnalisePage() {
  const [data, setData] = useState<{ items: Item[]; respondents: number } | null>(null);
  const [filter, setFilter] = useState<'all' | 'flags'>('all');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { api<{ items: Item[]; respondents: number }>('/api/analise').then(setData).catch(() => setData({ items: [], respondents: 0 })); }, []);
  const list = useMemo(() => (data?.items ?? []).filter(i => filter === 'all' || i.flags.length), [data, filter]);

  return (
    <AppShell>
      <main className="page" style={{ maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <h2 style={{ margin: 0 }}>Análise dos itens</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', maxWidth: '70ch' }}>
            Procedimento da análise clássica (TCT) descrito pelo Inep: percentual de acerto, escolha de cada alternativa, acerto dos grupos superior e inferior (27%),
            índice de discriminação e correlação bisserial. Alternativa errada com bisserial positivo pode indicar erro de gabarito.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Segmented label="Filtro" value={filter} onChange={setFilter} options={[{ v: 'all', label: 'Todos' }, { v: 'flags', label: 'Com alerta' }]} />
          <span className="text-muted" style={{ fontSize: 13 }}>{data ? `${data.items.length} itens respondidos · ${data.respondents} alunos` : 'Carregando…'}</span>
        </div>
        {data && !data.items.length && <p className="card">Ainda não há respostas. Os indicadores aparecem conforme os alunos resolvem questões.</p>}
        <Stagger key={filter} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} delay={0.03}>
          {list.map(i => {
            const isOpen = open === i.id;
            return (
              <motion.div variants={item} layout key={i.id} className="card" style={{ borderRadius: 'var(--radius-md)', padding: '12px 16px', gap: 10 }}>
                <button onClick={() => setOpen(isOpen ? null : i.id)} aria-expanded={isOpen} style={{ all: 'unset', cursor: 'pointer', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, alignItems: 'center' }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: areaColor(i.area) }} />
                    <strong>{i.year ? `ENEM ${i.year} · ` : ''}Questão {i.number}{i.variant ? ` (${i.variant === 'ingles' ? 'inglês' : 'espanhol'})` : ''}</strong>
                    <span className="text-muted" style={{ fontSize: 13 }}>{AREAS[i.area]} · {i.subject}</span>
                    {i.flags.length > 0 && <span className="tag" style={{ background: 'var(--warn-100)', color: 'var(--warn)' }}><Icon name="circle-alert" size={12} style={{ marginRight: 4 }} />verificar</span>}
                  </span>
                  <span className="tnum" style={{ fontSize: 13, display: 'flex', gap: 14 }}>
                    <span title="Respostas">n {i.n}</span><span title="Percentual de acerto">acerto {pc(i.pct)}</span><span title="Índice de discriminação">disc {f2(i.disc)}</span>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {i.flags.map(f => <p key={f} style={{ margin: 0, fontSize: 13, color: 'var(--warn)' }}>• {f}</p>)}
                      <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr) 56px 64px', gap: '6px 10px', alignItems: 'center', fontSize: 13 }}>
                        <span /><span className="text-muted">Escolha</span><span className="text-muted tnum">%</span><span className="text-muted">Bisserial</span>
                        {i.alts.map(a => (
                          <motion.div key={a.k} style={{ display: 'contents' }}>
                            <strong style={{ color: a.k === i.answer ? 'var(--ok)' : 'inherit' }}>{a.k}{a.k === i.answer ? '✓' : ''}</strong>
                            <Bar pct={a.pct * 100} color={a.k === i.answer ? 'var(--ok)' : a.bis != null && a.bis > 0 ? 'var(--warn)' : 'var(--color-neutral-400)'} />
                            <span className="tnum">{pc(a.pct)}</span>
                            <span className="tnum" style={{ color: a.k !== i.answer && a.bis != null && a.bis > 0 ? 'var(--warn)' : 'inherit' }}>{f2(a.bis)}</span>
                          </motion.div>
                        ))}
                      </div>
                      <div className="text-muted tnum" style={{ fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>Grupo superior (27%): {i.pSup == null ? '—' : pc(i.pSup)}</span>
                        <span>Grupo inferior (27%): {i.pInf == null ? '—' : pc(i.pInf)}</span>
                        <span>TRI {i.official ? '(parâmetros oficiais do Inep)' : '(estimado pelo acerto)'}: a {f2(i.a)} · b {f2(i.b)} ({i.bEnem} na escala 500) · c {f2(i.c)}</span>
                      </div>
                      {i.n < 20 && <span className="text-muted" style={{ fontSize: 12 }}>Amostra pequena: os índices ficam estáveis a partir de algumas dezenas de respostas.</span>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </Stagger>
      </main>
    </AppShell>
  );
}
