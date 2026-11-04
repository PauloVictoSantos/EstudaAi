// Lê o PDF preservando a geometria: linhas de texto com posição, colunas e figuras (fotos, gráficos,
// tabelas, fórmulas desenhadas). O arquivo nunca é salvo: os bytes ficam só na memória.
import { createIsomorphicCanvasFactory, getDocumentProxy } from 'unpdf';

export interface Box { x0: number; x1: number; top: number; bottom: number }
/** col: 0 = atravessa a página, 1 = coluna esquerda, 2 = coluna direita */
export interface PLine extends Box {
  text: string; page: number; col: 0 | 1 | 2; size: number;
  /** x onde começa o texto depois da letra da alternativa (a bolinha fica de fora do recorte) */
  restX0: number;
  /** a linha tem traços desenhados (raiz, fração, vetor): é fórmula e vira imagem */
  math?: boolean;
}
export interface PFigure extends Box { page: number; col: 0 | 1 | 2 }
export interface PageLayout { page: number; width: number; height: number; twoCols: boolean; mid: number; lines: PLine[]; figures: PFigure[]; garbled: boolean }

interface Item extends Box { str: string; size: number; space?: boolean }

type PdfDoc = Awaited<ReturnType<typeof getDocumentProxy>>;
type Canvas = import('@napi-rs/canvas').Canvas;

export interface AnalyzedPdf {
  pages: PageLayout[];
  /** Recorta uma área (em pontos do PDF) como WebP. */
  crop: (page: number, box: Box, scale?: number) => Promise<{ data: Buffer; w: number; h: number }>;
  /** Página inteira como PNG (para leitura por IA quando o texto está corrompido). */
  pagePng: (page: number, scale?: number) => Promise<Buffer>;
  close: () => Promise<void>;
}

// O pdf.js desenha com as classes do navegador; no Node elas vêm do @napi-rs/canvas.
const canvasMod = async () => {
  const m = await import('@napi-rs/canvas');
  const g = globalThis as Record<string, unknown>;
  g.Path2D ??= m.Path2D; g.ImageData ??= m.ImageData; g.DOMMatrix = m.DOMMatrix;
  return m;
};

/** Texto simples, página a página (usado nos gabaritos). */
export async function extractPdfText(data: Uint8Array): Promise<{ pages: string[]; pageCount: number }> {
  const pdf = await getDocumentProxy(data);
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const items = await textItems(page, vp);
    pages.push(layoutPage(items, vp.width));
    page.cleanup();
  }
  const pageCount = pdf.numPages;
  await pdf.cleanup();
  return { pages, pageCount };
}

/** Layout completo: linhas com posição + figuras detectadas na imagem da página. */
export async function analyzePdf(data: Uint8Array, opts: { figures?: boolean } = {}): Promise<AnalyzedPdf> {
  // fábrica de canvas do Node para os grupos/transparências que o pdf.js desenha à parte
  const CanvasFactory = await createIsomorphicCanvasFactory(canvasMod);
  const pdf = await getDocumentProxy(data, { CanvasFactory } as never);
  const pages: PageLayout[] = [];
  const renders = new Map<string, Canvas>();

  const render = async (n: number, scale: number): Promise<Canvas> => {
    const key = `${n}@${scale}`;
    const hit = renders.get(key);
    if (hit) return hit;
    const { createCanvas } = await canvasMod();
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx as never, viewport: vp, canvas: canvas as never } as never).promise;
    // mantém poucas renderizações em memória
    if (renders.size > 3) renders.delete(renders.keys().next().value!);
    renders.set(key, canvas);
    return canvas;
  };

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const items = await textItems(page, vp);
    const { lines, twoCols, mid } = toLayout(items, vp.width, n);
    let figures: PFigure[] = [];
    if (opts.figures !== false) {
      const det = detectFigures(await render(n, 2), 2, items, vp.height, twoCols, mid, n);
      figures = det.figures;
      for (const l of lines) l.math = garbledLine(l.text) || det.marks.some(m => m.x0 <= l.x1 + 1 && m.x1 >= l.restX0 - 1 && m.top <= l.bottom + 3 && m.bottom >= l.top - 3);
    }
    pages.push({ page: n, width: vp.width, height: vp.height, twoCols, mid, lines, figures, garbled: isGarbled(lines) });
  }

  return {
    pages,
    async crop(n, box, scale = 2) {
      const { createCanvas } = await canvasMod();
      const src = await render(n, scale);
      const x = Math.max(0, Math.floor(box.x0 * scale)), y = Math.max(0, Math.floor(box.top * scale));
      const w = Math.min(src.width - x, Math.ceil((box.x1 - box.x0) * scale)), h = Math.min(src.height - y, Math.ceil((box.bottom - box.top) * scale));
      const out = createCanvas(Math.max(1, w), Math.max(1, h));
      out.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h);
      return { data: await out.encode('webp', 82), w, h };
    },
    async pagePng(n, scale = 2) { return (await render(n, scale)).encode('png'); },
    async close() { renders.clear(); await pdf.cleanup(); },
  };
}

