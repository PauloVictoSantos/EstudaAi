'use client';
// Exibe a questão como está no PDF: texto e figuras na ordem do caderno, alternativas com imagem
// quando são desenho/fórmula, e a visão "como no caderno" (recorte da página).
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icon';
import { ease } from './motion';

export interface ImageRef { img: string; w: number; h: number; alt?: string }
export type Block = { type: 'text'; text: string } | ({ type: 'figure' } & ImageRef);
export interface QOption { k: string; t: string; img?: ImageRef }
export interface QView { content?: Block[]; statement: string; options: QOption[]; original?: ImageRef[] }

const src = (r: ImageRef) => `/api/images/${r.img}`;
// pontos do PDF → pixels de tela (o caderno é lido em ~1,35×)
const px = (pt: number) => Math.round(pt * 1.35);

export function Figure({ r, max = '100%' }: { r: ImageRef; max?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src(r)} alt={r.alt || 'Figura da questão'} width={px(r.w)} height={px(r.h)} loading="lazy"
      style={{ display: 'block', width: px(r.w), maxWidth: max, height: 'auto', borderRadius: 4, background: '#fff' }} />
  );
}

/** Enunciado: blocos na ordem do caderno, ou o recorte original quando `original` estiver ligado. */
export function QuestionBody({ q, original, size = 18 }: { q: QView; original: boolean; size?: number }) {
  const blocks = q.content?.length ? q.content : [{ type: 'text' as const, text: q.statement }];
  return (
    <AnimatePresence mode="wait" initial={false}>
      {original && q.original?.length ? (
        <motion.div key="orig" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, borderRadius: 'var(--radius-md)', background: '#fff', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
          {q.original.map(r => <Figure key={r.img} r={{ ...r, alt: 'Questão como impressa no caderno' }} />)}
        </motion.div>
      ) : (
        <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {blocks.map((b, i) => b.type === 'text'
            ? <p key={i} style={{ margin: 0, fontSize: size, lineHeight: 1.6, whiteSpace: 'pre-line', textWrap: 'pretty' }}>{b.text}</p>
            : <figure key={i} style={{ margin: 0, alignSelf: 'center', maxWidth: '100%' }}><Figure r={b} /></figure>)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Conteúdo de uma alternativa: texto ou o recorte (fórmula, gráfico, figura). */
export function OptionBody({ o, size = 15 }: { o: QOption; size?: number }) {
  return o.img ? <Figure r={o.img} max="min(100%, 520px)" /> : <span style={{ fontSize: size }}>{o.t}</span>;
}

export function OriginalToggle({ q, on, onChange }: { q: QView; on: boolean; onChange: (v: boolean) => void }) {
  if (!q.original?.length) return null;
  return (
    <button className="btn btn-ghost" onClick={() => onChange(!on)} aria-pressed={on} style={{ fontSize: 12, fontWeight: 500 }} title="Mostra a questão exatamente como está impressa no PDF">
      <Icon name={on ? 'file-text' : 'eye'} size={14} />{on ? 'Ver em texto' : 'Ver como no caderno'}
    </button>
  );
}
