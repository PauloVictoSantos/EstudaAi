import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { cols, ObjectId } from '@/lib/db';
import { countWords } from '@/lib/essay';
import { awardXp } from '@/lib/progress';

const c = z.number().min(0).max(200);
const Body = z.object({ themeTitle: z.string(), mode: z.string(), text: z.string().min(1).max(20000), comps: z.object({ c1: c, c2: c, c3: c, c4: c, c5: c }) });

const view = (e: { _id: ObjectId; total: number; words: number; createdAt: Date; themeTitle: string; comps: unknown }) =>
  ({ id: String(e._id), total: e.total, words: e.words, at: e.createdAt, themeTitle: e.themeTitle, comps: e.comps });

export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { essays } = await cols();
  return NextResponse.json((await essays.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).toArray()).map(view));
}

/** Salva uma versão da redação (o texto do aluno, não arquivo). */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  const b = parsed.data, { essays } = await cols();
  const doc = { _id: new ObjectId(), userId: user._id, ...b, total: Object.values(b.comps).reduce((x, y) => x + y, 0), words: countWords(b.text), createdAt: new Date() };
  await essays.insertOne(doc);
  const xp = await awardXp(user, 'essay');
  return NextResponse.json({ version: view(doc), xp });
}
