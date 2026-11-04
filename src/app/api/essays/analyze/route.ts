import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { analyzeEssayAI, hasAI } from '@/lib/ai';
import { analyzeLocal, MODES } from '@/lib/essay';

const Body = z.object({
  text: z.string().max(20000), mode: z.string(),
  theme: z.object({ axis: z.string(), title: z.string(), texts: z.array(z.string()), words: z.array(z.string()) }),
});

// POST /api/essays/analyze — Claude com 1 nova tentativa em LLM_INVALID_OUTPUT; sem chave ou em falha, corretor local.
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  const { text, mode, theme } = parsed.data;
  if (hasAI() && text.trim().length > 40) {
    for (let i = 0; i < 2; i++) {
      try { return NextResponse.json(await analyzeEssayAI(text, MODES[mode]?.label ?? mode, theme)); }
      catch (e) { if (!(e instanceof Error && e.message === 'LLM_INVALID_OUTPUT')) break; }
    }
  }
  return NextResponse.json(analyzeLocal(text, mode, theme.words));
}
