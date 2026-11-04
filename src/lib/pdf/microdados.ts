// Parâmetros oficiais dos itens (a, b, c) publicados pelo INEP nos microdados do ENEM, arquivo
// ITENS_PROVA_AAAA.csv. Segundo "ENEM – Procedimentos de Análise" (Inep, 2021), os parâmetros são
// divulgados cinco anos após a edição; o modelo é o logístico de 3 parâmetros na escala (0,1).
import type { ItemParams } from '../tri';

export interface OfficialItem extends ItemParams { year: number; number: number; area: string; color: string; lang: 'ingles' | 'espanhol' | null; answer: string | null; abandoned: boolean; skill: number | null }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

/** Aceita UTF-8 ou Latin-1 (os microdados vêm em Latin-1) e separador ";" ou ",". */
export function parseItensProva(bytes: Uint8Array, year: number): OfficialItem[] {
  let text = new TextDecoder('utf-8').decode(bytes);
  if (text.includes('�')) text = new TextDecoder('latin1').decode(bytes);
  const lines = text.split(/\r?\n/).filter(Boolean);
  const sep = lines[0].includes(';') ? ';' : ',';
  const head = lines[0].split(sep).map(h => norm(h.replace(/"/g, '')));
  const col = (name: string) => head.indexOf(name);
  const c = { pos: col('CO_POSICAO'), area: col('SG_AREA'), gab: col('TX_GABARITO'), skill: col('CO_HABILIDADE'), aban: col('IN_ITEM_ABAN'), a: col('NU_PARAM_A'), b: col('NU_PARAM_B'), cc: col('NU_PARAM_C'), cor: col('TX_COR'), lang: col('TP_LINGUA'), adapt: col('IN_ITEM_ADAPTADO') };
  if (c.pos < 0 || c.a < 0 || c.b < 0 || c.cc < 0) throw new Error('CSV sem as colunas CO_POSICAO / NU_PARAM_A / NU_PARAM_B / NU_PARAM_C');
  const num = (s: string) => Number((s ?? '').replace(/"/g, '').replace(',', '.'));
  const out: OfficialItem[] = [];
  for (const line of lines.slice(1)) {
    const f = line.split(sep).map(x => x.replace(/"/g, '').trim());
    if (c.adapt >= 0 && f[c.adapt] === '1') continue; // versão adaptada (ledor, braile)
    let a = num(f[c.a]), b = num(f[c.b]);
    const cc = num(f[c.cc]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(cc) || !a) continue;
    // se vierem na escala (500,100): b = 100·b(0,1) + 500 e a = a(0,1)/100
    if (Math.abs(b) > 50) { b = (b - 500) / 100; a = a * 100; }
    const lang = c.lang >= 0 && f[c.lang] !== '' ? (f[c.lang] === '0' ? 'ingles' : f[c.lang] === '1' ? 'espanhol' : null) : null;
    out.push({
      year, number: num(f[c.pos]), area: f[c.area], color: norm(f[c.cor] ?? ''), lang, a, b, c: cc,
      answer: f[c.gab] || null, abandoned: f[c.aban] === '1', skill: c.skill >= 0 ? num(f[c.skill]) || null : null,
    });
  }
  return out;
}

/** Procura o item oficial da questão (mesmo ano, posição, cor do caderno e idioma). */
export function findOfficial(items: OfficialItem[], q: { year: number | null; number: number; color: string | null; variant: string | null }): OfficialItem | null {
  if (!q.year) return null;
  const cands = items.filter(i => i.year === q.year && i.number === q.number && (!q.variant || !i.lang || i.lang === q.variant));
  return cands.find(i => q.color && i.color.startsWith(norm(q.color).slice(0, 4))) ?? null;
}
