'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { AppShell, api } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { Counter, Dialog, ease, item, spring, Stagger, Tabs } from '@/components/motion';
import { isoDay, XP } from '@/lib/game';
import * as O from '@/lib/offline';
import { OptionBody, QuestionBody } from '@/components/Question';

interface Game {
  xp: number; questions: number; reviews: number; essays: number; s: { streak: number; freezes: number }; days: Record<string, 'study' | 'freeze'>;
  level: { level: number; to: number; pct: number }; week: { q: number; r: number; e: number };
  badges: { code: string; name: string; rule: string; icon: string; ok: boolean }[];
}
type Log = { t: string; kind: 'ok' | 'warn' | 'err' | 'info'; at: string };

export default function ProgressoPage() {
  const [tab, setTab] = useState<'game' | 'off'>('game');
  const [g, setG] = useState<Game | null>(null), [levelUp, setLevelUp] = useState(false);
  const prevLevel = useRef<number | null>(null);
  // offline
  const [navOnline, setNavOnline] = useState(true), [simOffline, setSimOffline] = useState(false);
  const [pack, setPack] = useState<O.Pack | null>(null), [outbox, setOutbox] = useState<O.OutboxItem[]>([]), [log, setLog] = useState<Log[]>([]);
  const [syncing, setSyncing] = useState(false), [sw, setSw] = useState('verificando…'), [pi, setPi] = useState(0), [picked, setPicked] = useState<string | null>(null);
  const online = navOnline && !simOffline;
  const onlineRef = useRef(online); onlineRef.current = online;

  const loadGame = useCallback(() => api<Game>('/api/game').then(x => {
    if (prevLevel.current != null && x.level.level > prevLevel.current) setLevelUp(true);
    prevLevel.current = x.level.level; setG(x);
  }).catch(() => {}), []);
  const addLog = (t: string, kind: Log['kind'] = 'info') => setLog(l => [{ t, kind, at: new Date().toLocaleTimeString('pt-BR') }, ...l].slice(0, 12));

  const sync = useCallback(async () => {
    if (syncing || !onlineRef.current) return;
    setSyncing(true);
    try {
      const out = await O.getOutbox(), v = (await O.getPack())?.version ?? 0;
      if (out.length) {
        addLog(`POST /api/offline/sync · ${out.length} ${out.length === 1 ? 'resposta' : 'respostas'}`);
        const r = await api<{ accepted: number; conflicts: number }>('/api/offline/sync', { method: 'POST', json: { items: out.map(({ questionId, chosen, createdAt }) => ({ questionId, chosen, createdAt })) } });
        addLog(`${r.accepted} aceitas${r.conflicts ? ` · ${r.conflicts} conflito(s) resolvido(s) por createdAt` : ''}`, 'ok');
        await O.clearOutbox(); setOutbox([]); loadGame();
      }
      if (v) { await O.deletePack(); addLog(`Pacote v${v} apagado`); }
      addLog(`GET /api/offline/pack?since=${v}`);
      const p = await api<O.Pack>(`/api/offline/pack?since=${v}`);
      await O.putPack(p); setPack(p); setPi(0); setPicked(null);
      // baixa as figuras agora para o service worker guardar (estudo sem conexão)
      const imgs = O.packImages(p);
      await Promise.allSettled(imgs.map(id => fetch(`/api/images/${id}`)));
      if (imgs.length) addLog(`${imgs.length} imagens guardadas para uso offline`, 'ok');
      addLog(`Pacote v${p.version} salvo · ${p.questions.length} questões`, 'ok');
    } catch { addLog('Falha na sincronização. Tentaremos de novo ao reconectar.', 'err'); }
    setSyncing(false);
  }, [syncing, loadGame]);

  useEffect(() => {
    loadGame();
    setNavOnline(navigator.onLine);
    const on = () => setNavOnline(true), off = () => setNavOnline(false);
    addEventListener('online', on); addEventListener('offline', off);
    navigator.serviceWorker?.register('/sw.js').then(() => setSw('ativo')).catch(() => setSw('indisponível'));
    Promise.all([O.getPack(), O.getOutbox()]).then(([p, out]) => { setPack(p ?? null); setOutbox(out); }).catch(() => setSw(s => s + ' · IndexedDB indisponível'));
    return () => { removeEventListener('online', on); removeEventListener('offline', off); };
  }, [loadGame]);

  // Ao voltar a conexão, sincroniza a outbox e renova o pacote
  const wasOnline = useRef(online);
  useEffect(() => {
    if (!wasOnline.current && online) { addLog('Conexão restabelecida', 'ok'); sync(); }
    if (wasOnline.current && !online) addLog('Sem conexão', 'warn');
    wasOnline.current = online;
  }, [online, sync]);
  useEffect(() => { if (tab === 'off' && pack === null && online && sw !== 'verificando…') sync(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = pack?.questions.length ? pack.questions[pi % pack.questions.length] : null;
  const answer = async (k: string) => {
    if (!q || picked) return;
    setPicked(k);
    const it: O.OutboxItem = { questionId: q.id, number: q.number, chosen: k, correct: k === q.answer, createdAt: Date.now() };
    if (!online) { await O.addOutbox(it); setOutbox(await O.getOutbox()); addLog(`Resposta da questão ${q.number} guardada na outbox`); return; }
    try { await api('/api/offline/sync', { method: 'POST', json: { items: [it] } }); addLog(`Questão ${q.number} registrada`, 'ok'); loadGame(); }
    catch { await O.addOutbox(it); setOutbox(await O.getOutbox()); addLog('Servidor indisponível · resposta na outbox', 'warn'); }
  };

  const today = isoDay();
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  return (
    <AppShell extra={
      <motion.span layout title={online ? 'Conectado' : 'Respostas ficam salvas no aparelho'} animate={{ background: online ? 'var(--ok-100)' : 'var(--warn-100)', color: online ? 'var(--ok)' : 'var(--warn)' }}
        style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />{online ? 'Online' : 'Offline'}
      </motion.span>}>
      <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', padding: '0 var(--space-4) var(--space-4)' }}>
        <Tabs label="Seções" value={tab} onChange={setTab} tabs={[{ v: 'game', label: 'Progresso', icon: <Icon name="trophy" size={16} /> }, { v: 'off', label: 'Offline', icon: <Icon name="cloud-off" size={16} />, badge: outbox.length }]} />
      </div>
      <AnimatePresence mode="wait">
        {tab === 'game' && g && (
          <Stagger as="main" key="game" className="page grid-flow" style={{ maxWidth: 960 }}>
            <motion.section variants={item} className="card" style={{ flex: '2 1 460px', flexDirection: 'row', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap', padding: 'var(--space-6)' }}>
              <div style={{ position: 'relative', width: 132, height: 132, flex: 'none' }}>
                <svg viewBox="0 0 132 132" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx={66} cy={66} r={60} fill="none" stroke="var(--line)" strokeWidth={10} />
                  <motion.circle cx={66} cy={66} r={60} fill="none" stroke="var(--color-accent)" strokeWidth={10} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: g.level.pct }} transition={{ duration: 1.2, ease }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}><span className="text-muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' }}>nível</span><strong style={{ font: '700 44px/1 var(--font-heading)' }}>{g.level.level}</strong></span>
                </div>
              </div>
              <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                <div><strong className="tnum" style={{ fontSize: 30, lineHeight: 1.1 }}><Counter value={g.xp} /> XP</strong><div className="text-muted" style={{ fontSize: 13 }}>{g.level.to - g.xp} XP para o nível {g.level.level + 1}</div></div>
                <div className="bar" style={{ height: 10 }}><motion.div initial={{ width: 0 }} animate={{ width: `${g.level.pct * 100}%` }} transition={{ duration: 0.8, ease }} style={{ background: 'var(--color-accent)' }} /></div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="flame" size={22} style={{ color: 'var(--color-accent)', animation: g.s.streak ? 'flicker 1.6s ease-in-out infinite' : 'none' }} /><strong>{g.s.streak}</strong> dias seguidos</span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }} title="Congelamentos protegem a sequência quando você perde um dia. Renovam todo mês.">
                    {[0, 1].map(i => <Icon key={i} name="snowflake" style={{ color: 'var(--ice)', opacity: i < g.s.freezes ? 1 : 0.25 }} />)}<span className="text-muted">{g.s.freezes}/2 congelamentos</span>
                  </span>
                </div>
              </div>
            </motion.section>
            <motion.section variants={item} className="card" style={{ flex: '1 1 260px' }}>
              <h5>XP vem do esforço</h5>
              {([['/questoes', 'Responder questão', 'circle-help', XP.question], ['/painel', 'Fazer revisão', 'rotate-ccw', XP.review], ['/redacao', 'Salvar redação', 'pen-line', XP.essay]] as const).map(([href, l, ic, xp]) => (
                <motion.div key={href} whileHover={{ x: 4 }}><Link href={href} className="btn btn-secondary" style={{ minHeight: 48, borderRadius: 'var(--radius-md)', justifyContent: 'space-between', width: '100%' }}><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name={ic} style={{ color: 'var(--color-accent)' }} />{l}</span><span style={{ color: 'var(--color-accent)' }}>+{xp}</span></Link></motion.div>
              ))}
              <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>Errar nunca tira XP. Não existe ranking público: o progresso é só seu.</p>
            </motion.section>
            <motion.section variants={item} className="card" style={{ flex: '1 1 100%' }}>
              <h5>Esta semana</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 8 }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(monday); d.setDate(monday.getDate() + i);
                  const k = isoDay(d), st = g.days[k], isToday = k === today;
                  return (
                    <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span className="text-muted">{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}</span>
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: i * 0.05 }} title={st === 'freeze' ? 'Congelamento usado' : st ? 'Estudou' : k > today ? '' : 'Sem estudo'}
                        style={{ display: 'grid', placeItems: 'center', width: '100%', maxWidth: 44, aspectRatio: 1, borderRadius: '50%', background: st === 'study' ? 'var(--color-accent)' : st === 'freeze' ? 'var(--ice-100)' : 'var(--color-bg)', color: st === 'study' ? '#fff' : st === 'freeze' ? 'var(--ice)' : 'inherit', boxShadow: isToday ? '0 0 0 2px var(--color-text)' : 'none' }}>
                        <Icon name={st === 'freeze' ? 'snowflake' : st === 'study' ? 'flame' : 'circle'} style={{ opacity: st ? 1 : 0.2 }} />
                      </motion.span>
                    </div>
                  );
                })}
              </div>
            </motion.section>
            <motion.section variants={item} className="card" style={{ flex: '1 1 300px' }}>
              <h5>Metas da semana</h5>
              {([['Questões', g.week.q, 60, 'var(--color-accent)'], ['Revisões', g.week.r, 15, 'var(--ice)'], ['Redações', g.week.e, 1, 'var(--warn)']] as const).map(([l, v, t, color]) => (
                <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ display: 'flex', gap: 6 }}>{l}{v >= t && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} style={{ color: 'var(--ok)', fontWeight: 800 }}>✓</motion.span>}</span><span className="text-muted tnum">{Math.min(v, t)}/{t}</span></span>
                  <div className="bar"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (v / t) * 100)}%` }} transition={{ duration: 0.6, ease }} style={{ background: v >= t ? 'var(--ok)' : color }} /></div>
                </div>
              ))}
            </motion.section>
            <motion.section variants={item} className="card" style={{ flex: '2 1 460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h5>Conquistas</h5><span className="text-muted" style={{ fontSize: 12 }}>{g.badges.filter(b => b.ok).length} de {g.badges.length}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
                {g.badges.map((b, i) => (
                  <motion.div key={b.code} title={b.rule} initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: b.ok ? 1 : 0.5, rotateY: 0 }} transition={{ delay: 0.2 + i * 0.06, ...spring }} whileHover={b.ok ? { y: -4 } : undefined}
                    style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, borderRadius: 'var(--radius-md)', background: b.ok ? 'var(--color-bg)' : 'transparent' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: b.ok ? 'var(--color-accent)' : 'var(--line)', color: b.ok ? '#fff' : 'inherit' }}><Icon name={b.icon} size={20} /></span>
                    <strong style={{ fontSize: 13, lineHeight: 1.25 }}>{b.name}</strong><span className="text-muted" style={{ fontSize: 11 }}>{b.rule}</span>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </Stagger>
        )}

        {tab === 'off' && (
          <Stagger as="main" key="off" className="page grid-flow" style={{ maxWidth: 960 }}>
            <motion.section variants={item} className="card" animate={{ background: online ? 'var(--ok-100)' : 'var(--warn-100)' }} style={{ flex: '1 1 100%', flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 16, background: 'var(--color-bg)', color: online ? 'var(--ok)' : 'var(--warn)', flex: 'none' }}><Icon name={online ? 'wifi' : 'wifi-off'} size={26} /></span>
              <div style={{ flex: '1 1 240px' }}><strong style={{ fontSize: 18 }}>{online ? 'Conectado' : 'Você está offline'}</strong><div style={{ fontSize: 14, opacity: 0.8 }}>{online ? 'Respostas vão direto para o servidor e o pacote fica atualizado.' : 'Continue estudando. As respostas ficam no aparelho e sincronizam quando a conexão voltar.'}</div></div>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', fontSize: 14, minHeight: 44 }}>
                <span>Simular sem conexão</span>
                <input type="checkbox" role="switch" checked={simOffline} onChange={() => setSimOffline(!simOffline)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                <span aria-hidden style={{ position: 'relative', width: 48, height: 28, borderRadius: 99, background: simOffline ? 'var(--warn)' : 'var(--line)', transition: 'background .25s' }}>
                  <motion.span animate={{ left: simOffline ? 23 : 3 }} transition={spring} style={{ position: 'absolute', top: 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-sm)' }} />
                </span>
              </label>
            </motion.section>
            <motion.section variants={item} className="card" style={{ flex: '1 1 300px' }}>
              <h5>Pacote no aparelho</h5>
              {[['Versão', pack ? `v${pack.version}` : '—'], ['Questões', pack ? pack.questions.length : '—'], ['Tamanho', pack ? `${(pack.bytes / 1024).toFixed(1).replace('.', ',')} KB` : '—'], ['Baixado', pack ? new Date(pack.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'], ['Service Worker', sw]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--line)' }}><span className="text-muted">{k}</span><strong className="tnum">{v}</strong></div>
              ))}
              <button className="btn btn-secondary" onClick={sync} disabled={syncing || !online} style={{ minHeight: 44, justifyContent: 'space-between' }}>{syncing ? 'Sincronizando…' : online ? 'Sincronizar agora' : 'Aguardando conexão'}
                <motion.span animate={{ rotate: syncing ? 360 : 0 }} transition={syncing ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : { duration: 0 }} style={{ display: 'grid' }}><Icon name="refresh-cw" size={16} /></motion.span></button>
            </motion.section>
            <motion.section variants={item} className="card" style={{ flex: '2 1 420px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><h5>Praticar do pacote</h5><span className="tag tag-neutral">{q?.subject ?? '—'}</span></div>
              {!q ? <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>{online ? 'Baixando pacote…' : 'Nenhum pacote salvo. Conecte-se para baixar.'}</p> : (
                <AnimatePresence mode="wait">
                  <motion.div key={q.id + pi} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ maxHeight: 340, overflow: 'auto' }}><QuestionBody q={q} original={false} size={15} /></div>
                    {q.options.map(o => {
                      const done = !!picked, right = done && o.k === q.answer, wrong = done && o.k === picked && !right;
                      return (
                        <button key={o.k} onClick={() => answer(o.k)} disabled={done} style={{ all: 'unset', boxSizing: 'border-box', cursor: done ? 'default' : 'pointer', display: 'flex', gap: 12, alignItems: 'center', minHeight: 48, padding: '6px 12px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${right ? 'var(--ok)' : wrong ? 'var(--color-accent)' : 'var(--line)'}`, background: right ? 'var(--ok-100)' : 'transparent', transition: 'all .25s' }}>
                          <span style={{ display: 'grid', placeItems: 'center', flex: 'none', width: 28, height: 28, borderRadius: '50%', fontWeight: 800, fontSize: 12, background: right ? 'var(--ok)' : wrong ? 'var(--color-accent)' : 'var(--color-bg)', color: right || wrong ? '#fff' : 'inherit' }}>{o.k}</span><OptionBody o={o} size={14} />
                        </button>
                      );
                    })}
                    {picked && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: picked === q.answer ? 'var(--ok)' : 'inherit' }}>{picked === q.answer ? `Acertou! +${XP.question} XP` : `+${XP.question} XP pelo esforço. A correta é ${q.answer}.`}</span>
                      <button className="btn btn-primary" onClick={() => { setPi(pi + 1); setPicked(null); }}>Próxima →</button></motion.div>}
                  </motion.div>
                </AnimatePresence>
              )}
            </motion.section>
            <motion.section variants={item} className="card" style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h5>Outbox</h5><span className="text-muted" style={{ fontSize: 12 }}>{outbox.length} pendente{outbox.length === 1 ? '' : 's'}</span></div>
              {!outbox.length && <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Nada pendente. Respostas dadas sem conexão aparecem aqui até sincronizar.</p>}
              <AnimatePresence>{outbox.map(o => <motion.div layout key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--warn-100)' }}><span>Questão {o.number} · marcou {o.chosen}</span><span className="text-muted tnum">{new Date(o.createdAt).toLocaleTimeString('pt-BR')}</span></motion.div>)}</AnimatePresence>
            </motion.section>
            <motion.section variants={item} className="card" style={{ flex: '2 1 420px', gap: 8 }}>
              <h5>Registro de sincronização</h5>
              <AnimatePresence initial={false}>{log.map(l => (
                <motion.div layout key={l.at + l.t} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'grid', gridTemplateColumns: '10px 64px minmax(0,1fr)', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: { ok: 'var(--ok)', warn: 'var(--warn)', err: 'var(--color-accent)', info: 'var(--line)' }[l.kind] }} />
                  <span className="text-muted tnum" style={{ fontSize: 12 }}>{l.at}</span><span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, overflowWrap: 'anywhere' }}>{l.t}</span>
                </motion.div>))}</AnimatePresence>
            </motion.section>
          </Stagger>
        )}
      </AnimatePresence>

      <Dialog open={levelUp} onClose={() => setLevelUp(false)} labelledBy="lv-title" width={380}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          {Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2, r = 90 + (i % 3) * 30; return (
            <motion.span key={i} aria-hidden initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }} animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r, scale: 1, opacity: 0 }} transition={{ duration: 1, delay: (i % 4) * 0.04, ease: 'easeOut' }}
              style={{ position: 'absolute', left: 32, top: 32, width: 8, height: 8, borderRadius: 2, background: ['var(--color-accent)', 'var(--warn)', 'var(--ok)', 'var(--ice)'][i % 4] }} />); })}
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }} style={{ display: 'grid', placeItems: 'center', width: 72, height: 72, borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', font: '700 32px/1 var(--font-heading)' }}>{g?.level.level}</motion.span>
          <h3 id="lv-title" style={{ margin: 0 }}>Nível {g?.level.level}!</h3>
          <p className="text-muted" style={{ margin: 0 }}>Cada questão e cada revisão contam. Continue no seu ritmo.</p>
          <button className="btn btn-primary btn-block" onClick={() => setLevelUp(false)} style={{ minHeight: 48, justifyContent: 'space-between' }}>Continuar<span aria-hidden>→</span></button>
        </div>
      </Dialog>
    </AppShell>
  );
}
