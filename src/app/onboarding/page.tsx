'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Brand, ThemeButton, api } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { ease, Segmented, spring, Stagger, item } from '@/components/motion';
import { AREAS, type Area } from '@/lib/areas';

interface Source { id: string; title: string; kind: string; status: 'PARSED' | 'NEEDS_KEY'; questionCount: number; keyedCount: number; files: string[]; areas: Record<string, number> }
type ExamType = 'ENEM' | 'CONCURSO' | 'OUTRA';
type Plan = { weeks: number; days: number; week1: { f: string; q: string }[] };

const LABELS = ['Nome', 'Tipo', 'Provas', 'Data', 'Redação', 'Plano'];
const COMPS = ['Norma culta', 'Compreensão do tema', 'Argumentação', 'Coesão', 'Proposta de intervenção'];
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  
export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1), [dir, setDir] = useState(1);
  const [name, setName] = useState(''), [type, setType] = useState<ExamType | ''>('');
  const [sources, setSources] = useState<Source[] | null>(null), [picked, setPicked] = useState<string[]>([]);
  const [date, setDate] = useState(''), [hasEssay, setHasEssay] = useState<boolean | null>(null);
  const [scores, setScores] = useState<(number | null)[]>([null, null, null, null, null]);
  const [plan, setPlan] = useState<Plan | null>(null), [planning, setPlanning] = useState(false);
  const [err, setErr] = useState(''), [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Source[]>('/api/sources').then(setSources).catch(() => setSources([]));
    api<{ exam: { name: string; type: ExamType; date: string; sourceIds: string[]; hasEssay: boolean; essayScores: (number | null)[] | null } | null }>('/api/me').then(({ exam }) => {
      if (!exam) return;
      setName(exam.name); setType(exam.type); setPicked(exam.sourceIds); setDate(exam.date); setHasEssay(exam.hasEssay);
      if (exam.essayScores) setScores(exam.essayScores);
    }).catch(() => {});
  }, []);

  const stepError = (): string => {
    const n = name.trim();
    if (step === 1) return n.length < 2 ? 'Use pelo menos 2 caracteres.' : n.length > 60 ? 'Máximo de 60 caracteres.' : '';
    if (step === 2) return type ? '' : 'Escolha um tipo.';
    if (step === 3) return picked.length ? '' : 'Escolha pelo menos uma prova.';
    if (step === 4) return !date ? 'Informe a data.' : new Date(date + 'T00:00') <= today() ? 'A data precisa ser no futuro.' : '';
    if (step === 5) return hasEssay === null ? 'Responda se a prova tem redação.' : '';
    return plan ? '' : 'Gere o plano.';
  };

  const go = (d: number) => { setDir(d); setErr(''); setStep(s => s + d); };
  const next = async () => {
    const e = stepError(); if (e) return setErr(e);
    if (step < 6) return go(1);
    setSaving(true);
    try {
      await api('/api/exam', { method: 'PUT', json: { name: name.trim(), type, date, sourceIds: picked, hasEssay: !!hasEssay, essayScores: hasEssay && scores.some(v => v != null) ? scores : null, plan } });
      router.push('/prova');
    } catch (x) { setErr((x as Error).message); setSaving(false); }
  };

  // Plano: semanas até a prova, com foco nas áreas que têm mais questões nas provas escolhidas e na competência mais fraca da redação.
  const genPlan = () => {
    setPlanning(true);
    setTimeout(() => {
      const days = Math.ceil((new Date(date + 'T00:00').getTime() - today().getTime()) / 864e5), weeks = Math.max(1, Math.ceil(days / 7));
      const count: Record<string, number> = {};
      for (const s of sources ?? []) if (picked.includes(s.id)) for (const [a, n] of Object.entries(s.areas)) count[a] = (count[a] ?? 0) + n;
      const areas: string[] = Object.entries(count).sort((a, b) => b[1] - a[1]).map(([a]) => AREAS[a as Area] ?? a);
      const sc = scores.map(v => v ?? 120), low = sc.indexOf(Math.min(...sc));
      const focus = [areas[0] ?? 'Questões', areas[1] ?? 'Revisão'].concat(hasEssay ? [`Redação — C${low + 1}`] : []);
      setPlan({ weeks, days, week1: focus.map((f, i) => ({ f, q: i === 2 ? '2 redações' : `${40 - i * 10} questões` })) });
      setPlanning(false);
    }, 900);
  };

  const keyed = useMemo(() => (sources ?? []).filter(s => picked.includes(s.id)).reduce((n, s) => n + s.keyedCount, 0), [sources, picked]);
  const radio = (on: boolean): React.CSSProperties => ({ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderRadius: 'var(--radius-md)', minHeight: 60, border: `1.5px solid ${on ? 'var(--color-accent)' : 'var(--line)'}`, background: on ? 'var(--color-accent-100)' : 'transparent', transition: 'all .2s' });

  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-4)' }}><Brand /><ThemeButton /></header>
      <main style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 'var(--space-3)' }}>
        <motion.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring} className="dialog" style={{ width: 'min(580px,100%)', padding: 0, gap: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-secondary btn-icon" onClick={() => go(-1)} disabled={step === 1} aria-label="Voltar"><Icon name="chevron-left" /></button>
              <span style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}>Etapa {step} de 6</span>
            </div>
            <ol aria-label="Progresso do cadastro" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4 }}>
              {LABELS.map((l, i) => (
                <li key={l} aria-current={i + 1 === step ? 'step' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                  <span style={{ height: 4, borderRadius: 4, background: 'var(--color-divider)', overflow: 'hidden' }}>
                    <motion.span animate={{ width: i + 1 <= step ? '100%' : '0%' }} transition={{ duration: 0.4, ease }} style={{ display: 'block', height: '100%', background: 'var(--color-accent)' }} />
                  </span>
                  <span style={{ color: i + 1 === step ? 'var(--color-text)' : 'var(--color-muted)' }}>{l}</span>
                </li>
              ))}
            </ol>
          </div>
          <div style={{ padding: 'var(--space-6) var(--space-4)', minHeight: 320, position: 'relative' }}>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} initial={{ opacity: 0, x: 30 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 * dir }} transition={{ duration: 0.28, ease }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {step === 1 && <>
                  <h2 id="ob-title" style={{ margin: 0 }}>Qual prova você vai fazer?</h2>
                  <div className="field">
                    <label htmlFor="exam-name">Nome da prova</label>
                    <input id="exam-name" className="input" maxLength={60} placeholder="ENEM 2026" value={name} onChange={e => setName(e.target.value)} style={{ minHeight: 44 }} autoFocus />
                    <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{name.trim().length}/60</p>
                  </div>
                </>}
                {step === 2 && <>
                  <h2 style={{ margin: 0 }}>Tipo da prova</h2>
                  <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {([['ENEM', 'ENEM', 'Quatro áreas e redação', 'school'], ['CONCURSO', 'Concurso', 'Edital e banca específicos', 'landmark'], ['OUTRA', 'Outra prova', 'Vestibular, certificação, etc.', 'clipboard-list']] as const).map(([v, l, d, ic]) => (
                      <motion.button variants={item} key={v} role="radio" aria-checked={type === v} onClick={() => { setType(v); if (v === 'ENEM') setHasEssay(true); setErr(''); }} style={radio(type === v)}>
                        <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--color-bg)', color: 'var(--color-accent)' }}><Icon name={ic} /></span>
                        <span style={{ display: 'flex', flexDirection: 'column' }}><strong>{l}</strong><span className="text-muted" style={{ fontSize: 13 }}>{d}</span></span>
                      </motion.button>
                    ))}
                  </Stagger>
                </>}
                {step === 3 && <>
                  <h2 style={{ margin: 0 }}>Provas de referência</h2>
                  {sources === null && <p className="text-muted">Carregando provas…</p>}
                  {sources?.length === 0 && (
                    <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--warn-100)', color: 'var(--warn)', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <strong>Nenhuma prova importada ainda.</strong>
                      <span>Coloque os PDFs na pasta <code>provas/</code> do projeto e rode <code>npm run ingest</code>. Só o texto das questões é guardado.</span>
                    </div>
                  )}
                  <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sources?.map(s => {
                      const on = picked.includes(s.id);
                      return (
                        <motion.button variants={item} key={s.id} role="checkbox" aria-checked={on} onClick={() => { setPicked(on ? picked.filter(x => x !== s.id) : [...picked, s.id]); setErr(''); }} style={radio(on)}>
                          <Icon name="file-text" size={16} />
                          <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <span>{s.title}</span>
                            <span className="text-muted" style={{ fontSize: 12 }}>{s.questionCount} questões · {s.keyedCount} com gabarito</span>
                          </span>
                          {s.status === 'NEEDS_KEY' && <span className="tag tag-neutral">Sem gabarito</span>}
                        </motion.button>
                      );
                    })}
                  </Stagger>
                  <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{picked.length ? `${keyed} questões prontas para praticar. ` : ''}Questões sem gabarito são puladas nas sessões.</p>
                </>}
                {step === 4 && <>
                  <h2 style={{ margin: 0 }}>Quando é a prova?</h2>
                  <div className="field">
                    <label htmlFor="exam-date">Data da prova</label>
                    <input id="exam-date" className="input" type="date" min={new Date(Date.now() + 864e5).toISOString().slice(0, 10)} value={date} onChange={e => setDate(e.target.value)} style={{ minHeight: 44 }} />
                  </div>
                </>}
                {step === 5 && <>
                  <h2 style={{ margin: 0 }}>A prova tem redação?</h2>
                  <Segmented label="Tem redação" value={hasEssay === null ? null : hasEssay ? 'sim' : 'nao'} onChange={v => { setHasEssay(v === 'sim'); setErr(''); }} options={[{ v: 'sim', label: 'Sim' }, { v: 'nao', label: 'Não' }]} />
                  <AnimatePresence>
                    {hasEssay && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Notas de redações anteriores (opcional). Usamos para priorizar as competências mais fracas.</p>
                        <div style={{ borderTop: '1px solid var(--line)' }}>
                          {COMPS.map((t, i) => (
                            <div key={t} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 96px', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                              <strong>C{i + 1}</strong>
                              <label htmlFor={`c${i}`} style={{ fontSize: 14 }}>{t}</label>
                              <select id={`c${i}`} className="input" value={scores[i] ?? ''} onChange={e => { const s = [...scores]; s[i] = e.target.value === '' ? null : +e.target.value; setScores(s); }} style={{ minHeight: 44 }}>
                                <option value="">—</option>
                                {Array.from({ length: 6 }, (_, k) => <option key={k} value={k * 40}>{k * 40}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>}
                {step === 6 && <>
                  <h2 style={{ margin: 0 }}>Seu plano de estudo</h2>
                  {!plan && !planning && <>
                    <p style={{ margin: 0 }}>Vamos dividir o tempo até a prova em semanas, com mais tempo para os pontos que precisam de atenção.</p>
                    <button className="btn btn-secondary" onClick={genPlan} style={{ alignSelf: 'flex-start', minHeight: 44 }}><Icon name="wand-sparkles" size={16} />Gerar plano</button>
                  </>}
                  {planning && <p role="status" style={{ margin: 0, animation: 'pulse 1s infinite' }}>Montando as semanas…</p>}
                  {plan && (
                    <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <motion.p variants={item} style={{ margin: 0 }}><strong style={{ fontSize: 32, fontFamily: 'var(--font-heading)' }}>{plan.weeks}</strong> semanas até a prova</motion.p>
                      <motion.h6 variants={item} style={{ margin: 0 }}>Semana 1</motion.h6>
                      {plan.week1.map(f => (
                        <motion.div variants={item} key={f.f} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}><span>{f.f}</span><span className="text-muted">{f.q}</span></motion.div>
                      ))}
                    </Stagger>
                  )}
                </>}
              </motion.div>
            </AnimatePresence>
            <AnimatePresence>{err && <motion.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ margin: 'var(--space-3) 0 0', fontSize: 13, color: 'var(--color-accent-700)' }}>{err}</motion.p>}</AnimatePresence>
          </div>
          <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--line)' }}>
            <motion.button whileTap={{ scale: 0.98 }} className="btn btn-primary btn-block" onClick={next} disabled={(step === 6 && !plan) || saving} style={{ minHeight: 48, justifyContent: 'space-between' }}>
              {step === 6 ? (saving ? 'Salvando…' : 'Ver minha prova') : 'Continuar'} <Icon name="arrow-right" />
            </motion.button>
          </div>
        </motion.div>
      </main>
    </>
  );
}
