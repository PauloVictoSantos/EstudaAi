// Redação: temas, modos de escrita e o corretor local (usado quando não há ANTHROPIC_API_KEY).
export type SpanKind = 'erro' | 'meio' | 'certo' | 'ortografia' | 'sinonimo' | 'repeticao' | 'coesao' | 'sentido';
export type Severity = 'red' | 'yellow' | 'green';
export interface Span { start: number; end: number; kind: SpanKind; severity: Severity; explanation: string; suggestion?: string; replace?: string }
export type Comps = Record<'c1' | 'c2' | 'c3' | 'c4' | 'c5', number>;
export interface Theme { axis: string; title: string; texts: string[]; words: string[] }
export interface Analysis { spans: Span[]; competencias: Comps; source: 'ia' | 'local' }

export const KINDS: Record<SpanKind, string> = {
  erro: 'Erro', meio: 'Parcial', certo: 'Acerto', ortografia: 'Ortografia', sinonimo: 'Sinônimo', repeticao: 'Repetição', coesao: 'Coesão', sentido: 'Sentido',
};

export const MODES: Record<string, { label: string; min: number; model: string; tip: string[] }> = {
  FULL: { label: 'Redação completa', min: 250, model: 'Introdução com repertório e tese → dois parágrafos de desenvolvimento, cada um com tópico frasal, argumento e exemplo → conclusão com proposta de intervenção completa (agente, ação, meio, finalidade e detalhamento).', tip: ['Tese clara no 1º parágrafo', 'Um argumento por parágrafo', 'Proposta com os 5 elementos'] },
  INTRO: { label: 'Introdução', min: 60, model: 'Segundo a Constituição Federal de 1988, todos têm direito à educação. Entretanto, essa garantia não se concretiza plenamente no Brasil, seja pela desigualdade de acesso, seja pela falta de investimento. Assim, é preciso discutir esse cenário.', tip: ['Repertório legitimado', 'Tese com dois eixos', 'Anuncie os argumentos'] },
  DEV: { label: 'Desenvolvimento', min: 90, model: 'Em primeiro lugar, cabe destacar que a exclusão digital limita a autonomia dos idosos. Isso ocorre porque serviços essenciais migraram para aplicativos, de modo que quem não domina a tecnologia passa a depender de terceiros. Dados do IBGE confirmam que essa parcela da população é a que menos acessa a internet.', tip: ['Tópico frasal', 'Explique a causa', 'Feche com dado ou exemplo'] },
  CONC: { label: 'Conclusão', min: 60, model: 'Portanto, cabe ao Ministério da Educação, em parceria com as prefeituras, criar cursos gratuitos de letramento digital para idosos, por meio de oficinas em centros comunitários, a fim de garantir sua autonomia no acesso a serviços públicos.', tip: ['Agente + ação', 'Meio/modo', 'Finalidade e detalhamento'] },
};

export const THEMES: Theme[] = [
  { axis: 'Tecnologia', title: 'Desafios para a inclusão digital da população idosa no Brasil', texts: ['Serviços bancários e públicos migram cada vez mais para aplicativos.', 'Pessoas com 60 anos ou mais são o grupo que menos usa a internet no país (IBGE).'], words: ['idoso', 'digital', 'tecnologia', 'inclusão', 'internet', 'aplicativo', 'autonomia'] },
  { axis: 'Saúde', title: 'Caminhos para combater o estigma associado às doenças mentais na sociedade brasileira', texts: ['A OMS estima que o Brasil é o país com maior prevalência de ansiedade no mundo.', 'O preconceito afasta pessoas do tratamento.'], words: ['saúde mental', 'estigma', 'preconceito', 'tratamento', 'ansiedade', 'depressão', 'doença'] },
  { axis: 'Meio ambiente', title: 'Desafios para a valorização de comunidades e povos tradicionais no Brasil', texts: ['Povos tradicionais preservam biomas e saberes.', 'Conflitos fundiários ameaçam esses territórios.'], words: ['comunidade', 'tradicional', 'indígena', 'quilombola', 'território', 'cultura', 'preservação'] },
  { axis: 'Educação', title: 'Os impactos da desinformação nas redes sociais para a democracia brasileira', texts: ['Notícias falsas circulam mais rápido que as verdadeiras.', 'A educação midiática é apontada como resposta.'], words: ['desinformação', 'notícias falsas', 'redes sociais', 'democracia', 'informação', 'checagem', 'educação midiática'] },
  { axis: 'Cidadania', title: 'Invisibilidade do trabalho de cuidado realizado pela mulher no Brasil', texts: ['Mulheres dedicam quase o dobro de horas semanais a tarefas domésticas e de cuidado.', 'Esse trabalho não é remunerado nem contabilizado no PIB.'], words: ['mulher', 'cuidado', 'trabalho', 'doméstico', 'desigualdade', 'gênero', 'invisibilidade'] },
  { axis: 'Segurança', title: 'Desafios para o enfrentamento da violência contra a mulher no Brasil', texts: ['A Lei Maria da Penha completou mais de 15 anos.', 'Muitos casos ainda não são denunciados.'], words: ['violência', 'mulher', 'denúncia', 'Maria da Penha', 'feminicídio', 'proteção', 'machismo'] },
];

