'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppShell, api } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { Counter, ease, item, spring, Stagger, Toast } from '@/components/motion';
import { countWords, KINDS, mapSpans, MODES, TEMPLATES, THEMES, type Analysis, type Comps, type Span, type Theme } from '@/lib/essay';

interface Version { id: string; total: number; words: number; at: string; themeTitle: string; text: string; mode: string; theme?: Theme }
type Status = 'idle' | 'typing' | 'analyzing' | 'ok' | 'error';
const BG = { red: 'var(--hl-red)', yellow: 'var(--hl-yellow)', green: 'var(--hl-green)' } as const;
const DOT = { red: 'var(--color-accent)', yellow: 'var(--warn)', green: 'var(--ok)' } as const;
const DECO: Partial<Record<Span['kind'], string>> = { sinonimo: 'wavy', repeticao: 'dotted', coesao: 'double', sentido: 'double' };
const NAMES = ['Norma culta', 'Compreensão do tema', 'Argumentação', 'Coesão', 'Proposta de intervenção'];
const START = 'Segundo a Constituição de 1988, o acesso à informação é direito de todos. Contudo, a gente vê que muitos idosos não conseguem usar os serviços digitais, onde tudo depende de aplicativo. Esse problema é muito importante e precisa de atenção.\n\nE concerteza a falta de cursos é uma coisa que piora a situação, pois os idosos ficam excluídos e os idosos perdem autonomia, já que os idosos dependem de terceiros.';
const ROMAN = ['I', 'II', 'III', 'IV'];
const kindOf = (l: string) => /repert/i.test(l) ? 'repertorio' : /agente|ação|acao|meio|finalidade|detalh|proposta/i.test(l) ? 'proposta' : 'argumentos';

