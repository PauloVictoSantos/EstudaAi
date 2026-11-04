// Classifica o assunto da questão por palavras-chave do enunciado. Sem acerto, fica o nome da área.
import { AREAS, type Area } from '../areas';

const RULES: Record<Area, [string, RegExp][]> = {
  MT: [
    ['Probabilidade', /probabilidade|chance de|sorte(?:ad|i)|dado(?:s)? (?:honesto|lançad)/i],
    ['Estatística', /m[ée]dia aritm|mediana|\bmoda\b|desvio padr|gr[áa]fico de (?:barras|setores)/i],
    ['Porcentagem', /porcentagem|percentual|\d+\s?%|desconto|juros|acr[ée]scimo/i],
    ['Geometria', /[áa]rea|per[íi]metro|volume|tri[âa]ngulo|ret[âa]ngul|c[íi]rculo|cilindro|cubo|esfera|diagonal|[âa]ngulo/i],
    ['Funções', /fun[çc][ãa]o|f\(x\)|gr[áa]fico da|par[áa]bola|exponencial|logaritm/i],
    ['Razão e proporção', /raz[ãa]o|propor[çc]|escala|regra de tr[êe]s|grandezas/i],
    ['Análise combinatória', /de quantas maneiras|combina[çc]|arranjo|permuta/i],
  ],
  CN: [
    ['Física', /velocidade|acelera[çc]|for[çc]a|energia (?:cin|pot)|corrente el[ée]tric|tens[ãa]o el|resist[êe]ncia|onda|frequ[êe]ncia|calor|temperatura|press[ãa]o|[óo]ptic|lente|espelho/i],
    ['Química', /\bph\b|mol(?:ar|s)?\b|rea[çc][ãa]o qu[íi]m|[áa]cido|base|[íi]on|el[ée]tron|liga[çc][ãa]o|composto|solu[çc][ãa]o|oxida|combust[ãa]o|polímer|org[âa]nic/i],
    ['Ecologia', /ecossistema|cadeia alimentar|bioma|esp[ée]cie invasora|popula[çc][ãa]o de|ambiental|polui|desmatamento/i],
    ['Genética', /gen[ée]tic|gene|alelo|cromoss|DNA|RNA|heredit|muta[çc]/i],
    ['Biologia', /c[ée]lula|organela|mitoc[ôo]ndria|prote[íi]na|enzima|v[íi]rus|bact[ée]ria|vacina|horm[ôo]nio|fotoss[íi]ntese|sistema (?:nervoso|imune|digest)/i],
  ],
  CH: [
    ['Filosofia', /fil[óo]sof|Plat[ãa]o|Arist[óo]teles|Kant|Descartes|Nietzsche|Rousseau|Hobbes|Locke|[ée]tica/i],
    ['Sociologia', /sociolog|Durkheim|Weber|Marx|movimentos? soci|desigualdade social|cidadania/i],
    ['Geografia', /urbaniza|clima|relevo|bacia hidrogr|migra[çc]|globaliza|agropecu|territ[óo]rio|cartogra|geopol/i],
    ['História', /s[ée]culo|imp[ée]rio|rep[úu]blica|col[ôo]ni|escravid|ditadura|revolu[çc]|guerra|Idade M[ée]dia|era Vargas/i],
  ],
  LC: [
    ['Inglês', /\b(the|and|of|to|is|are)\b.*\b(the|and|of)\b/],
    ['Espanhol', /\b(el|los|las|del|una|pero|también|está)\b.*\b(el|los|las|del)\b/i],
    ['Literatura', /poema|poeta|romance|narrador|Modernismo|Romantismo|Realismo|Barroco|Machado de Assis|literári/i],
    ['Gramática', /crase|concord[âa]ncia|reg[êe]ncia|conjun[çc][ãa]o|pronome|verbo|ora[çc][ãa]o|sintax|morfolog/i],
    ['Artes', /pintura|escultura|obra de arte|artista|m[úu]sica|dan[çc]a|teatro|cinema/i],
    ['Educação física', /esporte|atividade f[íi]sica|corpo|exerc[íi]cio/i],
    ['Interpretação', /texto|autor|leitor|g[êe]nero textual|argument/i],
  ],
  GERAL: [
    ['Português', /crase|concord[âa]ncia|reg[êe]ncia|pontua[çc]|ortograf|texto|sin[ôo]nimo|pronome/i],
    ['Matemática', /porcentagem|raz[ãa]o|propor[çc]|equa[çc]|juros|probabilidade/i],
    ['Raciocínio lógico', /proposi[çc]|l[óo]gic|verdadeir[ao] ou fals|nega[çc][ãa]o de|silog/i],
    ['Direito', /constitui[çc]|lei n|artigo \d|direito|servidor p[úu]blico|administra[çc][ãa]o p[úu]blica/i],
    ['Informática', /windows|excel|word|navegador|planilha|e-?mail|internet|backup|v[íi]rus de comput/i],
  ],
};

export function classifySubject(area: Area, text: string, variant?: string | null): string {
  if (variant === 'ingles') return 'Inglês';
  if (variant === 'espanhol') return 'Espanhol';
  for (const [name, re] of RULES[area] ?? []) if (re.test(text)) return name;
  return AREAS[area];
}
