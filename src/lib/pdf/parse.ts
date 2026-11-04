// Transforma o layout do caderno em questões reais: blocos de texto e figuras na ordem do PDF,
// alternativas (com imagem quando a alternativa é um desenho) e a área "como no caderno".
import type { Area } from '../areas';
import { garbledLine, type Box, type PageLayout, type PFigure, type PLine } from './extract';

export interface FigureRef { page: number; box: Box; alt: string }
export type Block = { type: 'text'; text: string } | ({ type: 'figure' } & FigureRef);
export interface ParsedOption { k: string; t: string; figure?: FigureRef }
export interface ParsedQuestion {
  number: number;
  /** 'ingles' | 'espanhol' nas questões de língua estrangeira do ENEM; null nas demais. */
  variant: string | null;
  area: Area;
  page: number;
  /** Enunciado em texto puro (busca, IA, acessibilidade). */
  statement: string;
  content: Block[];
  options: ParsedOption[];
  /** Recortes da questão inteira, uma por coluna/página, para a visão "como no caderno". */
  regions: { page: number; box: Box }[];
}
export interface ParseResult { questions: ParsedQuestion[]; skipped: { number: number; reason: string }[]; isEnem: boolean; answerKeyText: string }

const AREA_HEADERS: [RegExp, Area][] = [
  [/LINGUAGENS,?\s+C[ÓO]DIGOS\s+E\s+SUAS/i, 'LC'],
  [/CI[ÊE]NCIAS\s+HUMANAS\s+E\s+SUAS/i, 'CH'],
  [/CI[ÊE]NCIAS\s+DA\s+NATUREZA\s+E\s+SUAS/i, 'CN'],
  [/MATEM[ÁA]TICA\s+E\s+SUAS\s+TECNOLOGIAS/i, 'MT'],
];

const NOISE = [
  /^\*[A-Z0-9]{6,}\*$/, // código de barras do caderno
  /P[áa]gina\s+\d+\s*$/i,
  /^\d+\s*º?\s*DIA\s*\|/i,
  /^ENEM\s?\d{4}$/i,
  /^Caderno\s+\d+\s*[-–]/i,
  /^(?:LC|CH|CN|MT)\s*[-–]\s*\d/i,
  /CADERNO\s+\d+\s*[•|]/i, // "LC • 1º DIA • CADERNO 1 • AZUL"
  /^[–-]?\s*\d*\s*[–-]?\s*(?:LC|CH|CN|MT)\s*•/,
  /^[–-]$/,
  /^Quest[õo]es de \d+ a \d+$/i,
  /^(?:ENEM\s?20\d\d){2,}/i,
];
const STOP = /PROPOSTA DE REDA[ÇC][ÃA]O|INSTRU[ÇC][ÕO]ES PARA A REDA[ÇC][ÃA]O|Transcreva a sua Reda[çc][ãa]o|^RASCUNHO$|FOLHA DE REDA[ÇC][ÃA]O/i;
const ENEM_MARK = /^QUEST[ÃA]O\s*0*(\d{1,3})\b[\s.:\-–]*(.*)$/i;
const GENERIC_MARK = /^(?:Quest[ãa]o\s*)?0*(\d{1,3})\s*[.)\-–—]\s+(.+)$/i;
const OPT_STRICT = /^\(?([A-Ea-e])\s*[)\].:\-–]\s*(.*)$/;
// No ENEM a letra sai duplicada ("AA texto"): a da bolinha e a do texto.
const OPT_LOOSE = /^([A-E])\1?(?:\s+(.*))?$/;

/** Ordem das áreas pela numeração. Até 2016: Humanas, Natureza, Linguagens, Matemática; desde 2017: Linguagens, Humanas, Natureza, Matemática. */
export const enemAreaByNumber = (n: number, year?: number | null): Area =>
  year && year <= 2016 ? (n <= 45 ? 'CH' : n <= 90 ? 'CN' : n <= 135 ? 'LC' : 'MT') : n <= 45 ? 'LC' : n <= 90 ? 'CH' : n <= 135 ? 'CN' : 'MT';

type Item = { kind: 'line'; l: PLine } | { kind: 'fig'; f: PFigure & { alt: string } };
const itemPage = (i: Item) => (i.kind === 'line' ? i.l.page : i.f.page);
const itemBox = (i: Item): Box => (i.kind === 'line' ? i.l : i.f);

