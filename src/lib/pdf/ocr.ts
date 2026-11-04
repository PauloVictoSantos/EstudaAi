// Leitura de páginas pelo Gemini quando a camada de texto do PDF está corrompida (fonte sem mapa
// Unicode, PDF escaneado). O Gemini vê a imagem da página, transcreve as questões e aponta onde
// estão as figuras; as figuras são recortadas da própria página, então ficam iguais ao caderno.
import { z } from 'zod';
import { askJson, S } from '../gemini';
import type { Box, PageLayout } from './extract';
import { enemAreaByNumber, type Block, type ParsedQuestion, type FigureRef } from './parse';

const Box2d = z.array(z.number()).length(4);
const PageSchema = z.object({
  questions: z.array(z.object({
    number: z.number().int(), // 0 = continuação da questão que veio da página anterior
    variant: z.enum(['', 'ingles', 'espanhol']),
    region: Box2d,
    content: z.array(z.object({ kind: z.enum(['text', 'figure']), text: z.string(), box: z.array(z.number()) })),
    options: z.array(z.object({ k: z.enum(['A', 'B', 'C', 'D', 'E']), t: z.string(), box: z.array(z.number()) })),
  })),
});
const box2d = { type: 'array', items: S.int, minItems: 4, maxItems: 4 };
const PAGE_JSON = S.obj({
  questions: S.arr(S.obj({
    number: S.int, variant: S.enum(['', 'ingles', 'espanhol']), region: box2d,
    content: S.arr(S.obj({ kind: S.enum(['text', 'figure']), text: S.str, box: S.arr(S.int) })),
    options: S.arr(S.obj({ k: S.enum(['A', 'B', 'C', 'D', 'E']), t: S.str, box: S.arr(S.int) })),
  })),
});

const SYSTEM = `Você transcreve páginas de cadernos de prova (ENEM) com fidelidade absoluta, em português.
Regras:
- Leia na ordem do caderno: coluna esquerda inteira, depois a direita (faixas de largura inteira na posição em que aparecem).
- Transcreva o texto exatamente como impresso (mesma grafia, pontuação e quebras de parágrafo com \\n). Não corrija, não resuma, não invente.
- Figuras, gráficos, tabelas, mapas, fórmulas desenhadas e tirinhas viram itens kind="figure" com box no formato [ymin, xmin, ymax, xmax] normalizado de 0 a 1000; em "text" ponha uma descrição curta da figura.
- Alternativas A–E vão em "options". Se a alternativa for um desenho/fórmula, preencha "box" com a área dela (sem a letra); senão box = [].
- number: o número da questão; use 0 para a parte de uma questão que começou na página anterior.
- variant: "ingles" ou "espanhol" para as questões de língua estrangeira; "" nas demais.
- region: área da questão inteira nesta página [ymin, xmin, ymax, xmax].
- Ignore cabeçalho, rodapé, número da página, códigos de barras e instruções gerais da prova.`;

const toBox = (b: number[], p: PageLayout): Box => ({ top: (b[0] / 1000) * p.height, x0: (b[1] / 1000) * p.width, bottom: (b[2] / 1000) * p.height, x1: (b[3] / 1000) * p.width });
const valid = (b: number[]) => b.length === 4 && b[2] > b[0] && b[3] > b[1];

/** Lê todas as páginas com o Gemini e junta as partes de questões que atravessam páginas. */
export async function ocrQuestions(pages: PageLayout[], pagePng: (n: number) => Promise<Buffer>, log: (s: string) => void, year?: number | null): Promise<ParsedQuestion[]> {
  const out: ParsedQuestion[] = [];
  for (const p of pages) {
    let r: z.infer<typeof PageSchema>;
    try {
      r = await askJson(PageSchema, PAGE_JSON, SYSTEM, [{ image: await pagePng(p.page), mime: 'image/png' }, `Página ${p.page}. Transcreva as questões desta página.`], { temperature: 0 });
    } catch (e) { log(`  ! página ${p.page}: Gemini falhou (${e instanceof Error ? e.message : e})`); continue; }
    for (const q of r.questions) {
      const content: Block[] = q.content.map(c => (c.kind === 'figure' && valid(c.box) ? { type: 'figure', page: p.page, box: toBox(c.box, p), alt: c.text } : { type: 'text', text: c.text }));
      const options = q.options.map(o => ({ k: o.k, t: o.t, figure: valid(o.box) ? ({ page: p.page, box: toBox(o.box, p), alt: o.t } as FigureRef) : undefined }));
      const region = valid(q.region) ? [{ page: p.page, box: toBox(q.region, p) }] : [];
      const prev = out[out.length - 1];
      if (q.number === 0 && prev) {
        prev.content.push(...content);
        if (!prev.options.length) prev.options = options;
        prev.regions.push(...region);
        continue;
      }
      if (q.number <= 0) continue;
      out.push({ number: q.number, variant: q.variant || null, area: enemAreaByNumber(q.number, year), page: p.page, content, options, regions: region, statement: '' });
    }
    log(`  página ${p.page}/${pages.length} lida pelo Gemini`);
  }
  return out
    .filter(q => q.options.length >= 4)
    .map(q => ({ ...q, statement: q.content.map(c => (c.type === 'text' ? c.text : `[Figura: ${c.alt}]`)).join('\n\n') }));
}
