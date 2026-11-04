import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { cols } from '@/lib/db';

export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { sources } = await cols();
  const srcs = user.exam?.sourceIds?.length ? await sources.find({ _id: { $in: user.exam.sourceIds } }).toArray() : [];
  return NextResponse.json({
    email: user.email,
    exam: user.exam && { ...user.exam, sourceIds: user.exam.sourceIds.map(String), sources: srcs.map(s => ({ id: String(s._id), title: s.title, questionCount: s.questionCount, keyedCount: s.keyedCount })) },
  });
}