/** Fluxo de leitura: por página, faixa larga, coluna esquerda, coluna direita; figuras no lugar onde aparecem. */
function readingStream(pages: PageLayout[]): Item[] {
  const out: Item[] = [];
  for (const p of pages) {
    const pageNum = new RegExp(`^[–-]?\\s*0?${p.page}\\s*[–-]?$`);
    const pageTail = new RegExp(`(?:\\s+[–-]\\s*|(?<=[.!?”)])\\s+)0?${p.page}$`);
    const figs = p.figures.map(f => ({ ...f, alt: '' }));
    let lines: PLine[] = [];
    for (const l of p.lines) {
      if (pageNum.test(l.text) || NOISE.some(r => r.test(l.text))) continue;
      const text = l.text.replace(pageTail, '');
      if (text) lines.push({ ...l, text });
    }
    // Faixa decorativa atrás de "QUESTÃO 12" não é figura
    const marksL = lines.filter(l => ENEM_MARK.test(l.text));
    for (let i = figs.length - 1; i >= 0; i--) {
      const f = figs[i];
      const h = f.bottom - f.top, w = f.x1 - f.x0;
      if ((h < 40 && marksL.some(l => l.top < f.bottom + 3 && l.bottom > f.top - 3)) || (h < 9 && w > 60)) figs.splice(i, 1);
    }
    // Linhas dentro de uma figura (rótulo de gráfico, célula de tabela) passam a fazer parte da figura.
    // Legendas curtas coladas por fora (eixos, "Quantidade de motoristas") também; fonte e enunciado não.
    const absorb = (f: typeof figs[number], l: PLine) => {
      f.x0 = Math.min(f.x0, l.x0 - 2); f.x1 = Math.max(f.x1, l.x1 + 2); f.top = Math.min(f.top, l.top - 2); f.bottom = Math.max(f.bottom, l.bottom + 2);
      f.alt += (f.alt ? ' ' : '') + l.text;
    };
    const protectedLine = (l: PLine) => ENEM_MARK.test(l.text) || STOP.test(l.text) || !!markOf(l.text);
    for (let changed = true; changed;) {
      changed = false;
      lines = lines.filter(l => {
        if (protectedLine(l)) return true;
        const cy = (l.top + l.bottom) / 2, h = l.bottom - l.top, w = l.x1 - l.x0;
        const inside = figs.find(f => cy >= f.top - 3 && cy <= f.bottom + 3 && l.x0 >= f.x0 - 30 && l.x1 <= f.x1 + 30 && w < (f.x1 - f.x0) * 1.6 + 40);
        const label = l.text.length <= 45 && !/[.:?;]$/.test(l.text) && !/^(Dispon[íi]vel|Fonte|Acesso|[A-ZÀ-Ú]{2,}[A-ZÀ-Ú ]*,\s)/.test(l.text);
        const near = label && figs.find(f => l.x0 >= f.x0 - 30 && l.x1 <= f.x1 + 30 && ((l.top >= f.bottom - 1 && l.top - f.bottom <= h * 1.2) || (l.bottom <= f.top + 1 && f.top - l.bottom <= h * 0.8)));
        const host = inside || near;
        if (!host) return true;
        absorb(host, l); changed = true;
        return false;
      });
    }
    const all: Item[] = [...lines.map(l => ({ kind: 'line' as const, l })), ...figs.map(f => ({ kind: 'fig' as const, f }))];
    const colOf = (i: Item) => (i.kind === 'line' ? i.l.col : i.f.col);
    const byTop = (a: Item, b: Item) => itemBox(a).top - itemBox(b).top || itemBox(a).x0 - itemBox(b).x0;
    // Faixas de largura inteira (questão ou tabela que ocupa a página) cortam as colunas:
    // lê-se coluna esquerda e direita até a faixa, depois a faixa, depois o resto.
    const bands = mergeIntervals(all.filter(i => colOf(i) === 0).map(i => [itemBox(i).top, itemBox(i).bottom] as [number, number]));
    let cursor = -Infinity;
    const center = (i: Item) => (itemBox(i).top + itemBox(i).bottom) / 2;
    for (const [bt, bb] of [...bands, [Infinity, Infinity] as [number, number]]) {
      for (const col of [1, 2]) out.push(...all.filter(i => colOf(i) === col && center(i) >= cursor && center(i) < bt).sort(byTop));
      out.push(...all.filter(i => colOf(i) === 0 && itemBox(i).top >= bt && itemBox(i).top <= bb).sort(byTop));
      cursor = bb;
    }
  }
  return out;
}