async function textItems(page: Awaited<ReturnType<PdfDoc['getPage']>>, vp: { transform: number[]; convertToViewportPoint: (x: number, y: number) => number[] }): Promise<Item[]> {
  const content = await page.getTextContent();
  const items: Item[] = [];
  const raw = content.items as { str?: string; transform?: number[]; width?: number; height?: number; fontName?: string }[];
  // Fontes que gravam o índice do glifo em vez do caractere ("YLVmR" = "visão"): o espaço vira \u0003
  const ctrl = new Map<string, number>();
  for (const it of raw) if (it.fontName && it.str && /[\u0003-\u001f]/.test(it.str)) ctrl.set(it.fontName, (ctrl.get(it.fontName) ?? 0) + 1);
  for (const it of raw) {
    if (it.str && it.fontName && (ctrl.get(it.fontName) ?? 0) >= 2) it.str = decodeMacGlyphs(it.str);
    if (!it.str || !it.transform) continue;
    const [a, b, c, d, e, f] = it.transform;
    // Texto girado (marca d'água ENEM2024…, rótulos verticais de margem) não faz parte da questão
    if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01 || a <= 0) continue;
    const size = Math.abs(d) || it.height || 10;
    const [x, y] = vp.convertToViewportPoint(e, f);
    // espaços explícitos do PDF ficam como marcadores de separação de palavra
    items.push({ str: it.str, space: !it.str.trim(), x0: x, x1: x + (it.width ?? 0), top: y - size * 0.85, bottom: y + size * 0.22, size });
  }
  return items;
}

/** Ordem padrão de glifos do Macintosh (tabela post do TrueType), índices 0–215. */
const MAC_GLYPHS: string[] = [
  '', '', '', ' ', '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/', ...'0123456789', ':', ';', '<', '=', '>', '?', '@',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '[', '\\', ']', '^', '_', '`', ...'abcdefghijklmnopqrstuvwxyz', '{', '|', '}', '~',
  ...'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»…', ' ', ...'ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄¤‹›', 'fi', 'fl', ...'‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔ', '', ...'ÒÚÛÙı',
];
/** Converte texto de fonte com código = índice do glifo (abaixo de 128 direto; acima, deslocado de 1). */
export function decodeMacGlyphs(s: string): string {
  if (s === ' ') return ' ';
  // O pdf.js troca os glifos 11 "(" e 12 ")" por espaço e, em linha justificada, põe um espaço depois de cada
  // espaço real (\u0003). Se a maioria dos \u0003 vem seguida de " ", o " " é só justificação.
  const spaces = s.split('\u0003').length - 1, spaced = s.split('\u0003 ').length - 1;
  const justified = spaced > spaces / 2;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === ' ') { out += s[i - 1] === '\u0003' ? (justified ? '' : '(') : ')'; continue; }
    const c = ch.charCodeAt(0);
    out += MAC_GLYPHS[c < 128 ? c : c + 1] ?? '';
  }
  return out;
}

// ---------- colunas e linhas ----------
/** Agrupa por linha de base na página toda (as duas colunas juntas) para decidir o layout. */
function rows(items: Item[]): Item[][] {
  const sorted = [...items].sort((a, b) => a.bottom - b.bottom || a.x0 - b.x0);
  const out: Item[][] = [];
  for (const it of sorted) {
    const r = out[out.length - 1];
    if (r && Math.abs(r[0].bottom - it.bottom) <= Math.max(2, Math.min(it.size, r[0].size) * 0.45)) r.push(it); else out.push([it]);
  }
  return out;
}

/**
 * Uma linha atravessa quando há texto ocupando o meio da página. Página de duas colunas quase não tem
 * linhas assim; página de coluna única tem muitas. Faixas que atravessam (questão larga, tabela) viram col 0.
 */
