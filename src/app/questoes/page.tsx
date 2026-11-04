'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { AppShell, api } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { Bar, Counter, Dialog, ease, item, spring, Stagger, Toast } from '@/components/motion';
import { AREAS, type Area } from '@/lib/areas';
import { OptionBody, OriginalToggle, QuestionBody, type QView } from '@/components/Question';
import { pickSmart, toEnem, type Ability } from '@/lib/tri';

interface Q extends QView { id: string; number: number; variant: string | null; area: Area; subject: string; year: number | null; hasAnswer: boolean; official: boolean; a: number; b: number; c: number; due: boolean; answer?: string }
interface Attempt { q: Q; chosen: string; correct: boolean; timeMs: number; answer?: string }
interface Exp { wrong: string; right: string; why: string; next: string }
type Mode = 'SMART' | 'SINGLE' | 'MIXED';
type Phase = 'answer' | 'checking' | 'correct' | 'wrong';
const fmt = (n: number) => n.toFixed(2).replace('.', ',');
const PACK = 'estudaai:pack', QUEUE = 'estudaai:queue';
const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? '') ?? d; } catch { return d; } };
const dropPack = (id: string) => localStorage.setItem(PACK, JSON.stringify(read<{ id: string }[]>(PACK, []).filter(x => x.id !== id)));

