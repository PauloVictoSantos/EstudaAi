import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { cols } from '@/lib/db';
import { userSourceIds } from '@/lib/progress';

// GET /api/offline/pack — 40 questões ainda não respondidas (com gabarito) para estudar sem conexão.
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { questions, attempts } = await cols();
  const done = await attempts.distinct('questionId', { userId: user._id });
  const list = await questions.aggregate([
    { $match: { _id: { $nin: done }, sourceId: { $in: await userSourceIds(user) }, answer: { $ne: null }, annulled: { $ne: true } } },
    { $sample: { size: 40 } },
    { $project: { _id: 0, id: { $toString: '$_id' }, number: 1, variant: 1, year: 1, area: 1, subject: 1, statement: 1, content: 1, original: 1, options: 1, answer: 1 } },
  ]).toArray();
  return NextResponse.json({ questions: list });
}