function mergeIntervals(list: [number, number][]): [number, number][] {
  const s = [...list].sort((a, b) => a[0] - b[0]), out: [number, number][] = [];
  for (const [a, b] of s) { const l = out[out.length - 1]; if (l && a <= l[1] + 2) l[1] = Math.max(l[1], b); else out.push([a, b]); }
  return out;
}

/** Separa as páginas de gabarito que algumas bancas colocam no fim do próprio caderno. */
function splitInlineKey(pages: PageLayout[]): { qPages: PageLayout[]; keyText: string } {
  for (let i = Math.floor(pages.length / 2); i < pages.length; i++) {
    const idx = pages[i].lines.findIndex(l => /^GABARITO(?:\s+OFICIAL|\s+PRELIMINAR|\s+DEFINITIVO)?$/i.test(l.text));
    if (idx >= 0) {
      const cut = pages[i].lines[idx].top;
      return {
        qPages: [...pages.slice(0, i), { ...pages[i], lines: pages[i].lines.filter(l => l.top < cut), figures: pages[i].figures.filter(f => f.bottom < cut) }],
        keyText: [pages[i].lines.filter(l => l.top >= cut), ...pages.slice(i + 1).map(p => p.lines)].flat().map(l => l.text).join('\n'),
      };
    }
  }
  return { qPages: pages, keyText: '' };
}

export function parseLayout(pages: PageLayout[], opts: { year?: number | null; enem?: boolean } = {}): ParseResult {
  const { qPages, keyText } = splitInlineKey(pages);
  const allText = qPages.flatMap(p => p.lines.map(l => l.text)).join('\n');
  const markCount = allText.match(/^QUEST[ÃA]O\s*\d{1,3}\b/gim)?.length ?? 0;
  const isEnem = opts.enem ?? (/EXAME\s+NACIONAL\s+DO\s+ENSINO\s+M[ÉE]DIO|\bENEM\b/i.test(allText) && markCount >= 10);
  const useEnemMark = markCount >= 1;
  const stream = readingStream(qPages);

  type Raw = { number: number; variant: string | null; area: Area | null; page: number; items: Item[] };
  const blocks: Raw[] = [];
  let area: Area | null = null, lang: string | null = null, last = 0, stopped = false;
  for (const it of stream) {
    if (it.kind === 'fig') { if (!stopped) blocks[blocks.length - 1]?.items.push(it); continue; }
    const text = it.l.text;
    // Proposta de redação e instruções finais não pertencem à questão anterior
    if (STOP.test(text)) { stopped = true; continue; }
    const header = AREA_HEADERS.find(([r]) => r.test(text));
    if (header) { area = header[1]; if (header[1] !== 'LC') lang = null; continue; }
    if (/op[çc][ãa]o\s+ingl[êe]s/i.test(text)) { lang = 'ingles'; continue; }
    if (/op[çc][ãa]o\s+espanhol/i.test(text)) { lang = 'espanhol'; continue; }

    const m = (useEnemMark ? ENEM_MARK : GENERIC_MARK).exec(text);
    if (m) {
      const n = +m[1];
      // Sem cabeçalho "(opção espanhol)", a numeração recomeça: 91..95 inglês → 91..95 espanhol
      // (sem cabeçalho de idioma: o número já apareceu entre as 5 primeiras questões e ainda não tem a versão em espanhol)
      const restart = isEnem && n < last && blocks.length <= 6 && blocks.slice(0, 5).some(x => x.number === n) && !blocks.some(x => x.number === n && x.variant === 'espanhol') && blocks.filter(x => x.number === n).length === 1;
      const sequential = last === 0 ? n <= 200 : n > last && n - last <= (useEnemMark ? 50 : 3);
      if (sequential || restart) {
        if (restart) { lang = 'espanhol'; for (const x of blocks) if (!x.variant) x.variant = 'ingles'; }
        // o idioma vale só até a numeração passar das questões de língua estrangeira
        if (lang && !restart && blocks.some(b => b.variant === lang && b.number === n - 5)) lang = null;
        const rest: Item[] = m[2] ? [{ kind: 'line', l: { ...it.l, text: m[2] } }] : [];
        blocks.push({ number: n, variant: isEnem ? lang : null, area, page: it.l.page, items: rest });
        last = n; stopped = false;
        continue;
      }
    }
    if (!stopped) blocks[blocks.length - 1]?.items.push(it);
  }

  // Questões de língua estrangeira (as 5 primeiras de LC aparecem duas vezes: inglês e espanhol)
  if (isEnem) {
    const lcFirst = blocks.slice(0, 10);
    const dup = lcFirst.filter(b => lcFirst.filter(x => x.number === b.number).length === 2);
    if (dup.length >= 8) dup.forEach(b => { if (!b.variant) b.variant = dup.filter(x => x.number === b.number).indexOf(b) === 0 ? 'ingles' : 'espanhol'; });
  }

  const questions: ParsedQuestion[] = [], skipped: ParseResult['skipped'] = [];
  for (const b of blocks) {
    const q = buildQuestion(b.items);
    if (!q) { skipped.push({ number: b.number, reason: 'alternativas não encontradas (discursiva, certo/errado ou layout desconhecido)' }); continue; }
    if (q.statement.length < 15 && !q.content.some(c => c.type === 'figure')) { skipped.push({ number: b.number, reason: 'enunciado vazio' }); continue; }
    questions.push({ ...q, number: b.number, variant: b.variant, page: b.page, // no ENEM a numeração define a área (cabeçalhos variam de ano para ano)
      area: isEnem && opts.year ? enemAreaByNumber(b.number, opts.year) : b.area ?? (isEnem ? enemAreaByNumber(b.number) : 'GERAL'), regions: regionsOf(b.items, qPages) });
  }
  return { questions, skipped, isEnem, answerKeyText: keyText };
}

