import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { cols } from '@/lib/db';
import { publicQuestion, userSourceIds } from '@/lib/progress';
import { isDue } from '@/lib/fsrs';

/** Questões reais das provas do aluno, sem o gabarito (a correção acontece no servidor). */
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { questions, cards, attempts } = await cols();
  const ids = await userSourceIds(user);
  const done = await attempts.distinct('questionId', { userId: user._id });
  const [list, due] = await Promise.all([
    questions.find({ sourceId: { $in: ids }, _id: { $nin: done } }).sort({ number: 1 }).toArray(),
    cards.find({ userId: user._id }).toArray(),
  ]);
  const dueSet = new Set(due.filter(c => isDue(c.card)).map(c => String(c.questionId)));
  return NextResponse.json({
    abilities: user.exam?.abilities ?? {},
    examName: user.exam?.name ?? null,
    questions: list.map(q => ({ ...publicQuestion(q), due: dueSet.has(String(q._id)) })),
  });
}