// ---------- corretor local ----------
const SPELL: Record<string, string> = {
  concerteza: 'com certeza', derrepente: 'de repente', apartir: 'a partir', porisso: 'por isso', excessão: 'exceção', previlégio: 'privilégio',
  menas: 'menos', seje: 'seja', esteje: 'esteja', opnião: 'opinião', beneficiente: 'beneficente', impecílio: 'empecilho', paralizar: 'paralisar',
  atravéz: 'através', enchergar: 'enxergar', cidadões: 'cidadãos', mendingo: 'mendigo', asterístico: 'asterisco', cabeleleiro: 'cabeleireiro',
  mortandela: 'mortadela', previnir: 'prevenir', iorgute: 'iogurte', exitar: 'hesitar',
};
const INFORMAL: [RegExp, string, string][] = [
  [/\ba gente\b/gi, 'a sociedade', 'Expressão informal. Na norma culta, prefira "nós" ou um sujeito específico.'],
  [/\bpra\b/gi, 'para', 'Redução da fala. Use "para".'],
  [/\btá\b/gi, 'está', 'Redução da fala. Use "está".'],
  [/\bnéh?\b/gi, '', 'Marca de oralidade. Retire.'],
  [/\btipo assim\b/gi, '', 'Marca de oralidade. Retire.'],
  [/\b(?:hoje em dia|nos dias de hoje)\b/gi, 'na contemporaneidade', 'Clichê. Contextualize com um dado ou fato.'],
];
const VAGUE: [RegExp, string, string][] = [
  [/\bmuito importante\b/gi, 'fundamental', 'Adjetivo genérico. Um termo mais preciso fortalece a argumentação.'],
  [/\buma coisa\b/gi, 'um fator', '"Coisa" é vago. Nomeie o conceito.'],
  [/\binteressante\b/gi, 'relevante', 'Avaliação vaga. Diga por que é relevante.'],
];
const SYN: Record<string, string> = { idosos: 'essa parcela da população', problema: 'entrave', importante: 'relevante', sociedade: 'coletividade', pessoas: 'indivíduos', governo: 'poder público', situação: 'cenário', brasil: 'país' };
const STOP = new Set('sobre entre quando porque também ainda muito mesmo assim sendo forma maior todos todas cada sempre apenas outro outra outros outras estão sobre desse dessa disso nesse nessa nisso aquele aquela pelos pelas'.split(' '));
const GOOD_CONN = /\b(contudo|entretanto|todavia|no entanto|portanto|além disso|dessa forma|desse modo|nesse sentido|em primeiro lugar|em segundo lugar|por conseguinte|ademais|assim sendo|logo|sob esse viés)\b/gi;
const CAUSE = /\b(pois|porque|já que|visto que|uma vez que|devido a|em virtude de)\b/gi;
const REPERTOIRE = /\b(constitui[çc][ãa]o|segundo [A-ZÀ-Ú]\w+|de acordo com|conforme|IBGE|OMS|ONU|fil[óo]sofo|soci[óo]log[oa]|lei (?:n|maria)|declara[çc][ãa]o universal)/gi;
const AGENT = /\b(governo|minist[ée]rio|estado|poder p[úu]blico|prefeituras?|escolas?|m[íi]dia|ONGs?|fam[íi]lias?|sociedade civil|congresso)\b/i;
const ACTION = /\b(deve|devem|cabe|precisa|é necess[áa]rio|criar|promover|ampliar|implementar)\b/i;
const MEANS = /\b(por meio d[eoa]s?|mediante|atrav[ée]s d[eoa]s?|por interm[ée]dio)\b/i;
const GOAL = /\b(a fim de|para que|com o (?:objetivo|intuito)|com a finalidade)\b/i;
const DETAIL = /\b(como|por exemplo|tais como|gratuit[oa]s?|semanais|nas escolas|em parceria)\b/i;

const snap = (v: number) => Math.max(0, Math.min(200, Math.round(v / 40) * 40));