function toLayout(items: Item[], width: number, page: number) {
  const mid = width / 2;
  const ink = items.filter(i => !i.space);
  const rs = rows(ink);
  const crosses = (r: Item[]) => r.some(i => i.x0 < mid - 4 && i.x1 > mid + 4);
  const crossing = rs.filter(crosses);
  const twoCols = rs.length > 4 && crossing.length < rs.length * 0.2 && ink.some(i => i.x0 > mid + 4);
  const lines: PLine[] = [];
  const push = (its: Item[], col: 0 | 1 | 2) => { for (const l of groupLines(its)) lines.push({ ...l, page, col }); };
  if (!twoCols) { push(items, 1); return { lines, twoCols, mid }; }
  // faixas largas: linhas que atravessam o meio, mais o que estiver entre duas delas bem próximas
  const bands: [number, number][] = [];
  for (const r of crossing) {
    const t = Math.min(...r.map(i => i.top)), b = Math.max(...r.map(i => i.bottom)), l = bands[bands.length - 1];
    if (l && t - l[1] < r[0].size * 1.6) l[1] = Math.max(l[1], b); else bands.push([t, b]);
  }
  const inBand = (i: Item) => bands.some(([t, b]) => (i.top + i.bottom) / 2 >= t && (i.top + i.bottom) / 2 <= b);
  push(items.filter(inBand), 0);
  push(items.filter(i => !inBand(i) && i.x0 < mid - 2), 1);
  push(items.filter(i => !inBand(i) && i.x0 >= mid - 2), 2);
  return { lines, twoCols, mid };
}

function groupLines(items: Item[]): (Box & { text: string; size: number; restX0: number })[] {
  // Um vão horizontal muito grande separa sub-colunas (alternativas em grade "A … D …", células de tabela)
  const lines = rows(items).flatMap(r => {
    const ink = r.filter(i => !i.space).sort((a, b) => a.x0 - b.x0), out: Item[][] = [[]];
    let end = -Infinity;
    for (const it of ink) {
      if (out[out.length - 1].length && it.x0 - end > Math.max(24, it.size * 2.5)) out.push([]);
      out[out.length - 1].push(it); end = Math.max(end, it.x1);
    }
    // devolve os espaços explícitos ao segmento em que caem
    for (const sp of r.filter(i => i.space)) (out.find(seg => seg.length && sp.x0 >= seg[0].x0 && sp.x0 <= seg[seg.length - 1].x1) ?? out[0]).push(sp);
    return out.filter(seg => seg.length);
  });
  return lines.map(l => {
    l.sort((a, b) => a.x0 - b.x0);
    const hasSpaces = l.some(i => i.space);
    let out = '', end = -Infinity;
    for (const it of l) {
      if (it.space) { if (out && !out.endsWith(' ')) out += ' '; continue; }
      // sem espaços explícitos, um vão maior que ~1/5 da fonte separa palavras (kerning quebra palavras em pedaços)
      if (out && it.x0 - end > it.size * (hasSpaces ? 0.45 : 0.2) && !out.endsWith(' ') && !it.str.startsWith(' ')) out += ' ';
      out += it.str; end = it.x1;
    }
    const ink = l.filter(i => !i.space);
    if (!ink.length) return null;
    const rest = ink.find(i => !/^\s*([A-E])\1?\s*$/.test(i.str)) ?? ink[0];
    return {
      text: out.replace(/\s+/g, ' ').trim(), size: Math.max(...ink.map(i => i.size)), restX0: rest.x0,
      x0: Math.min(...ink.map(i => i.x0)), x1: Math.max(...ink.map(i => i.x1)), top: Math.min(...ink.map(i => i.top)), bottom: Math.max(...ink.map(i => i.bottom)),
    };
  }).filter((l): l is NonNullable<typeof l> => !!l && !!l.text);
}

/** Versão só-texto (gabaritos e testes): coluna esquerda inteira, depois a direita. */
export function layoutPage(items: (Item | { str: string; x: number; y: number; w: number; h: number })[], width: number): string {
  const norm: Item[] = items.map(i => ('x0' in i ? i : { str: i.str, x0: i.x, x1: i.x + i.w, top: -i.y - i.h, bottom: -i.y, size: i.h }));
  const { lines } = toLayout(norm, width, 1);
  return [0, 1, 2].flatMap(c => lines.filter(l => l.col === c).sort((a, b) => a.bottom - b.bottom).map(l => l.text)).join('\n');
}

