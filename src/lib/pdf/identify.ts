// Descobre o que é cada PDF da pasta (prova ou gabarito, ano, dia, caderno, cor), pelo nome e pelo conteúdo.
// Os nomes do INEP mudam todo ano: "2023_PV_impresso_D1_CD1", "GAB_ENEM_2016_DIA_1_01_AZUL",
// "cad_5_gabarito_amarelo_12112017", "2DIA_05_AMARELO_BAIXA", "gabarito_1_dia_caderno_1_azul_aplicacao_regular"...
export type FileKind = 'prova' | 'gabarito' | 'outro';
export interface FileId { kind: FileKind; year: number | null; day: 1 | 2 | null; caderno: number | null; color: string | null; enem: boolean }

const COLORS = ['AZUL', 'AMARELO', 'BRANCO', 'BRANCA', 'ROSA', 'CINZA', 'VERDE', 'LARANJA', 'ROXO'];

export function identify(fileName: string, firstPages: string, pageCount: number): FileId {
  const name = fileName.replace(/\.[a-z]+$/i, '');
  const text = firstPages.replace(/\s+/g, ' ');
  const N = name.toUpperCase(), T = text.toUpperCase();

  const keyByName = /GABARITO|(^|[\s_.-])GA?B([\s_.-]|$)/.test(N);
  const keyByText = pageCount <= 3 && /GABARITO/.test(T) && (text.match(/\b\d{1,3}\s+(?:[A-E]|Anulad[oa])\b/g)?.length ?? 0) >= 20;
  const prova = pageCount >= 8 && (/QUEST[ÃA]O\s*0?\d/.test(T) || /CADERNO DE QUEST/.test(T) || /\bDIA\b/.test(T));
  const kind: FileKind = keyByName || keyByText ? 'gabarito' : prova && !/PROCEDIMENTOS DE AN[ÁA]LISE|NOTA T[ÉE]CNICA/.test(T) ? 'prova' : 'outro';

  const enem = /EXAME NACIONAL DO ENSINO M[ÉE]DIO|\bENEM\b/.test(T) || /ENEM|_PV_|_GB_|_D[12]_CD\d/.test(N) 
    || /LINGUAGENS, C[ÓO]DIGOS|CI[ÊE]NCIAS DA NATUREZA E SUAS|CI[ÊE]NCIAS HUMANAS E SUAS|MATEM[ÁA]TICA E SUAS TECNOLOGIAS/.test(T);

  const yearIn = (s: string) => {
    const m = s.match(/(?:^|\D)(20[0-3]\d)(?:\D|$)/);
    return m ? +m[1] : null;
  };
  // "12112017" (data de aplicação) também vale: pega os 4 últimos dígitos se forem um ano
  const dateYear = N.match(/\d{4}(20[0-3]\d)(?:\D|$)/)?.[1];
  const year = yearIn(N) ?? (dateYear ? +dateYear : null) ?? yearIn(T.match(/GABARITO\s*(20\d\d)/)?.[0] ?? '') ?? yearIn(T.match(/ENEM\s?(20\d\d)/)?.[0] ?? '') ?? null;

  const dayM = N.match(/(?:^|[_\s-])D([12])(?:[_\s-]|$)/) ?? N.match(/DIA[_\s-]?([12])(?:\D|$)/) ?? N.match(/(?:^|\D)([12])[_\s-]?DIA/) ?? T.match(/([12])\s*[º°ºo]+\s*DIA/) ?? T.match(/([12])\s*DIA\b/);
  const day = dayM ? (+dayM[1] as 1 | 2) : null;

  const cadM = N.match(/CD[_\s-]?0?(\d{1,2})(?:\D|$)/) ?? N.match(/CAD(?:ERNO)?[_\s-]?0?(\d{1,2})(?:\D|$)/) ?? N.match(/(?:^|[_\s-])0?(\d{1,2})[_\s-](?:AZUL|AMARELO|BRANCO|ROSA|CINZA|VERDE)/) ?? T.match(/CADERNO\s*0?(\d{1,2})\b/);
  const caderno = cadM ? +cadM[1] : null;

  const color = COLORS.find(c => N.includes(c)) ?? COLORS.find(c => new RegExp(`CADERNO\\s*\\d+\\s*[–\\-•|]?\\s*${c}`).test(T) || new RegExp(`\\b${c}\\b`).test(T.slice(0, 600))) ?? null;
  return { kind, year, day, caderno, color: color === 'BRANCA' ? 'BRANCO' : color, enem };
}