function markOf(text: string) {
  const s = OPT_STRICT.exec(text);
  if (s) return { k: s[1].toUpperCase(), rest: s[2] ?? '' };
  const m = OPT_LOOSE.exec(text);
  return m ? { k: m[1], rest: m[2] ?? '' } : null;
}

/** Encontra a última sequência A–E (ou A–D) e separa enunciado e alternativas, mantendo figuras no lugar. */
function buildQuestion(items: Item[]): Omit<ParsedQuestion, 'number' | 'variant' | 'area' | 'page' | 'regions'> | null {
  const marks = items.map(i => (i.kind === 'line' ? markOf(i.l.text) : null));
  for (const letters of [['A', 'B', 'C', 'D', 'E'], ['A', 'B', 'C', 'D']]) {
    for (let iA = items.length - 1; iA >= 0; iA--) {
      if (marks[iA]?.k !== 'A') continue;
      const idx = [iA];
      for (const L of letters.slice(1)) {
        const from = idx[idx.length - 1] + 1;
        const j = marks.findIndex((mk, i) => i >= from && mk?.k === L);
        if (j < 0) break;
        idx.push(j);
      }
      if (idx.length !== letters.length) continue;
      if (letters.length === 4 && marks.some((mk, i) => i > idx[3] && mk?.k === 'E')) continue;

      // Figura que começa um pouco acima da letra (alternativa-imagem) pertence à alternativa
      const optFigure = (n: number): PFigure & { alt: string } | undefined => {
        const ml = (items[idx[n]] as { l: PLine }).l;
        const end = n + 1 < idx.length ? idx[n + 1] : items.length;
        const inside = items.slice(idx[n] + 1, end).find(i => i.kind === 'fig');
        if (inside?.kind === 'fig') return inside.f;
        const before = items[idx[n] - 1];
        if (before?.kind === 'fig' && before.f.page === ml.page && before.f.bottom > ml.top && before.f.x0 > ml.x0 - 4) return before.f;
        return undefined;
      };
      // Numerador de fração fica acima da letra: linhas de fórmula coladas na letra pertencem à alternativa
      const taken = new Set<number>();
      const lead = idx.map(i => {
        const ml = (items[i] as { l: PLine }).l, extra: number[] = [];
        for (let j = i - 1; j >= 0; j--) {
          const it = items[j];
          if (it.kind !== 'line' || !it.l.math || it.l.page !== ml.page || it.l.col !== ml.col || it.l.bottom < ml.top + 1 || markOf(it.l.text)) break;
          extra.unshift(j); taken.add(j);
        }
        return extra;
      });
      const options: ParsedOption[] = [];
      const usedFigs = new Set<unknown>();
      for (let n = 0; n < letters.length; n++) {
        const end = n + 1 < idx.length ? idx[n + 1] : items.length;
        const own = [...lead[n], ...Array.from({ length: end - idx[n] - 1 }, (_, k) => idx[n] + 1 + k).filter(k => !taken.has(k))];
        const ml = (items[idx[n]] as { l: PLine }).l;
        const lineItems = [ml, ...own.flatMap(k => (items[k].kind === 'line' ? [(items[k] as { l: PLine }).l] : []))];
        // texto ilegível (fonte quebrada) não entra: a alternativa aparece como imagem
        const text = [marks[idx[n]]!.rest, ...own.flatMap(k => (items[k].kind === 'line' ? [(items[k] as { l: PLine }).l.text] : []))].filter(t => t && !garbledLine(t));
        const t = joinLines(text).replace(/(?<=[.!?”])\s+\d{1,3}$/, ''); // numeração solta depois do ponto final
        let f = optFigure(n) as FigureRef | (PFigure & { alt: string }) | undefined;
        if (f) usedFigs.add(f);
        if (!f && lineItems.some(l => l.math)) {
          // fórmula desenhada (raiz, fração): a alternativa vira imagem igual ao caderno, sem a bolinha
          const same = lineItems.filter(l => l.page === ml.page && l.col === ml.col);
          // sem texto na linha da letra (só a bolinha), o recorte começa na fórmula
          const left = marks[idx[n]]!.rest ? ml.restX0 : Math.min(...same.filter(l => l !== ml).map(l => l.x0), ml.x1 + 2);
          f = { page: ml.page, alt: t, box: { x0: left - 1, x1: Math.max(...same.map(l => l.x1)) + 2, top: Math.min(...same.map(l => l.top)) - 2, bottom: Math.max(...same.map(l => l.bottom)) + 2 } };
        }
        options.push({ k: letters[n], t, figure: f && { page: f.page, box: boxOf('box' in f ? f.box : f), alt: f.alt } });
      }
      if (options.some(o => !o.t && !o.figure)) continue;
      const head = items.slice(0, iA).filter((i, k) => !taken.has(k) && !(i.kind === 'fig' && usedFigs.has(i.f)));
      const content = toBlocks(head);
      return { content, statement: statementOf(content), options };
    }
  }
  return gridOptions(items, marks);
}