export function analyzeLocal(text: string, mode: string, themeWords: string[]): Analysis {
  const spans: Span[] = [];
  const add = (s: Span) => { if (!spans.some(x => x.start < s.end && s.start < x.end)) spans.push(s); };
  const lower = text.toLowerCase();

  for (const m of text.matchAll(/\p{L}+/gu)) {
    const w = m[0].toLowerCase(), fix = SPELL[w];
    if (fix) add({ start: m.index!, end: m.index! + m[0].length, kind: 'ortografia', severity: 'red', explanation: `Grafia incorreta.`, suggestion: `Escreva "${fix}".`, replace: fix });
  }
  for (const [re, rep, why] of INFORMAL) for (const m of text.matchAll(re)) add({ start: m.index!, end: m.index! + m[0].length, kind: 'erro', severity: 'red', explanation: why, suggestion: rep ? `Troque por "${rep}".` : 'Retire a expressão.', replace: rep });
  for (const [re, rep, why] of VAGUE) for (const m of text.matchAll(re)) add({ start: m.index!, end: m.index! + m[0].length, kind: 'sinonimo', severity: 'yellow', explanation: why, suggestion: `Ex.: "${rep}".`, replace: rep });
  for (const m of text.matchAll(/(^|\n)\s*(E)\s/g)) { const at = m.index! + m[0].indexOf('E'); add({ start: at, end: at + 1, kind: 'coesao', severity: 'red', explanation: 'Não inicie parágrafo com "E": ele não retoma o parágrafo anterior.', suggestion: 'Use "Além disso".', replace: 'Além disso,' }); }
  for (const m of text.matchAll(/\bonde\b/gi)) add({ start: m.index!, end: m.index! + 4, kind: 'coesao', severity: 'yellow', explanation: '"Onde" só retoma lugar físico. Se não for lugar, use "em que" ou "no qual".', suggestion: 'Troque por "em que".', replace: 'em que' });

  const counts = new Map<string, number[]>();
  for (const m of text.matchAll(/\p{L}{5,}/gu)) { const w = m[0].toLowerCase(); if (STOP.has(w)) continue; counts.set(w, [...(counts.get(w) ?? []), m.index!]); }
  for (const [w, idx] of counts) if (idx.length >= 3) idx.slice(1).forEach(i => add({ start: i, end: i + w.length, kind: 'repeticao', severity: 'yellow', explanation: `"${w}" aparece ${idx.length} vezes.`, suggestion: SYN[w] ? `Varie com "${SYN[w]}".` : 'Use um sinônimo ou pronome.', replace: SYN[w] }));

  for (const m of text.matchAll(GOOD_CONN)) add({ start: m.index!, end: m.index! + m[0].length, kind: 'certo', severity: 'green', explanation: 'Bom conectivo: articula as ideias.' });
  for (const m of text.matchAll(REPERTOIRE)) add({ start: m.index!, end: m.index! + m[0].length, kind: 'certo', severity: 'green', explanation: 'Repertório legitimado: fortalece a argumentação.' });
  spans.sort((a, b) => a.start - b.start);

  const words = (text.match(/\p{L}+/gu) || []).length, min = MODES[mode]?.min ?? 250, short = Math.min(1, words / min);
  const red = spans.filter(s => s.severity === 'red').length;
  const conn = new Set([...lower.matchAll(GOOD_CONN)].map(m => m[0])).size;
  const cause = [...lower.matchAll(CAUSE)].length, rep = [...text.matchAll(REPERTOIRE)].length;
  const themeHits = themeWords.filter(w => lower.includes(w.toLowerCase())).length;
  const repetitions = spans.filter(s => s.kind === 'repeticao').length;
  const lastPara = text.trim().split(/\n\s*\n/).pop() ?? '';
  const proposal = [AGENT, ACTION, MEANS, GOAL, DETAIL].filter(r => r.test(lastPara)).length;
  const competencias: Comps = {
    c1: snap((200 - red * 40) * (0.5 + short / 2)),
    c2: snap((80 + themeHits * 30 + (rep ? 40 : 0)) * short),
    c3: snap((60 + cause * 30 + rep * 30) * short),
    c4: snap((60 + conn * 30 - repetitions * 15) * short),
    c5: mode === 'FULL' || mode === 'CONC' ? snap(proposal * 40) : 0,
  };
  return { spans, competencias, source: 'local' };
}

/** Converte trechos citados (ex.: vindos do Claude) em posições no texto. */
export function quotesToSpans(text: string, items: (Omit<Span, 'start' | 'end'> & { quote: string })[]): Span[] {
  const out: Span[] = [];
  for (const { quote, ...rest } of items) {
    if (!quote) continue;
    let from = 0, at = -1;
    while ((at = text.indexOf(quote, from)) >= 0 && out.some(s => s.start < at + quote.length && at < s.end)) from = at + 1;
    if (at >= 0) out.push({ ...rest, start: at, end: at + quote.length, replace: rest.replace || undefined, suggestion: rest.suggestion || undefined });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Mantém os destaques no lugar enquanto o aluno digita (antes da nova correção chegar). */
export function mapSpans(spans: Span[], before: string, after: string): Span[] {
  let p = 0; while (p < before.length && p < after.length && before[p] === after[p]) p++;
  let s = 0; while (s < before.length - p && s < after.length - p && before[before.length - 1 - s] === after[after.length - 1 - s]) s++;
  const endOld = before.length - s, delta = after.length - before.length;
  return spans.flatMap(sp => (sp.end <= p ? [sp] : sp.start >= endOld ? [{ ...sp, start: sp.start + delta, end: sp.end + delta }] : []));
}

export const countWords = (t: string) => (t.match(/\p{L}+/gu) || []).length;
