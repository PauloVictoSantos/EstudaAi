import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { cols, oid, type Exam } from '@/lib/db';
import { fromEnem } from '@/lib/tri';

const Body = z.object({
  name: z.string().trim().min(2).max(60),
  type: z.enum(['ENEM', 'CONCURSO', 'OUTRA']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceIds: z.array(z.string()).min(1),
  hasEssay: z.boolean(),
  essayScores: z.array(z.number().nullable()).length(5).nullable(),
  plan: z.object({ weeks: z.number(), days: z.number(), week1: z.array(z.object({ f: z.string(), q: z.string() })) }).nullable(),
  /** Última nota informada por área (0–1000) → ponto de partida do θ. */
  areaScores: z.record(z.number().min(0).max(1000).nullable()).optional(),
});

export async function PUT(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  const sourceIds = b.sourceIds.map(oid).filter(x => x !== null);
  const abilities = { ...(user.exam?.abilities ?? {}) };
  for (const [a, v] of Object.entries(b.areaScores ?? {})) if (v != null) abilities[a] = { theta: fromEnem(v), se: 0.6 };
  const exam: Exam = { name: b.name, type: b.type, date: b.date, sourceIds, hasEssay: b.hasEssay, essayScores: b.essayScores, plan: b.plan, abilities };
  const { users } = await cols();
  await users.updateOne({ _id: user._id }, { $set: { exam } });
  return NextResponse.json({ ok: true });
}

/** Atualiza só as notas de partida por área (card da prova → "Informar notas"). */
export async function PATCH(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const parsed = z.object({ areaScores: z.record(z.number().min(0).max(1000).nullable()) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !user.exam) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  const set: Record<string, unknown> = {};
  for (const [a, v] of Object.entries(parsed.data.areaScores)) if (v != null) set[`exam.abilities.${a}`] = { theta: fromEnem(v), se: 0.6 };
  if (Object.keys(set).length) await (await cols()).users.updateOne({ _id: user._id }, { $set: set });
  return NextResponse.json({ ok: true });
}