export interface FileEntry { name: string; id: FileId }
export interface Group { key: string; title: string; enem: boolean; year: number | null; files: FileEntry[] }

/**
 * Agrupa por ano (ENEM: 1º e 2º dia juntos, a numeração não se repete). Arquivos sem ano
 * herdam o ano do único grupo que tem a peça faltando (ex.: prova do 2º dia sem gabarito).
 */
export function groupFiles(entries: FileEntry[]): { groups: Group[]; ignored: { name: string; reason: string }[] } {
  const ignored: { name: string; reason: string }[] = [];
  const enem = entries.filter(e => e.id.kind !== 'outro' && e.id.enem);
  const other = entries.filter(e => e.id.kind !== 'outro' && !e.id.enem);
  for (const e of entries.filter(e => e.id.kind === 'outro')) ignored.push({ name: e.name, reason: 'não é prova nem gabarito (documento de referência)' });

  const byYear = new Map<number, FileEntry[]>();
  const pending = enem.filter(e => e.id.year == null);
  for (const e of enem.filter(e => e.id.year != null)) byYear.set(e.id.year!, [...(byYear.get(e.id.year!) ?? []), e]);
  const has = (y: number, kind: FileKind, day: number | null) => (byYear.get(y) ?? []).some(f => f.id.kind === kind && (day == null || f.id.day === day));
  // primeiro os que têm par conhecido, depois os outros (a cada atribuição a lacuna muda)
  for (let progress = true; progress && pending.length;) {
    progress = false;
    for (const e of [...pending]) {
      const other = e.id.kind === 'prova' ? 'gabarito' : 'prova';
      const cands = [...byYear.keys()].filter(y => !has(y, e.id.kind, e.id.day) && (e.id.day == null || has(y, other, e.id.day)));
      if (cands.length === 1) {
        byYear.get(cands[0])!.push({ ...e, id: { ...e.id, year: cands[0] } });
        pending.splice(pending.indexOf(e), 1); progress = true;
      }
    }
  }
  for (const e of pending) ignored.push({ name: e.name, reason: 'não foi possível descobrir o ano (renomeie incluindo o ano, ex.: 2019_...)' });

  const groups: Group[] = [...byYear].sort((a, b) => a[0] - b[0]).map(([y, files]) => ({ key: `enem-${y}`, title: `ENEM ${y}`, enem: true, year: y, files }));
  // Outras provas: arquivo de prova + gabarito com o mesmo nome-base
  const base = (n: string) => n.replace(/\.[a-z]+$/i, '').replace(/[\s_.-]*(gabarito|gab|gb)[\s_.-]*/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  for (const p of other.filter(e => e.id.kind === 'prova')) {
    const keys = other.filter(k => k.id.kind === 'gabarito' && base(k.name) === base(p.name));
    groups.push({ key: base(p.name).replace(/[^a-z0-9]+/g, '-'), title: p.name.replace(/\.[a-z]+$/i, ''), enem: false, year: p.id.year, files: [p, ...keys] });
  }
  for (const k of other.filter(e => e.id.kind === 'gabarito' && !groups.some(g => g.files.includes(e)))) ignored.push({ name: k.name, reason: 'gabarito sem prova correspondente' });
  return { groups, ignored };
}
