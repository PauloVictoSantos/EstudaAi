import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { generateTheme, hasAI } from '@/lib/ai';
import { THEMES } from '@/lib/essay';

const Body = z.object({ used: z.array(z.string()) });

/** Tema inédito: gerado por Claude quando disponível; senão, o próximo tema da lista que ainda não foi usado. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const used = Body.safeParse(await req.json().catch(() => null)).data?.used ?? [];
  if (hasAI()) {
    try { return NextResponse.json({ theme: await generateTheme(used), generated: true }); } catch { /* cai para a lista */ }
  }
  const free = THEMES.filter(t => !used.includes(t.title));
  const pool = free.length ? free : THEMES;
  return NextResponse.json({ theme: pool[Math.floor(Math.random() * pool.length)], generated: false });
}