export default function RedacaoPage() {
  const taRef = useRef<HTMLTextAreaElement>(null), wrapRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme>(THEMES[0]), [used, setUsed] = useState<string[]>([THEMES[0].title]), [genTheme, setGenTheme] = useState(false), [generated, setGenerated] = useState(false);
  const [mode, setMode] = useState('FULL'), [text, setText] = useState(START);
  const [spans, setSpans] = useState<Span[]>([]), [comps, setComps] = useState<Comps | null>(null), [source, setSource] = useState<Analysis['source'] | null>(null);
  const [status, setStatus] = useState<Status>('idle'), [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null), [sel, setSel] = useState<number | null>(null);
  const [focused, setFocused] = useState(false), [lines, setLines] = useState(30), [versions, setVersions] = useState<Version[]>([]), [past, setPast] = useState<(number | null)[] | null>(null);
  const [toast, setToast] = useState('');
  const [sheet, setSheet] = useState(false);
  const [essayId, setEssayId] = useState<string | null>(null);
  const [sugs, setSugs] = useState<string[]>([]), [busyAI, setBusyAI] = useState(false), [fill, setFill] = useState<string | null>(null);
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
    api<{ exam: { essayScores: (number | null)[] | null } | null }>('/api/me').then(m => setPast(m.exam?.essayScores ?? null)).catch(() => { });
    api<Version[]>('/api/essays').then(setVersions).catch(() => { });
    return () => clearTimeout(deb.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const t = taRef.current; if (!t) return;
    t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px';
    setLines(Math.max(10, Math.round((t.scrollHeight - 48) / 36)));
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
    try {
      const r = await api<{ version: Version; xp?: { gained: number } }>('/api/essays', { method: 'POST', json: { id: essayId ?? undefined, themeTitle: theme.title, theme, mode, text, comps } });
      if (essayId) setVersions(v => v.map(x => x.id === essayId ? r.version : x));
      else { setVersions(v => [r.version, ...v]); setEssayId(r.version.id); }
      setToast(essayId ? 'Redação atualizada' : `Redação salva · +${r.xp?.gained ?? 0} XP`); setTimeout(() => setToast(''), 2600);
    } catch (e) { setToast((e as Error).message); }
  };
  const openEssay = (v: Version) => {
    const th = v.theme ?? THEMES.find(t => t.title === v.themeTitle) ?? theme;
    setEssayId(v.id); setMode(v.mode); setTheme(th); setText(v.text); setSpans([]); setSugs([]); setFill(null);
    runAnalysis(v.text, v.mode, th);
  };

  const newEssay = () => { setEssayId(null); setSugs([]); setFill(null); onText(''); };
  const useTemplate = () => {
    if (text.trim() && !confirm('Substituir o texto atual pelo modelo?')) return;
    setEssayId(null); setSugs([]); setFill(null); onText(TEMPLATES[mode]);
  };

  const ask = async (kind: string, label?: string) => {
    setBusyAI(true); setSugs([]);
    try {
      const r = await api<{ items: string[] }>('/api/essays/assist', { method: 'POST', json: { kind, label, text, theme: { axis: theme.axis, title: theme.title, texts: theme.texts } } });
      setSugs(r.items);
    } catch (e) { setToast((e as Error).message); setTimeout(() => setToast(''), 3000); }
    setBusyAI(false);
  };
  const gaps = [...text.matchAll(/\[[^\]]+\]/g)].map(m => ({ start: m.index!, end: m.index! + m[0].length, label: m[0].slice(1, -1) }));
  const startFill = (label: string) => { setFill(label); ask(kindOf(label), label); };
  const writeGap = () => { const g = gaps.find(x => x.label === fill); if (g) { taRef.current!.focus(); taRef.current!.setSelectionRange(g.start, g.end); } };
  const useSug = (s: string) => {
    const g = fill != null ? gaps.find(x => x.label === fill) : null;
    if (g) { onText(text.slice(0, g.start) + s + text.slice(g.end)); setFill(null); setSugs([]); return; }
    const t = taRef.current!;
    onText(text.slice(0, t.selectionStart) + s + text.slice(t.selectionEnd));
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
      <main className="page redacao-main" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        <style>{`
main.redacao-main{max-width:none;padding-inline:clamp(8px,2vw,32px)}
.redacao-paper{--ml:72px;border-radius:var(--radius-lg);background-color:var(--color-surface);background-image:linear-gradient(to right,transparent calc(var(--ml) - 17px),color-mix(in srgb,var(--color-accent) 45%,transparent) calc(var(--ml) - 17px) calc(var(--ml) - 15.5px),transparent calc(var(--ml) - 15.5px)),repeating-linear-gradient(to bottom,transparent 0 35px,var(--line) 35px 36px);background-position:0 0,0 24px;background-size:100% 100%,100% 36px;background-repeat:no-repeat,repeat-y}
.redacao-text{padding:24px 16px 24px var(--ml);font:400 18px/36px var(--font-body)}
.redacao-nums{width:calc(var(--ml) - 28px)}
.redacao-aside{position:sticky;top:16px}
.redacao-head{display:none}
@media(max-width:900px){
 main.redacao-main{padding-bottom:96px}
 .redacao-aside{position:fixed!important;left:0;right:0;bottom:0;top:auto!important;z-index:30;flex:none!important;background:var(--color-bg);border-top:1px solid var(--line);box-shadow:var(--shadow-lg);border-radius:16px 16px 0 0;padding:8px 12px calc(8px + env(safe-area-inset-bottom));max-height:60vh;overflow:auto}
 .redacao-head{display:flex}
 .redacao-aside:not(.open) .redacao-body{display:none}
}
@media(max-width:600px){
 .redacao-paper{--ml:44px}
 .redacao-text{font-size:16px;padding-right:10px}
}
        `}</style>

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
            <details open><summary style={{ cursor: 'pointer', fontSize: 13 }}>Textos motivadores</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {theme.texts.map((t, i) => (
                  <figure key={t} style={{ margin: 0, padding: '10px 12px', borderLeft: '3px solid var(--color-accent)', background: 'var(--color-bg)', borderRadius: '0 var(--radius-md) var(--radius-md) 0', fontSize: 14, lineHeight: 1.55 }}>
                    <strong style={{ display: 'block', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 2 }}>Texto {ROMAN[i]}</strong>{t}
                  </figure>
                ))}
                <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>Com base na leitura dos textos motivadores e nos seus conhecimentos, redija um texto dissertativo-argumentativo sobre o tema, com proposta de intervenção que respeite os direitos humanos.</p>
              </div>
            </details>
          </motion.div>

          <div role="tablist" aria-label="Modo de escrita" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <div className="card" style={{ gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={useTemplate}><Icon name="file-text" size={16} />Usar modelo</button>
                <button className="btn btn-secondary" disabled={busyAI} onClick={() => { setFill(null); ask('argumentos'); }}><Icon name="wand-sparkles" size={16} />Argumentos</button>
                <button className="btn btn-secondary" disabled={busyAI} onClick={() => { setFill(null); ask('proposta'); }}><Icon name="wand-sparkles" size={16} />Proposta</button>
                <button className="btn btn-secondary" disabled={busyAI} onClick={() => { setFill(null); ask('repertorio'); }}><Icon name="wand-sparkles" size={16} />Repertório</button>
                <button className="btn btn-ghost" onClick={newEssay}>Nova redação</button>
              </div>
              {gaps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>Lacunas do modelo: toque para preencher com sugestões</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {gaps.map((g, i) => <button key={i} className="chip" aria-pressed={fill === g.label} onClick={() => startFill(g.label)}>[{g.label}]</button>)}
                  </div>
                  {fill && <button className="btn btn-ghost" onClick={writeGap} style={{ alignSelf: 'flex-start', fontSize: 12, minHeight: 36 }}>Escrever eu mesmo</button>}
                </div>
              )}
              {busyAI && <p role="status" className="text-muted" style={{ margin: 0, fontSize: 13 }}>Gerando com o Gemini…</p>}
              {sugs.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', fontSize: 14, lineHeight: 1.45 }}>
                  <span>{s}</span>
                  <button className="btn btn-ghost" onClick={() => useSug(s)} style={{ fontSize: 12, minHeight: 36, flex: 'none' }}>{fill ? 'Preencher' : 'Inserir'}</button>
                </div>
              ))}
            </div>
          </div>

          <details open style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', padding: '12px 16px' }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="lightbulb" size={16} style={{ color: 'var(--warn)' }} />Modelo comentado e técnicas · {M.label}</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflow: 'auto' }}>
              <AnimatePresence initial={false}>
                {versions.map(v => (
                  <motion.div layout key={v.id} role="button" tabIndex={0} onClick={() => openEssay(v)} onKeyDown={e => e.key === 'Enter' && openEssay(v)} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', fontSize: 13, border: `1.5px solid ${essayId === v.id ? 'var(--color-accent)' : 'transparent'}` }}>
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.themeTitle}</strong>
                      <span className="text-muted" style={{ fontSize: 11 }}>{new Date(v.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {v.words} palavras · toque para abrir</span>
                    </span>
                    <strong className="tnum">{v.total}</strong>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </details>

          <div ref={wrapRef} className="redacao-paper" style={{ position: 'relative', boxShadow: `0 0 0 1.5px ${focused ? 'var(--color-accent)' : 'transparent'}`, transition: 'box-shadow .2s' }}>
            <div aria-hidden className="redacao-text" style={{ position: 'absolute', inset: 0, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
              {segs.map((g, k) => g.sp ? (
                <span key={k} data-i={g.i} style={{ background: ['erro', 'meio', 'certo'].includes(g.sp.kind) ? BG[g.sp.severity] : hover?.i === g.i || sel === g.i ? 'color-mix(in srgb,var(--color-text) 8%,transparent)' : 'transparent', color: g.sp.kind === 'ortografia' ? 'var(--color-accent)' : 'inherit', textDecorationLine: DECO[g.sp.kind] ? 'underline' : 'none', textDecorationStyle: (DECO[g.sp.kind] ?? 'solid') as 'solid', textDecorationColor: DOT[g.sp.severity], textDecorationThickness: 1.5, textUnderlineOffset: 5, borderRadius: 3, boxShadow: hover?.i === g.i || sel === g.i ? `0 0 0 2px ${DOT[g.sp.severity]}` : 'none', transition: 'background .35s, box-shadow .2s' }}>{g.t}</span>
              ) : <span key={k} data-i={-1}>{g.t}</span>)}
            </div>
            <div aria-hidden className="tnum redacao-nums" style={{ position: 'absolute', left: 0, top: 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', font: '400 12px/36px var(--font-body)', opacity: 0.4, pointerEvents: 'none' }}>{Array.from({ length: lines }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
            <textarea ref={taRef} className="redacao-text" aria-label="Texto da redação" spellCheck={false} value={text} onChange={e => onText(e.target.value)} onMouseMove={onHover} onMouseLeave={() => setHover(null)}
              onSelect={e => { const pos = (e.target as HTMLTextAreaElement).selectionStart, i = spans.findIndex(s => pos >= s.start && pos <= s.end); setSel(i < 0 ? null : i); }}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              style={{ position: 'relative', display: 'block', width: '100%', minHeight: 'max(360px, 60vh)', margin: 0, color: 'transparent', caretColor: 'var(--color-text)', background: 'transparent', border: 0, outline: 'none', resize: 'none', overflow: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', boxSizing: 'border-box' }} />
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

        <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease }} className={`redacao-aside${sheet ? ' open' : ''}`} style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div role="button" tabIndex={0} className="redacao-head" aria-expanded={sheet} onClick={() => setSheet(!sheet)} onKeyDown={e => e.key === 'Enter' && setSheet(!sheet)} style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 44, cursor: 'pointer' }}>
            <span className="tnum"><strong style={{ fontSize: 22, fontFamily: 'var(--font-heading)' }}>{total}</strong><span className="text-muted" style={{ fontSize: 12 }}> / 1000</span></span>
            <span className="text-muted" style={{ fontSize: 12 }}>{spans.filter(x => x.severity !== 'green').length} a revisar</span>
            <span aria-hidden>{sheet ? '▾' : '▴'}</span>
          </div>
          {!sheet && sel != null && spans[sel] && (
            <div className="redacao-head" style={{ flexDirection: 'column', gap: 4, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontSize: 13, lineHeight: 1.4 }}>
              <span><strong>{KINDS[spans[sel].kind]}:</strong> {spans[sel].explanation}</span>
              {spans[sel].replace != null && <button className="btn btn-ghost" onClick={() => apply(sel)} style={{ fontSize: 12, minHeight: 36, alignSelf: 'flex-start' }}>Aplicar: {spans[sel].suggestion}</button>}
            </div>
          )}
          <div className="redacao-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
              <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 440, overflow: 'auto', padding: 2 }} delay={0.03}>
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
          </div>
        </motion.aside>
      </main>
      <Toast message={toast} />
    </AppShell>
  );
}