// ---------- figuras ----------
/**
 * Tinta que sobra na página depois de apagar o texto: blocos grandes são figuras (foto, gráfico, tabela);
 * traços pequenos encostados em texto (raiz, barra de fração, seta de vetor) marcam linhas de fórmula.
 * Tudo em pontos do PDF; a imagem vem renderizada em `scale`.
 */
function detectFigures(canvas: Canvas, scale: number, items: Item[], height: number, twoCols: boolean, mid: number, page: number): { figures: PFigure[]; marks: Box[] } {
  const W = canvas.width, H = canvas.height, S = scale;
  const px = canvas.getContext('2d').getImageData(0, 0, W, H).data;
  const ink = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < ink.length; i++, p += 4) ink[i] = 0.3 * px[p] + 0.59 * px[p + 1] + 0.11 * px[p + 2] < 200 ? 1 : 0; // ignora marca d'água clara
  const text = new Uint8Array(W * H);
  for (const it of items) {
    if (it.space) continue;
    const x0 = Math.max(0, Math.floor(it.x0 * S) - 1), x1 = Math.min(W, Math.ceil(it.x1 * S) + 1), y0 = Math.max(0, Math.floor(it.top * S) - 1), y1 = Math.min(H, Math.ceil(it.bottom * S) + 1);
    for (let y = y0; y < y1; y++) { ink.fill(0, y * W + x0, y * W + x1); text.fill(1, y * W + x0, y * W + x1); }
  }
  // cabeçalho e rodapé do caderno; fio entre colunas
  const top = Math.floor(H * 0.045), bottom = Math.ceil(H * 0.955);
  for (let y = 0; y < H; y++) if (y < top || y >= bottom) ink.fill(0, y * W, y * W + W);
  if (twoCols) for (let y = 0; y < H; y++) ink.fill(0, y * W + Math.floor((mid - 2) * S), y * W + Math.ceil((mid + 2) * S));

  // componentes conexos com vizinhança dilatada (junta partes do mesmo desenho)
  const label = new Int32Array(W * H).fill(-1);
  const boxes: Box[] = [];
  const stack: number[] = [];
  const R = Math.max(2, Math.round(1.5 * S));
  for (let s = 0; s < ink.length; s++) {
    if (!ink[s] || label[s] >= 0) continue;
    const id = boxes.length; const b = { x0: W, x1: 0, top: H, bottom: 0 };
    label[s] = id; stack.push(s);
    while (stack.length) {
      const q = stack.pop()!, x = q % W, y = (q / W) | 0;
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.top) b.top = y; if (y > b.bottom) b.bottom = y;
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= H) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= W) continue;
          const n = yy * W + xx;
          if (ink[n] && label[n] < 0) { label[n] = id; stack.push(n); }
        }
      }
    }
    boxes.push({ x0: b.x0 / S, x1: (b.x1 + 1) / S, top: b.top / S, bottom: (b.bottom + 1) / S });
  }

  const letters = items.filter(i => /^\s*([A-E])\1?\s*$/.test(i.str));
  const colW = twoCols ? mid : mid * 2;
  const figures: Box[] = [], marks: Box[] = [];
  for (const b of boxes) {
    const w = b.x1 - b.x0, h = b.bottom - b.top;
    if (w < 1.5 && h < 1.5) continue; // poeira
    // bolinha da alternativa: anel em volta de uma letra A–E
    if (w < 26 && h < 26 && letters.some(l => (l.x0 + l.x1) / 2 > b.x0 && (l.x0 + l.x1) / 2 < b.x1 && (l.top + l.bottom) / 2 > b.top && (l.top + l.bottom) / 2 < b.bottom)) continue;
    if (h <= 2 && w > colW * 0.5) continue; // fio horizontal
    if (w <= 2 && h > height * 0.3) continue; // fio vertical
    if ((w >= 22 || h >= 22) && w >= 6 && h >= 6 && w * h >= 500) figures.push(b);
    else marks.push(b);
  }
  const colOf = (b: Box): 0 | 1 | 2 => (!twoCols ? 1 : b.x0 < mid - 8 && b.x1 > mid + 8 ? 0 : b.x0 < mid ? 1 : 2);
  const pageH = H / S, pageW = W / S;
  // junta pedaços próximos (legenda de eixo, partes de um mesmo gráfico), sem atravessar o vão entre colunas
  const merged = ([0, 1, 2] as const).flatMap(col => mergeBoxes(figures.filter(b => colOf(b) === col), 14));
  const final = mergeBoxes(merged, 0).map(b => growSoft(px, text, W, H, S, b))
    // logotipo/código de barras do cabeçalho, rodapé e tarjas laterais não são figuras da questão
    .filter(b => b.bottom > pageH * 0.075 && b.top < pageH * 0.93 && !((b.x0 < 15 || b.x1 > pageW - 15) && b.x1 - b.x0 < 45));
  return {
    figures: final.map(b => ({ x0: b.x0 - 1, x1: b.x1 + 1.5, top: b.top - 1, bottom: b.bottom + 1.5, page, col: colOf(b) })),
    marks,
  };
}