const statementOf = (content: Block[]) => content.flatMap(c => (c.type === 'text' ? [c.text] : c.alt ? [`[Figura: ${c.alt}]`] : [])).join('\n\n');

/**
 * Alternativas em grade (A B C numa coluna, D E na outra, geralmente imagens): a ordem de leitura não é A→E.
 * Cada letra fica com o texto da própria linha e a figura mais próxima abaixo/à direita dela.
 */
function gridOptions(items: Item[], marks: ReturnType<typeof markOf>[]): Omit<ParsedQuestion, 'number' | 'variant' | 'area' | 'page' | 'regions'> | null {
  const pos = new Map<string, number>();
  for (let i = items.length - 1; i >= 0; i--) { const k = marks[i]?.k; if (k && !pos.has(k)) pos.set(k, i); }
  const letters = ['A', 'B', 'C', 'D', 'E'].filter(k => pos.has(k));
  if (letters[0] !== 'A' || letters.length < 4 || (letters.length === 4 && letters[3] !== 'D')) return null;
  const ml = (k: string) => (items[pos.get(k)!] as { l: PLine }).l;
  const page = ml('A').page;
  if (letters.some(k => ml(k).page !== page)) return null;
  const first = Math.min(...letters.map(k => pos.get(k)!));
  const figs = items.filter((i): i is Extract<Item, { kind: 'fig' }> => i.kind === 'fig' && i.f.page === page && i.f.bottom > ml('A').top - 4);
  const owner = new Map<string, PFigure & { alt: string }>();
  for (const { f } of figs) {
    let best: string | null = null, dist = Infinity;
    for (const k of letters) {
      const l = ml(k);
      if (l.top > f.bottom || l.x0 > f.x0 + 12) continue; // a letra fica acima/à esquerda da figura
      const d = Math.hypot(f.x0 - l.x1, f.top - l.top);
      if (d < dist) { dist = d; best = k; }
    }
    if (best && !owner.has(best)) owner.set(best, f);
  }
  const options: ParsedOption[] = letters.map(k => {
    const rest = marks[pos.get(k)!]!.rest, t = garbledLine(rest) ? '' : rest, f = owner.get(k);
    return { k, t, figure: f && { page: f.page, box: boxOf(f), alt: f.alt || t } };
  });
  if (options.some(o => !o.t && !o.figure)) return null;
  const used = new Set<unknown>([...owner.values()]);
  const content = toBlocks(items.slice(0, first).filter(i => !(i.kind === 'fig' && used.has(i.f))));
  return { content, statement: statementOf(content), options };
}

