import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { cols } from '@/lib/db';
import { BADGES, levelInfo } from '@/lib/game';
import { emptyGame } from '@/lib/progress';

export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const g = user.game ?? emptyGame();
  const c = await cols();
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const [q, e, r] = await Promise.all([
    c.attempts.countDocuments({ userId: user._id, createdAt: { $gte: monday } }),
    c.essays.countDocuments({ userId: user._id, createdAt: { $gte: monday } }),
    c.cards.countDocuments({ userId: user._id, 'card.lastAt': { $gte: monday.getTime() }, 'card.reps': { $gt: 1 } }),
  ]);
  const stats = { ...g, streak: g.s.streak, mastery: user.exam?.abilities ?? {} };
  return NextResponse.json({
    ...g, level: levelInfo(g.xp), week: { q, r, e },
    badges: BADGES.map(({ test, ...b }) => ({ ...b, ok: test(stats) })),
  });
}
