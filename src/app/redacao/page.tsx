'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppShell, api } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { Counter, ease, item, spring, Stagger, Toast } from '@/components/motion';
import { countWords, KINDS, mapSpans, MODES, THEMES, type Analysis, type Comps, type Span, type Theme } from '@/lib/essay';

interface Version { id: string; total: number; words: number; at: string; themeTitle: string }
type Status = 'idle' | 'typing' | 'analyzing' | 'ok' | 'error';
const BG = { red: 'var(--hl-red)', yellow: 'var(--hl-yellow)', green: 'var(--hl-green)' } as const;
const DOT = { red: 'var(--color-accent)', yellow: 'var(--warn)', green: 'var(--ok)' } as const;
const DECO: Partial<Record<Span['kind'], string>> = { sinonimo: 'wavy', repeticao: 'dotted', coesao: 'double', sentido: 'double' };
const NAMES = ['Norma culta', 'Compreensão do tema', 'Argumentação', 'Coesão', 'Proposta de intervenção'];
const START = 'Segundo a Constituição de 1988, o acesso à informação é direito de todos. Contudo, a gente vê que muitos idosos não conseguem usar os serviços digitais, onde tudo depende de aplicativo. Esse problema é muito importante e precisa de atenção.\n\nE concerteza a falta de cursos é uma coisa que piora a situação, pois os idosos ficam excluídos e os idosos perdem autonomia, já que os idosos dependem de terceiros.';