const boxOf = (b: Box): Box => ({ x0: Math.round(b.x0), x1: Math.round(b.x1), top: Math.round(b.top), bottom: Math.round(b.bottom) });

/** Linhas → parágrafos (mantém quebras de poemas e citações); figuras viram blocos próprios. */
function toBlocks(items: Item[]): Block[] {
  const out: Block[] = [];
  let buf: PLine[] = [], math: PLine[] = [];
  const flush = () => { if (buf.length) out.push({ type: 'text', text: paragraphs(buf) }); buf = []; };
  // linhas seguidas de fórmula (mesma página/coluna) viram uma imagem só
  const flushMath = () => {
    if (!math.length) return;
    out.push({ type: 'figure', page: math[0].page, alt: math.filter(l => !garbledLine(l.text)).map(l => l.text).join(' '), box: boxOf({ x0: Math.min(...math.map(l => l.x0)) - 2, x1: Math.max(...math.map(l => l.x1)) + 2, top: Math.min(...math.map(l => l.top)) - 2, bottom: Math.max(...math.map(l => l.bottom)) + 2 }) });
    math = [];
  };
  for (const it of items) {
    if (it.kind === 'fig') { flush(); flushMath(); out.push({ type: 'figure', page: it.f.page, box: boxOf(it.f), alt: it.f.alt }); continue; }
    if (it.l.math) {
      const p = math[math.length - 1];
      if (p && (p.page !== it.l.page || p.col !== it.l.col)) flushMath();
      flush(); math.push(it.l);
    } else { flushMath(); buf.push(it.l); }
  }
  flush(); flushMath();
  return out.filter(b => b.type !== 'text' || b.text.trim());
}

