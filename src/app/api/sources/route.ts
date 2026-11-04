import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { cols } from '@/lib/db';

/** Provas extraídas da pasta de PDFs (via `npm run ingest`). */
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { sources, questions } = await cols();
  const list = await sources.find({}).sort({ title: 1 }).toArray();
  const areas = await questions.aggregate<{ _id: { s: unknown; a: string }; n: number }>([{ $group: { _id: { s: '$sourceId', a: '$area' }, n: { $sum: 1 } } }]).toArray();
  return NextResponse.json(list.map(s => ({
    id: String(s._id), title: s.title, kind: s.kind, status: s.status, questionCount: s.questionCount, keyedCount: s.keyedCount,
    files: s.files.map(f => f.name), ingestedAt: s.ingestedAt,
    areas: Object.fromEntries(areas.filter(a => String(a._id.s) === String(s._id)).map(a => [a._id.a, a.n])),
  })));
}
