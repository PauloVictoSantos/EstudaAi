import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { cols, oid } from '@/lib/db';
import { review, type Grade } from '@/lib/fsrs';
import { awardXp } from '@/lib/progress';

/** Caderno de erros: cada questão errada vira um cartão FSRS. */
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { cards, questions } = await cols();
  const list = await cards.find({ userId: user._id }).sort({ 'card.dueAt': 1 }).toArray();
  const qs = await questions.find({ _id: { $in: list.map(c => c.questionId) } }).toArray();
  return NextResponse.json(list.flatMap(c => {
    const q = qs.find(q => String(q._id) === String(c.questionId));
    return q ? [{ id: String(c._id), chosen: c.chosen, card: c.card, q: { id: String(q._id), number: q.number, year: q.year ?? null, subject: q.subject, statement: q.statement, content: q.content ?? [], original: q.original ?? [], options: q.options, answer: q.answer, why: q.explanations?.[c.chosen]?.why ?? null } }] : [];
  }));
}

const Body = z.object({ id: z.string(), grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]) });

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const id = parsed.success ? oid(parsed.data.id) : null;
  if (!parsed.success || !id) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  const { cards } = await cols();
  const doc = await cards.findOne({ _id: id, userId: user._id });
  if (!doc) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  const card = review(doc.card, parsed.data.grade as Grade);
  await cards.updateOne({ _id: id }, { $set: { card } });
  const xp = await awardXp(user, 'review');
  return NextResponse.json({ card, xp });
}