export default function RedacaoPage() {
  const taRef = useRef<HTMLTextAreaElement>(null), wrapRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme>(THEMES[0]), [used, setUsed] = useState<string[]>([THEMES[0].title]), [genTheme, setGenTheme] = useState(false), [generated, setGenerated] = useState(false);
  const [mode, setMode] = useState('FULL'), [text, setText] = useState(START);
  const [spans, setSpans] = useState<Span[]>([]), [comps, setComps] = useState<Comps | null>(null), [source, setSource] = useState<Analysis['source'] | null>(null);
  const [status, setStatus] = useState<Status>('idle'), [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null), [sel, setSel] = useState<number | null>(null);
  const [focused, setFocused] = useState(false), [lines, setLines] = useState(30), [versions, setVersions] = useState<Version[]>([]), [past, setPast] = useState<(number | null)[] | null>(null);
  const [toast, setToast] = useState('');
  const deb = useRef<ReturnType<typeof setTimeout>>(undefined), textRef = useRef(text), spansRef = useRef(spans);
  textRef.current = text; spansRef.current = spans;

  // POST /api/essays/analyze — o texto pode mudar durante a chamada: remapeia os destaques
  const runAnalysis = useCallback(async (t = textRef.current, m = mode, th = theme) => {
    setStatus('analyzing');
    try {
      const r = await api<Analysis>('/api/essays/analyze', { method: 'POST', json: { text: t, mode: m, theme: th } });
      const cur = textRef.current;
      setSpans(cur === t ? r.spans : mapSpans(r.spans, t, cur)); setComps(r.competencias); setSource(r.source); setStatus(cur === t ? 'ok' : 'typing');
    } catch { setStatus('error'); }
  }, [mode, theme]);

  useEffect(() => {
    runAnalysis();
    api<{ exam: { essayScores: (number | null)[] | null } | null }>('/api/me').then(m => setPast(m.exam?.essayScores ?? null)).catch(() => {});
    api<Version[]>('/api/essays').then(setVersions).catch(() => {});
    return () => clearTimeout(deb.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const t = taRef.current; if (!t) return;
    t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px';
    setLines(Math.max(30, Math.round((t.scrollHeight - 48) / 36)));
  }, [text]);

  const onText = (next: string) => {
    setSpans(mapSpans(spansRef.current, textRef.current, next)); setText(next); setStatus('typing'); setHover(null);
    clearTimeout(deb.current); deb.current = setTimeout(() => runAnalysis(next), 1500);
  };
  const onHover = (e: React.MouseEvent) => {
    const el = document.elementsFromPoint(e.clientX, e.clientY).find(n => (n as HTMLElement).dataset?.i !== undefined && (n as HTMLElement).dataset.i !== '-1') as HTMLElement | undefined;
    if (!el) return hover && setHover(null);
    const i = +el.dataset.i!, w = wrapRef.current!.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (hover?.i !== i) setHover({ i, x: Math.min(r.left - w.left, w.width - 300), y: r.bottom - w.top + 6 });
  };
  const focusSpan = (i: number) => { const t = taRef.current!, sp = spans[i]; t.focus(); t.setSelectionRange(sp.start, sp.end); setSel(i); };
  const apply = (i: number) => {
    const sp = spans[i]; if (sp?.replace == null) return;
    const rep = /^[A-ZÀ-Ú]/.test(text.slice(sp.start, sp.end)) ? sp.replace[0].toUpperCase() + sp.replace.slice(1) : sp.replace;
    onText(text.slice(0, sp.start) + rep + text.slice(sp.end)); setSel(null);
  };
  const newTheme = async () => {
    setGenTheme(true);
    try {
      const r = await api<{ theme: Theme; generated: boolean }>('/api/essays/theme', { method: 'POST', json: { used } });
      setTheme(r.theme); setGenerated(r.generated); setUsed(u => [...u, r.theme.title]); runAnalysis(textRef.current, mode, r.theme);
    } catch (e) { setToast((e as Error).message); }
    setGenTheme(false);
  };
  const saveVersion = async () => {
    if (!comps) return;
    const r = await api<{ version: Version; xp: { gained: number } }>('/api/essays', { method: 'POST', json: { themeTitle: theme.title, mode, text, comps } });
    setVersions(v => [r.version, ...v]); setToast(`Versão salva · +${r.xp.gained} XP`); setTimeout(() => setToast(''), 2600);
  };

  const segs: { t: string; i: number; sp?: Span }[] = []; let p = 0;
  spans.forEach((sp, i) => { if (sp.start > p) segs.push({ t: text.slice(p, sp.start), i: -1 }); segs.push({ t: text.slice(sp.start, sp.end), i, sp }); p = sp.end; });
  segs.push({ t: text.slice(p) + '​', i: -1 });
  const h = hover ? spans[hover.i] : null, c = comps ?? { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 };
  const total = Object.values(c).reduce((a, b) => a + b, 0), M = MODES[mode];
  const st = ({ idle: ['Pronto', 'var(--line)', 'none'], typing: ['Escrevendo… a correção roda após 1,5 s de pausa', 'var(--warn)', 'pulse 1.2s infinite'], analyzing: ['Analisando…', 'var(--color-accent)', 'pulse .8s infinite'], ok: [source === 'ia' ? 'Correção atualizada (Gemini)' : 'Correção atualizada (corretor local)', 'var(--ok)', 'none'], error: ['Não foi possível analisar agora. Tente de novo.', 'var(--color-accent)', 'none'] } as const)[status];
  const issues = spans.map((sp, i) => ({ sp, i })).sort((a, b) => ({ red: 0, yellow: 1, green: 2 })[a.sp.severity] - ({ red: 0, yellow: 1, green: 2 })[b.sp.severity]);

  return (
    <AppShell>
      <main className="page" style={{ maxWidth: 1440, display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
        <section style={{ flex: '3 1 640px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="tag tag-accent">Eixo · {theme.axis}</span><span className="text-muted" style={{ fontSize: 12 }}>{generated ? 'Tema inédito gerado pelo Gemini' : 'Tema de treino'}</span></span>
                <AnimatePresence mode="wait">
                  <motion.h3 key={genTheme ? 'gen' : theme.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: genTheme ? 0.45 : 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} style={{ margin: 0, fontSize: 22, textWrap: 'balance' }}>{genTheme ? 'Gerando tema inédito…' : theme.title}</motion.h3>
                </AnimatePresence>
              </div>
              <button className="btn btn-secondary" onClick={newTheme} disabled={genTheme}><Icon name="wand-sparkles" size={16} />{genTheme ? 'Gerando…' : 'Novo tema'}</button>
            </div>
            <details><summary style={{ cursor: 'pointer', fontSize: 13 }}>Textos motivadores</summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>{theme.texts.map(t => <li key={t}>{t}</li>)}</ul></details>
          </motion.div>

          <div role="tablist" aria-label="Modo de escrita" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(MODES).map(([k, v]) => {
              const on = mode === k;
              return (
                <button key={k} role="tab" aria-selected={on} onClick={() => { setMode(k); runAnalysis(text, k); }} className="chip" style={{ position: 'relative', borderColor: on ? 'var(--color-text)' : 'var(--line)', color: on ? 'var(--color-bg)' : 'inherit', zIndex: 0 }}>
                  {on && <motion.span layoutId="essay-mode" transition={spring} style={{ position: 'absolute', inset: -1.5, borderRadius: 99, background: 'var(--color-text)', zIndex: -1 }} />}{v.label}
                </button>
              );
            })}
          </div>

          <details open style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', padding: '12px 16px' }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="lightbulb" size={16} style={{ color: 'var(--warn)' }} />Modelo comentado e técnicas · {M.label}</summary>
            <AnimatePresence mode="wait">
              <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, paddingLeft: 12, borderLeft: '3px solid var(--warn)' }}>{M.model}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{M.tip.map((t, i) => <span key={t} style={{ display: 'inline-flex', gap: 6, fontSize: 12, padding: '6px 10px', borderRadius: 99, background: 'var(--color-surface)' }}><b style={{ color: 'var(--color-accent)' }}>{i + 1}</b>{t}</span>)}</div>
              </motion.div>
            </AnimatePresence>
          </details>

          <div ref={wrapRef} style={{ position: 'relative', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', backgroundImage: 'linear-gradient(to right,transparent 55px,color-mix(in srgb,var(--color-accent) 45%,transparent) 55px 56.5px,transparent 56.5px),repeating-linear-gradient(to bottom,transparent 0 35px,var(--line) 35px 36px)', backgroundPosition: '0 0,0 24px', backgroundSize: '100% 100%,100% 36px', backgroundRepeat: 'no-repeat,repeat-y', boxShadow: `0 0 0 1.5px ${focused ? 'var(--color-accent)' : 'transparent'}`, transition: 'box-shadow .2s' }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, padding: '24px 24px 24px 72px', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', font: '400 18px/36px var(--font-body)' }}>
              {segs.map((g, k) => g.sp ? (
                <span key={k} data-i={g.i} style={{ background: ['erro', 'meio', 'certo'].includes(g.sp.kind) ? BG[g.sp.severity] : hover?.i === g.i || sel === g.i ? 'color-mix(in srgb,var(--color-text) 8%,transparent)' : 'transparent', color: g.sp.kind === 'ortografia' ? 'var(--color-accent)' : 'inherit', textDecorationLine: DECO[g.sp.kind] ? 'underline' : 'none', textDecorationStyle: (DECO[g.sp.kind] ?? 'solid') as 'solid', textDecorationColor: DOT[g.sp.severity], textDecorationThickness: 1.5, textUnderlineOffset: 5, borderRadius: 3, boxShadow: hover?.i === g.i || sel === g.i ? `0 0 0 2px ${DOT[g.sp.severity]}` : 'none', transition: 'background .35s, box-shadow .2s' }}>{g.t}</span>
              ) : <span key={k} data-i={-1}>{g.t}</span>)}
            </div>
            <div aria-hidden style={{ position: 'absolute', left: 0, top: 24, width: 44, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', font: '400 12px/36px var(--font-body)', opacity: 0.4, pointerEvents: 'none' }} className="tnum">{Array.from({ length: lines }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
            <textarea ref={taRef} aria-label="Texto da redação" spellCheck={false} value={text} onChange={e => onText(e.target.value)} onMouseMove={onHover} onMouseLeave={() => setHover(null)}
              onSelect={e => { const pos = (e.target as HTMLTextAreaElement).selectionStart, i = spans.findIndex(s => pos >= s.start && pos <= s.end); setSel(i < 0 ? null : i); }}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              style={{ position: 'relative', display: 'block', width: '100%', minHeight: 1128, padding: '24px 24px 24px 72px', margin: 0, font: '400 18px/36px var(--font-body)', color: 'transparent', caretColor: 'var(--color-text)', background: 'transparent', border: 0, outline: 'none', resize: 'none', overflow: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }} />
            <AnimatePresence>
              {h && hover && (
                <motion.div role="tooltip" initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  style={{ position: 'absolute', left: Math.max(8, hover.x), top: hover.y, zIndex: 5, width: 'min(300px,80%)', padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--color-text)', color: 'var(--color-bg)', boxShadow: 'var(--shadow-lg)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: DOT[h.severity] }} />{KINDS[h.kind]}</span>
                  <span style={{ fontSize: 14, lineHeight: 1.45 }}>{h.explanation}</span>
                  {h.suggestion && <span style={{ fontSize: 13, opacity: 0.8 }}>{h.suggestion}</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
            <span className="text-muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }} role="status" aria-live="polite"><span style={{ width: 8, height: 8, borderRadius: '50%', background: st[1], animation: st[2] }} />{st[0]}</span>
            <span className="text-muted tnum">{countWords(text)} palavras · mínimo sugerido {M.min}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px 16px', flexWrap: 'wrap', fontSize: 12 }}>
            <span style={{ background: 'var(--hl-red)', padding: '1px 6px', borderRadius: 3 }}>erro</span><span style={{ background: 'var(--hl-yellow)', padding: '1px 6px', borderRadius: 3 }}>parcial</span><span style={{ background: 'var(--hl-green)', padding: '1px 6px', borderRadius: 3 }}>acerto</span>
            <span style={{ color: 'var(--color-accent)' }}>ortografia</span><span style={{ textDecoration: 'underline wavy var(--warn)', textUnderlineOffset: 4 }}>sinônimo</span><span style={{ textDecoration: 'underline dotted var(--warn)', textDecorationThickness: 2, textUnderlineOffset: 4 }}>repetição</span><span style={{ textDecoration: 'underline double var(--warn)', textUnderlineOffset: 4 }}>coesão / sentido</span>
          </div>
        </section>

        <motion.aside initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease }} style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', position: 'sticky', top: 16 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h5>Competências</h5>
              <span className="tnum"><strong style={{ fontSize: 28, fontFamily: 'var(--font-heading)' }}><Counter value={total} /></strong><span className="text-muted" style={{ fontSize: 13 }}> / 1000</span></span></div>
            {NAMES.map((n, i) => {
              const v = c[`c${i + 1}` as keyof Comps], pv = past?.[i], d = pv == null ? null : v - pv;
              return (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}><span><strong>C{i + 1}</strong> <span className="text-muted">{n}</span></span>
                    <span className="tnum" style={{ display: 'flex', gap: 6 }}><strong>{v}</strong>{d != null && <span style={{ color: d >= 0 ? 'var(--ok)' : 'var(--warn)', fontWeight: 600 }}>{d >= 0 ? '+' : ''}{d}</span>}</span></div>
                  <div style={{ position: 'relative', height: 8, borderRadius: 8, background: 'var(--line)' }}>
                    <motion.div animate={{ width: `${(v / 200) * 100}%`, background: v >= 160 ? 'var(--ok)' : v >= 80 ? 'var(--warn)' : 'var(--color-accent)' }} transition={{ duration: 0.6, ease }} style={{ height: '100%', borderRadius: 8 }} />
                    {pv != null && <span title="Nota anterior" style={{ position: 'absolute', top: -3, left: `${(pv / 200) * 100}%`, width: 2, height: 14, background: 'var(--color-text)', opacity: 0.6 }} />}
                  </div>
                </div>
              );
            })}
            {past && <span className="text-muted" style={{ fontSize: 11 }}>Traço = sua nota anterior informada no cadastro.</span>}
            <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary" onClick={saveVersion} disabled={!comps} style={{ minHeight: 44, justifyContent: 'space-between' }}>Salvar versão<Icon name="save" size={16} /></motion.button>
            <AnimatePresence initial={false}>
              {versions.slice(0, 5).map((v, k) => {
                const prev = versions[k + 1], d = prev ? v.total - prev.total : null;
                return (
                  <motion.div layout key={v.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', fontSize: 13 }}>
                    <span style={{ display: 'flex', flexDirection: 'column' }}><strong>Versão {versions.length - k}</strong><span className="text-muted" style={{ fontSize: 11 }}>{new Date(v.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {v.words} palavras</span></span>
                    <span className="tnum"><strong>{v.total}</strong> <span style={{ color: d == null ? 'inherit' : d >= 0 ? 'var(--ok)' : 'var(--warn)', fontSize: 12 }}>{d == null ? 'primeira' : `${d >= 0 ? '+' : ''}${d}`}</span></span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h5 style={{ margin: 0 }}>Apontamentos</h5>
              <span className="text-muted" style={{ fontSize: 12 }}>{spans.filter(x => x.severity !== 'green').length} a revisar · {spans.filter(x => x.severity === 'green').length} acertos</span></div>
            <Stagger key={spans.length} style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 440, overflow: 'auto', padding: 2 }} delay={0.03}>
              {issues.map(({ sp, i }) => (
                <motion.div variants={item} layout key={`${sp.start}-${sp.kind}`} role="button" tabIndex={0} onClick={() => focusSpan(i)} onKeyDown={e => e.key === 'Enter' && focusSpan(i)}
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${sel === i ? DOT[sp.severity] : 'var(--line)'}`, background: sel === i ? 'var(--color-surface)' : 'transparent', transition: 'all .2s' }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: DOT[sp.severity], flex: 'none' }} />{KINDS[sp.kind]}
                    <span className="text-muted" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{text.slice(sp.start, sp.end).slice(0, 40)}”</span></span>
                  <span style={{ fontSize: 13, lineHeight: 1.45 }}>{sp.explanation}</span>
                  {sp.suggestion && <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><span className="text-muted" style={{ fontSize: 12 }}>{sp.suggestion}</span>
                    {sp.replace != null && <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); apply(i); }} style={{ fontSize: 12, minHeight: 32 }}>Aplicar</button>}</span>}
                </motion.div>
              ))}
            </Stagger>
          </div>
        </motion.aside>
      </main>
      <Toast message={toast} />
    </AppShell>
  );
}
