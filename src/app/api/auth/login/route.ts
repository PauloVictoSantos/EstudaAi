import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { cols, ObjectId } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { emptyGame } from '@/lib/progress';

const Body = z.object({ email: z.string().email(), password: z.string().min(8), create: z.boolean().optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  const { email, password, create } = parsed.data;
  const { users } = await cols();
  const norm = email.trim().toLowerCase();
  let user = await users.findOne({ email: norm });
  if (!user) {
    if (!create) return NextResponse.json({ error: 'NOT_FOUND', message: 'Conta não encontrada. Use "Criar conta com este e-mail".' }, { status: 404 });
    user = { _id: new ObjectId(), email: norm, passwordHash: await bcrypt.hash(password, 10), createdAt: new Date(), exam: null, game: emptyGame() };
    await users.insertOne(user);
  } else if (!(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: 'BAD_PASSWORD', message: 'Senha incorreta.' }, { status: 401 });
  }
  await createSession(user._id.toHexString());
  return NextResponse.json({ ok: true, hasExam: !!user.exam });
}
