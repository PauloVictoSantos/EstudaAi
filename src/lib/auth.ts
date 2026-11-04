import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { cols, ObjectId, type UserDoc } from './db';

export const COOKIE = 'estudaai_session';
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-troque-em-producao');

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(key());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 30 * 864e2 });
}

export async function destroySession() { (await cookies()).delete(COOKIE); }

export async function verifyToken(token?: string): Promise<string | null> {
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, key()); return typeof payload.sub === 'string' ? payload.sub : null; } catch { return null; }
}

export async function currentUser(): Promise<UserDoc | null> {
  const id = await verifyToken((await cookies()).get(COOKIE)?.value);
  if (!id || !ObjectId.isValid(id)) return null;
  const { users } = await cols();
  return users.findOne({ _id: new ObjectId(id) });
}

/** Para rotas de API: devolve o usuário ou uma resposta 401 pronta. */
export async function requireUser(): Promise<UserDoc | NextResponse> {
  const u = await currentUser();
  return u ?? NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}
