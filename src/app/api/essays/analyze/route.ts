
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { askJson, hasGemini, S } from '@/lib/gemini';
import { analyzeLocal, quotesToSpans } from '@/lib/essay';

// Dados recebidos do frontend
const Body = z.object({
  text: z.string().min(1).max(20000),
  mode: z.enum(['FULL', 'INTRO', 'DEV', 'CONC']),
  theme: z.object({
    axis: z.string(),
    title: z.string(),
    texts: z.array(z.string()),
    words: z.array(z.string()),
  }).optional(),
});

// Competências do ENEM
const competenceSchema = z.object({
  c1: z.number().int().min(0).max(200),
  c2: z.number().int().min(0).max(200),
  c3: z.number().int().min(0).max(200),
  c4: z.number().int().min(0).max(200),
  c5: z.number().int().min(0).max(200),
});

// Trechos identificados pela IA
const spanSchema = z.object({
  quote: z.string().min(1),
  kind: z.enum([
    'erro',
    'meio',
    'certo',
    'ortografia',
    'sinonimo',
    'repeticao',
    'coesao',
    'sentido',
  ]),
  severity: z.enum(['red', 'yellow', 'green']),
  explanation: z.string(),
  suggestion: z.string().optional(),
  replace: z.string().optional(),
});

const ResultSchema = z.object({
  spans: z.array(spanSchema),
  competencias: competenceSchema,
});

const ResultJsonSchema = S.obj({
  spans: S.arr(
    S.obj({
      quote: S.str,
      kind: S.enum([
        'erro',
        'meio',
        'certo',
        'ortografia',
        'sinonimo',
        'repeticao',
        'coesao',
        'sentido',
      ]),
      severity: S.enum(['red', 'yellow', 'green']),
      explanation: S.str,
      suggestion: S.str,
      replace: S.str,
    }, ['quote', 'kind', 'severity', 'explanation'])
  ),
  competencias: S.obj({
    c1: S.int,
    c2: S.int,
    c3: S.int,
    c4: S.int,
    c5: S.int,
  }),
});

// Instruções para o Gemini
const SYSTEM = `
Você é um corretor especialista na redação do ENEM.

Avalie a redação considerando rigorosamente as cinco competências oficiais:

C1: Domínio da modalidade escrita formal da língua portuguesa.
C2: Compreensão do tema, atendimento ao gênero dissertativo-argumentativo
e utilização de repertório sociocultural.
C3: Seleção, organização e interpretação de informações, fatos e argumentos.
C4: Conhecimento dos mecanismos linguísticos necessários à argumentação.
C5: Elaboração de proposta de intervenção que respeite os direitos humanos.

REGRAS:
- Cada competência deve receber uma nota entre 0 e 200.
- Utilize apenas notas em intervalos de 40 pontos.
- Não atribua nota alta sem evidências no texto.
- Não invente informações sobre o estudante.
- Identifique problemas reais, sem marcar frases corretas como erros.
- Considere o modo de escrita solicitado.
- Não penalize a ausência de conclusão quando o modo não exigir uma redação completa.
- Os trechos citados devem ser cópias literais do texto original.
- Não invente citações ou altere o texto original ao indicar um trecho.
- Escreva explicações objetivas e sugestões práticas.
- Responda exclusivamente no formato JSON solicitado.
`;

// POST: analisa a redação
export async function POST(req: Request) {
  try {
    const user = await requireUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const body = await req.json().catch(() => null);
    const parsed = Body.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'INVALID_INPUT',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { text, mode, theme } = parsed.data;
    const themeWords = theme?.words ?? [];

    // Sem Gemini, utiliza o corretor local.
    if (!hasGemini()) {
      return NextResponse.json(
        analyzeLocal(text, mode, themeWords)
      );
    }

    const prompt = `
TEMA: ${theme?.title ?? 'Não informado'}

EIXO TEMÁTICO: ${theme?.axis ?? 'Não informado'}

MODO DE CORREÇÃO: ${mode}

TEXTOS MOTIVADORES:
${theme?.texts?.map((t, i) => `Texto ${i + 1}: ${t}`).join('\n\n') ?? 'Não informados'}

PALAVRAS-CHAVE:
${themeWords.join(', ') || 'Não informadas'}

REDAÇÃO DO ESTUDANTE:
"""
${text}
"""

Analise a redação conforme os critérios do ENEM.

Para cada problema ou acerto relevante, indique:
- quote: trecho literal retirado da redação;
- kind: classificação do trecho;
- severity: red, yellow ou green;
- explanation: justificativa;
- suggestion: sugestão de melhoria, quando aplicável;
- replace: substituição sugerida, quando aplicável.

Evite destacar trechos excessivamente longos.
Não invente trechos que não estejam na redação.

Retorne as cinco competências com notas de 0 a 200.
`;

    try {
      const result = await askJson(
        ResultSchema,
        ResultJsonSchema,
        SYSTEM,
        [prompt],
        { temperature: 0.2 }
      );

      const spans = quotesToSpans(text, result.spans);

      return NextResponse.json({
        spans,
        competencias: result.competencias,
        source: 'ia',
      });
    } catch (error) {
      console.error('[ESSAY_ANALYZE_GEMINI_ERROR]', error);

      // Se o Gemini falhar, o corretor local continua funcionando.
      return NextResponse.json(
        analyzeLocal(text, mode, themeWords)
      );
    }
  } catch (error) {
    console.error('[ESSAY_ANALYZE_ERROR]', error);

    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
