import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { cols, ObjectId, oid } from '@/lib/db';

const Body = z.object({ mode: z.enum(['SMART', 'SINGLE', 'MIXED']), size: z.number().int().min(5).max(15), picked: z.array(z.string()) });

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  const { sessions } = await cols();
  const _id = new ObjectId();
  await sessions.insertOne({ _id, userId: user._id, ...parsed.data, startAbilities: user.exam?.abilities ?? {}, startedAt: new Date(), endedAt: null });
  return NextResponse.json({ id: String(_id), startAbilities: user.exam?.abilities ?? {} });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const id = oid(new URL(req.url).searchParams.get('id') ?? '');
  if (!id) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  const { sessions } = await cols();
  await sessions.updateOne({ _id: id, userId: user._id }, { $set: { endedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