function paragraphs(lines: PLine[]): string {
  // margens da coluna em cada página
  const bounds = new Map<string, { left: number; right: number }>();
  for (const l of lines) {
    const k = `${l.page}:${l.col}`, b = bounds.get(k) ?? { left: Infinity, right: -Infinity };
    bounds.set(k, { left: Math.min(b.left, l.x0), right: Math.max(b.right, l.x1) });
  }
  let out = '';
  lines.forEach((l, i) => {
    if (!i) { out = l.text; return; }
    const p = lines[i - 1], b = bounds.get(`${l.page}:${l.col}`)!, pb = bounds.get(`${p.page}:${p.col}`)!;
    const sameCol = p.page === l.page && p.col === l.col;
    const h = Math.max(4, p.bottom - p.top);
    const gap = sameCol ? l.top - p.bottom : 0;
    const prevShort = p.x1 < pb.right - (pb.right - pb.left) * 0.12;
    const indented = l.x0 > b.left + 8;
    if (sameCol && gap > h * 0.55) out += '\n\n' + l.text;
    else if (prevShort && /[.:?!»”"]$/.test(out) && indented) out += '\n\n' + l.text;
    else if (prevShort) out += '\n' + l.text;
    else if (/[a-zà-ú]-$/i.test(out)) out = out.slice(0, -1) + l.text; // hifenização de fim de linha
    else out += ' ' + l.text;
  });
  return out.trim();
}

function regionsOf(items: Item[], pages: PageLayout[]): { page: number; box: Box }[] {
  const groups = new Map<string, Box & { page: number; col: number }>();
  for (const it of items) {
    const b = itemBox(it), page = itemPage(it), col = it.kind === 'line' ? it.l.col : it.f.col, k = `${page}:${col}`;
    const g = groups.get(k);
    groups.set(k, g ? { ...g, x0: Math.min(g.x0, b.x0), x1: Math.max(g.x1, b.x1), top: Math.min(g.top, b.top), bottom: Math.max(g.bottom, b.bottom) } : { x0: b.x0, x1: b.x1, top: b.top, bottom: b.bottom, page, col });
  }
  return [...groups.values()].map(g => {
    const p = pages.find(x => x.page === g.page)!;
    // usa a largura inteira da coluna para o recorte ficar igual ao caderno
    const colL = g.col === 2 ? p.mid + 4 : Math.min(g.x0, 20), colR = g.col === 1 && p.twoCols ? p.mid - 4 : Math.max(g.x1, p.width - 20);
    return { page: g.page, box: boxOf({ x0: Math.max(0, Math.min(g.x0, colL) - 6), x1: Math.min(p.width, Math.max(g.x1, colR) + 6), top: Math.max(0, g.top - 26), bottom: Math.min(p.height, g.bottom + 8) }) };
  });
}

export function joinLines(lines: string[]): string {
  let out = '';
  for (const l of lines) {
    if (!out) { out = l; continue; }
    if (/[a-zà-ú]-$/i.test(out)) out = out.slice(0, -1) + l;
    else if (/[.:?!»”"]$/.test(out) && /^[A-ZÀ-Ú“"(—–-]/.test(l)) out += '\n' + l;
    else out += ' ' + l;
  }
  return out.trim();
}

/** Para testes e para texto vindo de OCR: monta um layout simples a partir de linhas de texto. */
export function layoutFromText(pages: string[]): PageLayout[] {
  return pages.map((t, pi) => ({
    page: pi + 1, width: 600, height: 4000, twoCols: false, mid: 300, figures: [], garbled: false,
    lines: t.split('\n').map(s => s.trim()).filter(Boolean).map((text, i) => ({ text, page: pi + 1, col: 1 as const, size: 10, x0: 40, x1: 560, restX0: 40, top: 40 + i * 14, bottom: 50 + i * 14 })),
  }));
}

export type AnswerKey = Map<string, string>; // chave "12" ou "3:ingles"; valor 'A'..'E' ou 'ANULADA'

/** Lê gabaritos em linhas ("01 B", "1 – C", "1 A B" com inglês/espanhol) ou em tabelas horizontais. */
export function parseAnswerKey(text: string): AnswerKey {
  const key: AnswerKey = new Map();
  const norm = (t: string) => (/^ANULAD[AO]$|^X$|^\*$/i.test(t) ? 'ANULADA' : t.toUpperCase());
  const isLetter = (t?: string) => !!t && /^([A-E]|ANULAD[AO]|X|\*)$/i.test(t);
  const set = (k: string, v: string) => { if (!key.has(k)) key.set(k, norm(v)); };

  // 1) tabelas horizontais: linha com números seguida de linha com letras
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i + 1 < lines.length; i++) {
    const nums = lines[i].replace(/^Quest(?:ão|ões|ao|oes)\s*/i, '').split(/\s+/);
    const lets = lines[i + 1].replace(/^(?:Resposta|Gabarito)s?\s*/i, '').split(/\s+/);
    if (nums.length >= 3 && nums.length === lets.length && nums.every(n => /^\d{1,3}$/.test(n)) && lets.every(isLetter)) {
      nums.forEach((n, j) => set(String(+n), lets[j]));
      i++;
    }
  }

  // 2) pares número → letra em sequência; "1 A B" = inglês A, espanhol B
  const tokens = text.replace(/[|;,]/g, ' ').replace(/(\d)\s*[-–.:)]\s*/g, '$1 ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length - 1; i++) {
    if (!/^\d{1,3}$/.test(tokens[i])) continue;
    const n = +tokens[i];
    if (n < 1 || n > 200 || !isLetter(tokens[i + 1])) continue;
    const after = tokens[i + 3];
    if (isLetter(tokens[i + 2]) && (!after || /^\d/.test(after))) {
      set(`${n}:ingles`, tokens[i + 1]); set(`${n}:espanhol`, tokens[i + 2]); i += 2; continue;
    }
    set(String(n), tokens[i + 1]);
    i++;
  }
  return key;
}

export function answerFor(key: AnswerKey, q: Pick<ParsedQuestion, 'number' | 'variant'>): string | null {
  return (q.variant && key.get(`${q.number}:${q.variant}`)) || key.get(String(q.number)) || null;
}