/** Fotos com bordas claras (céu, chão bege) escapam do limiar de tinta: cresce a caixa enquanto a borda não for branca. */
function growSoft(px: Uint8ClampedArray, text: Uint8Array, W: number, H: number, S: number, b: Box): Box {
  const soft = (x: number, y: number) => { const p = (y * W + x) * 4; return 0.3 * px[p] + 0.59 * px[p + 1] + 0.11 * px[p + 2] < 246; };
  const isText = (x: number, y: number) => text[y * W + x] === 1;
  let x0 = Math.floor(b.x0 * S), x1 = Math.ceil(b.x1 * S) - 1, y0 = Math.floor(b.top * S), y1 = Math.ceil(b.bottom * S) - 1;
  const strip = (xa: number, xb: number, ya: number, yb: number) => {
    let n = 0;
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) if (soft(x, y) && !isText(x, y) && ++n >= 3) return true;
    return false;
  };
  const max = 40 * S;
  for (let k = 0, grown = true; grown && k < max; k++) {
    grown = false;
    if (x0 > 0 && strip(x0 - 1, x0 - 1, y0, y1)) { x0--; grown = true; }
    if (x1 < W - 1 && strip(x1 + 1, x1 + 1, y0, y1)) { x1++; grown = true; }
    if (y0 > 0 && strip(x0, x1, y0 - 1, y0 - 1)) { y0--; grown = true; }
    if (y1 < H - 1 && strip(x0, x1, y1 + 1, y1 + 1)) { y1++; grown = true; }
  }
  return { x0: x0 / S, x1: (x1 + 1) / S, top: y0 / S, bottom: (y1 + 1) / S };
}

export function mergeBoxes<T extends Box>(boxes: T[], gap: number): Box[] {
  const out: Box[] = boxes.map(b => ({ x0: b.x0, x1: b.x1, top: b.top, bottom: b.bottom }));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
      const a = out[i], b = out[j];
      if (a.x0 - gap <= b.x1 && b.x0 - gap <= a.x1 && a.top - gap <= b.bottom && b.top - gap <= a.bottom) {
        out[i] = { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) };
        out.splice(j, 1); changed = true; j--;
      }
    }
  }
  return out;
}

// ---------- texto corrompido ----------
/** Linha cujo texto extraído não é confiável ("-)#/°,)%"),#"): quase sem letras nem números. Vira imagem. */
export function garbledLine(text: string): boolean {
  const chars = text.replace(/\s/g, '');
  if (chars.length < 6) return false;
  const ok = (chars.match(/[\p{L}\p{N}]/gu) || []).length;
  if (ok / chars.length < 0.55) return true;
  // fonte que troca letras por acentuadas ("ÜÉêÉÇáíêá~" = "hereditária"): português real tem ~5% de acentos
  const letters = (chars.match(/\p{L}/gu) || []).length;
  const accents = (chars.match(/[ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü~]/g) || []).length;
  return letters >= 6 && accents / letters > 0.35;
}

/** Fonte sem mapa Unicode gera "YLVmR WULFURPiWLFD": poucas vogais e maiúsculas no meio da palavra. */
export function isGarbled(lines: { text: string }[]): boolean {
  if (lines.length >= 10 && lines.filter(l => garbledLine(l.text)).length > lines.length * 0.4) return true;
  const words = lines.flatMap(l => l.text.split(/\s+/)).filter(w => /^[\p{L}]{4,}$/u.test(w));
  if (words.length < 30) return false;
  const ok = words.filter(w => {
    const v = (w.match(/[aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕ]/g) || []).length / w.length;
    const oddCase = /[a-zà-ú][A-ZÀ-Ú]/.test(w);
    return v >= 0.25 && !oddCase;
  }).length;
  return ok / words.length < 0.75;
}
