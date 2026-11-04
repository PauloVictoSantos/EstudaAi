import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { cols, oid } from '@/lib/db';
import { recordAttempt } from '@/lib/progress';

const Body = z.object({ questionId: z.string(), chosen: z.enum(['A', 'B', 'C', 'D', 'E']), timeMs: z.number().int().min(0), sessionId: z.string().nullable() });

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  const qid = oid(parsed.data.questionId);
  const { questions } = await cols();
  const q = qid && (await questions.findOne({ _id: qid }));
  if (!q) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  if (!q.answer) return NextResponse.json({ error: 'ANSWER_KEY_MISSING' }, { status: 409 });
  const r = await recordAttempt(user, q, parsed.data.chosen, parsed.data.timeMs, parsed.data.sessionId ? oid(parsed.data.sessionId) : null);
  return NextResponse.json(r);
}