export default function QuestoesPage() {
  const [pool, setPool] = useState<Q[] | null>(null), [examName, setExamName] = useState<string | null>(null);
  const [abilities, setAbilities] = useState<Record<string, Ability>>({}), [start, setStart] = useState<Record<string, Ability>>({});
  const [screen, setScreen] = useState<'setup' | 'question' | 'summary'>('setup');
  const [mode, setMode] = useState<Mode>('SMART'), [picked, setPicked] = useState<string[]>([]), [size, setSize] = useState(10);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [used, setUsed] = useState<string[]>([]), [cur, setCur] = useState<Q | null>(null), [why, setWhy] = useState(''), [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null), [phase, setPhase] = useState<Phase>('answer'), [answer, setAnswer] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]), [elapsed, setElapsed] = useState(0), [hideTimer, setHideTimer] = useState(false);
  const [modal, setModal] = useState(false), [exp, setExp] = useState<Exp | null>(null), [expAI, setExpAI] = useState(false);
  const [original, setOriginal] = useState(false);
  const [lang, setLang] = useState<'ingles' | 'espanhol'>('ingles');
  const [toast, setToast] = useState(''), [xpFloat, setXpFloat] = useState<number | null>(null), [error, setError] = useState('');
  const tt = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const queue = read<unknown[]>(QUEUE, []);
        if (queue.length) { await api('/api/offline/sync', { method: 'POST', json: { items: queue } }); localStorage.removeItem(QUEUE); }
        const r = await api<{ questions: Q[]; abilities: Record<string, Ability>; examName: string | null }>('/api/questions/pool');
        setPool(r.questions); setAbilities(r.abilities); setExamName(r.examName);
        api<{ questions: Q[] }>('/api/offline/pack')
          .then(p => localStorage.setItem(PACK, JSON.stringify(p.questions.map(q => ({ ...q, hasAnswer: true, official: false, a: 1, b: 0, c: 0.2, due: false })))))
          .catch(() => {});
      } catch (e) {
        const pack = read<Q[]>(PACK, []);
        if (!pack.length) return setError((e as Error).message);
        setPool(pack); setOffline(true);
      }
    })();
  }, []);
  useEffect(() => {
    if (screen !== 'question' || phase !== 'answer') return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [screen, phase]);

  const flash = (m: string) => { clearTimeout(tt.current); setToast(m); tt.current = setTimeout(() => setToast(''), 3200); };
  const usable = useMemo(() => (pool ?? []).filter(q => !q.variant || q.variant === lang), [pool, lang]);
  const options = useMemo(() => {
    return mode === 'SINGLE' ? [...new Set(usable.map(q => q.subject))].sort() : [...new Set(usable.map(q => q.area))];
  }, [usable, mode]);

  const finish = useCallback(async (sid: string | null) => {
    setScreen('summary'); setModal(false);
    if (sid) api(`/api/sessions?id=${sid}`, { method: 'PATCH' }).catch(() => {});
  }, []);

  const advance = useCallback((usedNow: string[], nextIdx: number, sid: string | null, ab: Record<string, Ability>) => {
    const avail = usable.filter(q => !usedNow.includes(q.id) && (mode === 'SMART' || (mode === 'MIXED' && !picked.length) || picked.includes(mode === 'SINGLE' ? q.subject : q.area)));
    if (nextIdx >= size || !avail.length) return finish(sid);
    const p = mode === 'SMART' ? pickSmart(avail, ab) : { q: avail[Math.floor(Math.random() * avail.length)], why: '' };
    if (!p) return finish(sid);
    if (!p.q.hasAnswer) { // API 409 ANSWER_KEY_MISSING → pular
      flash(`Questão ${p.q.number} sem gabarito foi pulada.`);
      return advance([...usedNow, p.q.id], nextIdx, sid, ab);
    }
    setUsed([...usedNow, p.q.id]); setCur(p.q); setWhy(p.why); setChosen(null); setAnswer(null); setPhase('answer');
    setModal(false); setExp(null); setElapsed(0); setIdx(nextIdx + 1); setScreen('question');
  }, [usable, mode, picked, size, finish]);

  const begin = async () => {
    let sid: string | null = null;
    if (offline) setStart(abilities);
    else try {
      const s = await api<{ id: string; startAbilities: Record<string, Ability> }>('/api/sessions', { method: 'POST', json: { mode, size, picked } });
      sid = s.id; setStart(s.startAbilities);
    } catch (e) { return flash((e as Error).message); }
    setSessionId(sid); setAttempts([]);
    advance([], 0, sid, abilities);
  };

  const confirm = useCallback(async () => {
    if (!chosen || !cur || phase !== 'answer') return;
    setPhase('checking');
    if (offline) {
      const ans = cur.answer!, right = chosen === ans;
      localStorage.setItem(QUEUE, JSON.stringify([...read<unknown[]>(QUEUE, []), { questionId: cur.id, chosen, createdAt: Date.now() }]));
      dropPack(cur.id); setPool(p => p && p.filter(x => x.id !== cur.id));
      setAnswer(ans); setPhase(right ? 'correct' : 'wrong');
      setAttempts(a => [...a, { q: cur, chosen, correct: right, answer: ans, timeMs: elapsed * 1000 }]);
      if (!right) { setExp({ wrong: `Você marcou ${chosen}.`, right: '', why: `A alternativa correta é ${ans}.`, next: '' }); setTimeout(() => setModal(true), 900); }
      return;
    }
    try {
      const r = await api<{ correct: boolean; answer: string; abilities: Record<string, Ability>; xp: { gained: number; levelUp: boolean; level: number } }>('/api/attempts', { method: 'POST', json: { questionId: cur.id, chosen, timeMs: elapsed * 1000, sessionId } });
      setAnswer(r.answer); setAbilities(r.abilities); setPhase(r.correct ? 'correct' : 'wrong');
      dropPack(cur.id); setPool(p => p && p.filter(x => x.id !== cur.id));
      setAttempts(a => [...a, { q: cur, chosen, correct: r.correct, answer: r.answer, timeMs: elapsed * 1000 }]);
      setXpFloat(r.xp.gained); setTimeout(() => setXpFloat(null), 1200);
      if (r.xp.levelUp) flash(`Nível ${r.xp.level}! Cada questão conta.`);
      if (!r.correct) {
        setTimeout(() => setModal(true), 900);
        api<{ explanation: Exp; ai: boolean }>(`/api/questions/${cur.id}/explanation?chosen=${chosen}`).then(x => { setExp(x.explanation); setExpAI(x.ai); }).catch(() => {});
      }
    } catch (e) {
      setPhase('answer');
      flash((e as { code?: string }).code === 'ANSWER_KEY_MISSING' ? 'Questão sem gabarito.' : (e as Error).message);
    }
  }, [chosen, cur, phase, elapsed, sessionId, offline]);

  const next = useCallback(() => advance(used, idx, sessionId, abilities), [advance, used, idx, sessionId, abilities]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen !== 'question' || (e.target as HTMLElement).closest?.('input,textarea')) return;
      const k = e.key.toUpperCase(), map: Record<string, string> = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' };
      const letter = map[k] || (k.length === 1 && 'ABCDE'.includes(k) ? k : null);
      if (phase === 'answer' && letter && cur?.options.some(o => o.k === letter)) setChosen(letter);
      if (k === 'ENTER' && !modal) { e.preventDefault(); if (phase === 'answer') confirm(); else if (phase !== 'checking') next(); }
    };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, [screen, phase, cur, modal, confirm, next]);

  const tm = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const ok = attempts.filter(a => a.correct).length, n = attempts.length;
  const nextLabel = idx >= size ? 'Ver resultado' : 'Próxima questão';
  const keyed = usable.filter(q => q.hasAnswer).length;

  const optStyle = (k: string) => {
    const done = phase === 'correct' || phase === 'wrong';
    const right = done && k === answer, wrong = done && k === chosen && k !== answer, sel = !done && k === chosen;
    return {
      border: right ? 'var(--ok)' : wrong || sel ? 'var(--color-accent)' : 'var(--line)',
      bg: right ? 'var(--ok-100)' : wrong || sel ? 'var(--color-accent-100)' : 'transparent',
      markBg: right ? 'var(--ok)' : wrong || sel ? 'var(--color-accent)' : 'var(--color-bg)',
      markColor: right || wrong || sel ? '#fff' : 'inherit', mark: right ? '✓' : wrong ? '✗' : k, wrong, right,
    };
  };

  return (
    <AppShell extra={examName ? <span className="text-muted" style={{ fontSize: 13 }}>{examName}</span> : null}>
      <AnimatePresence mode="wait">
        {screen === 'setup' && (
          <motion.main key="setup" className="page" style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3, ease }}>
            <div><h2 style={{ margin: 0 }}>Nova sessão</h2><p className="text-muted" style={{ margin: '4px 0 0' }}>Escolha como as questões serão montadas.</p></div>
            {error && <p role="alert" style={{ color: 'var(--color-accent-700)' }}>{error}</p>}
            {offline && <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Modo offline: as respostas ficam salvas e sincronizam quando você voltar a ficar online.</p>}
            {pool && !pool.length && (
              <p style={{ margin: 0, padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--warn-100)', color: 'var(--warn)' }}>
                Nenhuma questão nas suas provas. Coloque os PDFs em <code>provas/</code>, rode <code>npm run ingest</code> e escolha as provas em <Link href="/onboarding">Editar prova</Link>.
              </p>
            )}
            <Stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 'var(--space-3)' }}>
              {([['SMART', 'Inteligente', 'Adapta ao seu nível com TRI e inclui revisões.', 'brain'], ['SINGLE', 'Um assunto', 'Foco total em um tema.', 'target'], ['MIXED', 'Misturado', 'Várias áreas embaralhadas.', 'shuffle']] as const).map(([v, label, desc, icon]) => {
                const on = mode === v;
                return (
                  <motion.button variants={item} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} key={v} role="radio" aria-checked={on} onClick={() => { setMode(v); setPicked([]); }}
                    style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: `1.5px solid ${on ? 'var(--color-accent)' : 'var(--line)'}`, background: on ? 'var(--color-accent-100)' : 'var(--color-surface)', transition: 'background .2s, border-color .2s' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: on ? 'var(--color-accent)' : 'var(--color-bg)', color: on ? '#fff' : 'var(--color-accent)', transition: 'all .2s' }}><Icon name={icon} size={20} /></span>
                    <strong style={{ fontSize: 15 }}>{label}</strong>
                    <span className="text-muted" style={{ fontSize: 13, lineHeight: 1.4 }}>{desc}</span>
                  </motion.button>
                );
              })}
            </Stagger>
            <AnimatePresence>
              {mode !== 'SMART' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 13 }}>{mode === 'SINGLE' ? 'Escolha um assunto' : 'Escolha as áreas (nenhuma = todas)'}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {options.map(x => {
                      const on = picked.includes(x);
                      return <motion.button layout key={x} className="chip" aria-pressed={on} onClick={() => setPicked(mode === 'SINGLE' ? [x] : on ? picked.filter(y => y !== x) : [...picked, x])}>{AREAS[x as Area] ?? x}</motion.button>;
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {pool?.some(q => q.variant) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13 }}>Língua estrangeira</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['ingles', 'espanhol'] as const).map(l => (
                    <button key={l} className="chip" aria-pressed={lang === l} onClick={() => setLang(l)}>{l === 'ingles' ? 'Inglês' : 'Espanhol'}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><label htmlFor="size" style={{ fontSize: 13 }}>Número de questões</label>
                <motion.strong key={size} initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={spring} className="tnum" style={{ fontSize: 24 }}>{size}</motion.strong></div>
              <input id="size" type="range" min={5} max={15} step={1} value={size} onChange={e => setSize(+e.target.value)} style={{ width: '100%', accentColor: 'var(--color-accent)', height: 28 }} />
              <AnimatePresence>{size === 15 && <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ margin: 0, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--warn-100)', color: 'var(--warn)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="coffee" size={16} />Sessão no limite. Ao terminar, faça uma pausa antes da próxima.</motion.p>}</AnimatePresence>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} className="btn btn-primary" onClick={begin} disabled={!keyed || (mode === 'SINGLE' && !picked.length)} style={{ minHeight: 52, justifyContent: 'space-between', fontSize: 15, paddingInline: 22 }}>
              {pool ? `Começar · ${keyed} questões reais disponíveis` : 'Carregando questões…'}<Icon name="arrow-right" />
            </motion.button>
          </motion.main>
        )}

        {screen === 'question' && cur && (
          <motion.main key="question" className="page" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span className="tnum" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{idx} / {size}</span>
              <div style={{ flex: 1 }}><Bar pct={((idx - (phase === 'answer' || phase === 'checking' ? 1 : 0)) / size) * 100} height={6} /></div>
              <button onClick={() => setHideTimer(!hideTimer)} aria-label="Mostrar ou ocultar cronômetro" className="btn btn-ghost tnum" style={{ fontSize: 12, fontWeight: 400 }}><Icon name={hideTimer ? 'eye-off' : 'timer'} size={14} />{hideTimer ? '••:••' : tm}</button>
            </div>
            <AnimatePresence mode="wait">
              <motion.article key={cur.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35, ease }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="tag tag-accent">{AREAS[cur.area]}</span>
                  <span className="tag tag-neutral">{cur.subject}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>{cur.year ? `ENEM ${cur.year} · ` : ''}Questão {cur.number}{cur.variant ? ` (${cur.variant === 'ingles' ? 'inglês' : 'espanhol'})` : ''}{why ? ` · ${why}` : ''}</span>
                  <span style={{ marginLeft: 'auto' }}><OriginalToggle q={cur} on={original} onChange={setOriginal} /></span>
                </div>
                <QuestionBody q={cur} original={original} />
                <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 8 }} delay={0.04}>
                  {cur.options.map(o => {
                    const s = optStyle(o.k);
                    return (
                      <motion.button variants={item} key={o.k} aria-pressed={chosen === o.k} disabled={phase !== 'answer'} onClick={() => setChosen(o.k)}
                        animate={s.wrong ? { x: [0, -6, 6, -6, 6, 0] } : s.right ? { scale: [1, 1.02, 1] } : {}} transition={{ duration: 0.4 }} whileHover={phase === 'answer' ? { x: 4 } : undefined}
                        style={{ all: 'unset', boxSizing: 'border-box', cursor: phase === 'answer' ? 'pointer' : 'default', display: 'flex', gap: 'var(--space-3)', alignItems: 'center', minHeight: 56, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${s.border}`, background: s.bg, transition: 'border-color .2s, background .2s' }}>
                        <span style={{ display: 'grid', placeItems: 'center', flex: 'none', width: 32, height: 32, borderRadius: '50%', fontWeight: 800, fontSize: 13, background: s.markBg, color: s.markColor, transition: 'all .2s' }}>{s.mark}</span>
                        <OptionBody o={o} />
                      </motion.button>
                    );
                  })}
                </Stagger>
              </motion.article>
            </AnimatePresence>
            <AnimatePresence>
              {phase === 'correct' && <motion.div key="ok" role="status" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={spring} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--ok-100)', color: 'var(--ok)' }}><Icon name="party-popper" size={22} /><strong>Isso mesmo! Raciocínio certeiro.</strong></motion.div>}
              {phase === 'wrong' && <motion.div key="no" role="alert" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={spring} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent-100)', color: 'var(--color-accent-800)' }}><Icon name="circle-alert" size={22} /><span style={{ flex: 1 }}><strong>Não foi dessa vez.</strong> Você marcou {chosen}. Correta: {answer}.</span><button className="btn btn-ghost" onClick={() => setModal(true)} style={{ fontSize: 13 }}>Ver explicação</button></motion.div>}
            </AnimatePresence>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', position: 'relative' }}>
              <span className="text-muted" style={{ fontSize: 12 }}>Teclas A–E escolhem · Enter confirma</span>
              <AnimatePresence>{xpFloat && <motion.span initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -50 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }} style={{ position: 'absolute', right: 40, top: 0, fontWeight: 800, color: 'var(--color-accent)', pointerEvents: 'none' }}>+{xpFloat} XP</motion.span>}</AnimatePresence>
              {phase === 'answer' || phase === 'checking'
                ? <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary" onClick={confirm} disabled={!chosen || phase === 'checking'} style={{ minHeight: 52, minWidth: 200, justifyContent: 'space-between', paddingInline: 22 }}>{phase === 'checking' ? 'Corrigindo…' : 'Confirmar'}<Icon name="check" /></motion.button>
                : <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.97 }} className="btn btn-primary" onClick={next} style={{ minHeight: 52, minWidth: 200, justifyContent: 'space-between', paddingInline: 22 }}>{nextLabel}<Icon name="arrow-right" /></motion.button>}
            </div>
          </motion.main>
        )}

        {screen === 'summary' && (
          <motion.main key="summary" className="page" style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}>
            <div><h2 style={{ margin: 0 }}>Sessão concluída</h2><p className="text-muted" style={{ margin: '4px 0 0' }}>Cada questão deixa sua estimativa mais precisa.</p></div>
            <Stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 'var(--space-3)' }}>
              {[['Acertos', <><Counter value={ok} />/{n}</>], ['Taxa', <><Counter value={n ? (ok / n) * 100 : 0} />%</>], ['Tempo médio', n ? <><Counter value={attempts.reduce((x, a) => x + a.timeMs, 0) / n / 1000} /> s</> : '—']].map(([l, v]) => (
                <motion.div variants={item} key={String(l)} className="card" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', gap: 0 }}><span className="text-muted" style={{ fontSize: 12 }}>{l}</span><strong style={{ fontSize: 28 }}>{v}</strong></motion.div>
              ))}
            </Stagger>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <h5 style={{ margin: 0 }}>Proficiência por área</h5>
              {[...new Set(attempts.map(a => a.q.area))].map((a, i) => {
                const before = start[a] ?? { theta: 0, se: 1 }, after = abilities[a] ?? before, d = toEnem(after.theta) - toEnem(before.theta);
                const at = attempts.filter(x => x.q.area === a);
                return (
                  <motion.div key={a} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px 12px', alignItems: 'center', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)' }}>
                    <span style={{ fontSize: 14 }}><strong>{AREAS[a]}</strong> <span className="text-muted">· {at.filter(x => x.correct).length}/{at.length} acertos</span></span>
                    <span className="tnum" style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}><span className="text-muted" style={{ fontSize: 13 }}>{toEnem(before.theta)} →</span><strong style={{ fontSize: 18 }}><Counter value={toEnem(after.theta)} /></strong><span style={{ fontSize: 13, fontWeight: 600, color: d >= 0 ? 'var(--ok)' : 'var(--warn)' }}>{d >= 0 ? '+' : ''}{d}</span></span>
                    <div style={{ gridColumn: '1/-1' }}><Bar pct={((after.theta + 4) / 8) * 100} height={6} /></div>
                    <span className="text-muted" style={{ gridColumn: '1/-1', fontSize: 11 }}>θ {fmt(after.theta)} ± {fmt(after.se)} (EAP, 40 pontos, priori N(0,1))</span>
                  </motion.div>
                );
              })}
              <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>Estimativa de estudo, não é a nota oficial.</p>
            </div>
            {size === 15 && <p style={{ margin: 0, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--warn-100)', color: 'var(--warn)', fontSize: 14 }}>Foram 15 questões. Uma pausa de 10 minutos ajuda a fixar o que você viu.</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setScreen('setup')} style={{ minHeight: 48, minWidth: 200, justifyContent: 'space-between', paddingInline: 22 }}>Nova sessão<Icon name="rotate-cw" /></button>
              <Link className="btn btn-secondary" href="/painel" style={{ minHeight: 48, paddingInline: 22 }}>Ver relatório</Link>
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      <Dialog open={modal} onClose={() => setModal(false)} labelledBy="exp-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div><span className="text-muted" style={{ fontSize: 12 }}>{cur?.subject}{expAI ? ' · explicação gerada por IA' : ''}</span><h3 id="exp-title" style={{ margin: 0, fontSize: 22 }}>Vamos entender juntos</h3></div>
          <button className="btn btn-secondary btn-icon" onClick={() => setModal(false)} aria-label="Fechar"><Icon name="x" /></button>
        </div>
        {!exp ? (
          <div role="status" aria-label="Gerando explicação" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 0.15, 0.3].map(d => <div key={d} style={{ height: 72, borderRadius: 'var(--radius-md)', background: 'var(--line)', animation: `shimmer 1.2s ${d}s infinite` }} />)}
          </div>
        ) : (
          <>
            <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 8 }} delay={0.09}>
              {([['Onde você errou', exp.wrong, 'crosshair', 'var(--color-accent)', 'var(--color-accent-100)'], ['O que você acertou no raciocínio', exp.right, 'circle-check', 'var(--ok)', 'var(--ok-100)'], ['Por que a correta é a correta', exp.why, 'lightbulb', 'var(--warn)', 'var(--warn-100)'], ['Próximo passo', exp.next, 'footprints', 'var(--color-text)', 'var(--color-bg)']] as const)
                .filter(b => b[1]).map(([title, body, icon, color, bg]) => (
                  <motion.section variants={item} key={title} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: bg }}>
                    <Icon name={icon} size={20} style={{ color, marginTop: 2 }} />
                    <div><h4 style={{ margin: 0, fontSize: 14, color }}>{title}</h4><p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{body}</p></div>
                  </motion.section>
                ))}
            </Stagger>
            <button className="btn btn-primary" onClick={next} style={{ minHeight: 48, justifyContent: 'space-between', paddingInline: 22 }}>Entendi, {nextLabel.toLowerCase()}<Icon name="arrow-right" /></button>
          </>
        )}
      </Dialog>
      <Toast message={toast} />
    </AppShell>
  );
}