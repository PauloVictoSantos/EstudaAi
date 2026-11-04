import 'server-only';
import { z } from 'zod';
import type { Explanation, QuestionDoc } from './db';
import { askJson, hasGemini, S, type Input } from './gemini';
import { quotesToSpans, type Analysis, type Comps, type Theme } from './essay';

// Gemini é opcional: sem GEMINI_API_KEY o app segue com o corretor local e a explicação básica.
export const hasAI = hasGemini;

const ExplanationSchema = z.object({ wrong: z.string(), right: z.string(), why: z.string(), next: z.string() });

/** Explica o erro olhando o enunciado e as imagens da questão (figuras, gráficos, alternativas-desenho). */
export async function explainQuestion(q: QuestionDoc, chosen: string, images: { data: Buffer; mime: string; label: string }[]): Promise<Explanation> {
  const opts = q.options.map(o => `${o.k}) ${o.img ? `[imagem${o.t ? `: ${o.t}` : ''}]` : o.t}`).join('\n');
  const input: Input[] = [
    `Questão ${q.number}${q.year ? ` do ENEM ${q.year}` : ''} (${q.subject}):\n${q.statement}\n\n${opts}\n\nGabarito oficial: ${q.answer}. O aluno marcou: ${chosen}.`,
    ...images.flatMap(i => [i.label, { image: i.data, mime: i.mime }] as Input[]),
    `Preencha:\n- wrong: o provável raciocínio que levou à alternativa ${chosen} e onde ele falha\n- right: algo que o aluno provavelmente acertou no caminho\n- why: por que ${q.answer} é a correta\n- next: um próximo passo de estudo concreto`,
  ];
  return askJson(ExplanationSchema, S.obj({ wrong: S.str, right: S.str, why: S.str, next: S.str }),
    'Você é um professor de cursinho brasileiro, acolhedor e direto. Explica em português do Brasil, em frases curtas (no máximo 2 por campo), sem jargão desnecessário. Use as imagens da questão quando forem necessárias. Nunca invente dados que não estejam no enunciado ou nas imagens.',
    input);
}

const KINDS = ['erro', 'meio', 'certo', 'ortografia', 'sinonimo', 'repeticao', 'coesao', 'sentido'] as const;
const AnalysisSchema = z.object({
  marks: z.array(z.object({ quote: z.string(), kind: z.enum(KINDS), severity: z.enum(['red', 'yellow', 'green']), explanation: z.string(), suggestion: z.string(), replace: z.string() })),
  c1: z.number(), c2: z.number(), c3: z.number(), c4: z.number(), c5: z.number(),
});

export async function analyzeEssayAI(text: string, modeLabel: string, theme: Theme): Promise<Analysis> {
  const r = await askJson(AnalysisSchema, S.obj({
    marks: S.arr(S.obj({ quote: S.str, kind: S.enum([...KINDS]), severity: S.enum(['red', 'yellow', 'green']), explanation: S.str, suggestion: S.str, replace: S.str })),
    c1: S.int, c2: S.int, c3: S.int, c4: S.int, c5: S.int,
  }),
    'Você corrige redações no modelo do ENEM (competências C1 a C5, cada uma de 0 a 200 em passos de 40). Seja justo e didático, em português do Brasil.',
    [`Tema: ${theme.title}\nModo de treino: ${modeLabel}\n\nTexto do aluno:\n"""\n${text}\n"""\n\nMarque trechos do texto em "marks". Regras:\n- "quote" deve ser uma cópia EXATA e curta (1 a 8 palavras) de um trecho do texto\n- kind: ortografia/erro (desvio de norma, red), coesao/sentido/repeticao/sinonimo (yellow ou red), meio (parcial, yellow), certo (acerto, green)\n- explanation: 1 frase; suggestion: 1 frase ou vazio; replace: texto substituto exato ou vazio\n- inclua também 2 a 4 acertos (green)\nDepois dê as notas c1..c5. Se o modo não for redação completa ou conclusão, c5 = 0.`],
    { temperature: 0.3 });
  const snap = (v: number) => Math.max(0, Math.min(200, Math.round(v / 40) * 40));
  const competencias: Comps = { c1: snap(r.c1), c2: snap(r.c2), c3: snap(r.c3), c4: snap(r.c4), c5: snap(r.c5) };
  return { spans: quotesToSpans(text, r.marks), competencias, source: 'ia' };
}

const ThemeSchema = z.object({ axis: z.string(), title: z.string(), texts: z.array(z.string()), words: z.array(z.string()) });

export async function generateTheme(used: string[]): Promise<Theme> {
  return askJson(ThemeSchema, S.obj({ axis: S.str, title: S.str, texts: S.arr(S.str), words: S.arr(S.str) }),
    'Você cria propostas de redação inéditas no estilo do ENEM, sobre problemas sociais brasileiros.',
    [`Crie um tema inédito. Evite estes já usados:\n${used.map(t => `- ${t}`).join('\n')}\n\naxis: eixo temático curto (1–2 palavras). title: frase-tema no padrão ENEM. texts: 2 textos motivadores curtos (1 frase cada, sem inventar números exatos). words: 6 palavras-chave do tema.`],
    { temperature: 0.9 });
}
