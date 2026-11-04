import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { cols, oid } from '@/lib/db';
import { analyzeItem } from '@/lib/tct';
import { paramsOf, userSourceIds } from '@/lib/progress';
import { toEnem } from '@/lib/tri';

/**
 * Análise clássica dos itens a partir das respostas de todos os alunos (procedimento do Inep):
 * % de acerto, % de escolha por alternativa, grupos de 27%, discriminação e bisserial.
 * A medida de desempenho de cada aluno é o θ dele na área do item.
 */
export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const c = await cols();
  const src = oid(new URL(req.url).searchParams.get('source') ?? '');
  const sourceIds = src ? [src] : await userSourceIds(user);
  const qs = await c.questions.find({ sourceId: { $in: sourceIds }, answer: { $ne: null }, 'stats.attempts': { $gt: 0 } }, { projection: { content: 0, original: 0, explanations: 0 } }).toArray();
  const atts = await c.attempts.find({ questionId: { $in: qs.map(q => q._id) } }).sort({ createdAt: 1 }).toArray();
  const users = await c.users.find({ _id: { $in: [...new Set(atts.map(a => String(a.userId)))].map(id => oid(id)!) } }, { projection: { 'exam.abilities': 1 } }).toArray();
  const theta = new Map(users.map(u => [String(u._id), u.exam?.abilities ?? {}]));

  const items = qs.map(q => {
    // última resposta de cada aluno ao item
    const last = new Map<string, string>();
    for (const a of atts) if (String(a.questionId) === String(q._id)) last.set(String(a.userId), a.chosen);
    const responses = [...last].map(([u, chosen]) => ({ chosen, score: theta.get(u)?.[q.area]?.theta ?? 0 }));
    const t = analyzeItem(responses, q.answer!, q.options.map(o => o.k));
    const p = paramsOf(q);
    return {
      id: String(q._id), number: q.number, variant: q.variant, year: q.year ?? null, area: q.area, subject: q.subject, answer: q.answer,
      official: q.params?.source === 'inep', a: p.a, b: p.b, c: p.c, bEnem: toEnem(p.b), ...t,
    };
  }).sort((x, y) => y.flags.length - x.flags.length || y.n - x.n);
  return NextResponse.json({ items, respondents: theta.size });
}
