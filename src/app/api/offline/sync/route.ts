import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { cols, oid } from '@/lib/db';
import { recordAttempt } from '@/lib/progress';

const Body = z.object({ items: z.array(z.object({ questionId: z.string(), chosen: z.enum(['A', 'B', 'C', 'D', 'E']), createdAt: z.number() })).max(500) });

// POST /api/offline/sync — mesma questão respondida em dois dispositivos → vale o createdAt mais recente.
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  const { questions, attempts } = await cols();
  let accepted = 0, conflicts = 0;
  for (const it of [...parsed.data.items].sort((a, b) => a.createdAt - b.createdAt)) {
    const id = oid(it.questionId);
    const q = id && (await questions.findOne({ _id: id }));
    if (!q?.answer) continue;
    const newer = await attempts.findOne({ userId: user._id, questionId: q._id });
        if (newer) { conflicts++; continue; }
    await recordAttempt(user, q, it.chosen, 0, null, new Date(it.createdAt), true);
    accepted++;
  }
  return NextResponse.json({ accepted, conflicts });
}
