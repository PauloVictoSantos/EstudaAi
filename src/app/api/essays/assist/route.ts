
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { askJson, hasGemini, S } from '@/lib/gemini';

const Body = z.object({
  kind: z.enum(['argumentos', 'proposta', 'repertorio']),
  label: z.string().max(80).optional(),
  text: z.string().min(1).max(20000),
  theme: z.object({
    axis: z.string(),
    title: z.string(),
    texts: z.array(z.string()),
  }),
});

const Suggestions = z.array(z.string().min(1)).min(1).max(3);

const ASK = {
  argumentos:
    'Gere 3 argumentos distintos, cada um com 1 a 2 frases, apresentando causa e consequência.',
  proposta:
    'Gere 3 propostas de intervenção. Cada uma deve conter agente, ação, meio, finalidade e detalhamento.',
  repertorio:
    'Gere 3 repertórios socioculturais reais e legitimados, como leis, dados oficiais, pensadores ou obras. Explique em uma frase como utilizar cada um.',
};

export async function POST(req: Request) {
  const user = await requireUser();

  if (user instanceof NextResponse) return user;

  const parsed = Body.safeParse(
    await req.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'INVALID_INPUT',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (!hasGemini()) {
    return NextResponse.json(
      { error: 'GEMINI_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const { kind, label, text, theme } = parsed.data;

  const system = `
Você é um professor especialista em redação do ENEM.

Sua função é auxiliar o estudante a desenvolver uma redação
dissertativo-argumentativa de alto desempenho.

REGRAS:
- Escreva em português brasileiro e norma culta.
- Considere o tema, os textos motivadores e a redação do estudante.
- Não invente leis, dados, estatísticas, citações ou repertórios.
- Utilize somente informações reais e verificáveis.
- Evite respostas genéricas e repetitivas.
- Mantenha coerência com a argumentação já desenvolvida.
- Responda exclusivamente com um array JSON de strings.
`;

  const prompt = `
TEMA: ${theme.title}
EIXO: ${theme.axis}

TEXTOS MOTIVADORES:
${theme.texts.map((t, i) => `Texto ${i + 1}: ${t}`).join('\n\n')}

REDAÇÃO ATUAL DO ESTUDANTE:
"""
${text}
"""

${label
    ? `
O estudante deseja preencher a lacuna: [${label}].

Apresente exatamente 3 alternativas curtas, prontas para substituir
essa lacuna, respeitando o contexto e a construção da frase.
`
    : ASK[kind]
}

Retorne no máximo 3 sugestões.
`;

  try {
    const items = await askJson(
      Suggestions,
      S.arr(S.str),
      system,
      [prompt],
      { temperature: 0.3 },
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[ESSAY ASSIST] Gemini error:', error);

    return NextResponse.json(
      { error: 'Não foi possível gerar sugestões agora.' },
      { status: 502 },
    );
  }
}
