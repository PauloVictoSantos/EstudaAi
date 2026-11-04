import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { cols } from '@/lib/db';
import { AREAS, type Area } from '@/lib/areas';
import { eap, toEnem } from '@/lib/tri';
import { isoDay } from '@/lib/game';

const DAY = 864e5;

/** Painel + relatório da última sessão, tudo calculado a partir das respostas reais do aluno. */
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const c = await cols();
  const since = new Date(Date.now() - 84 * DAY);
  const [att, essays, sessions] = await Promise.all([
    c.attempts.find({ userId: user._id }).sort({ createdAt: 1 }).toArray(),
    c.essays.find({ userId: user._id }).sort({ createdAt: -1 }).limit(6).toArray(),
    c.sessions.find({ userId: user._id }).sort({ startedAt: -1 }).limit(12).toArray(),
  ]);

  // Proficiência por semana (EAP acumulado até o fim de cada semana)
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekEnds = Array.from({ length: 8 }, (_, i) => monday.getTime() + (i - 6) * 7 * DAY);
  const areas = ([...new Set(att.map(a => a.area))] as Area[]).sort();
  const lines = areas.map(area => {
    const mine = att.filter(a => a.area === area);
    return { code: area, label: AREAS[area], values: weekEnds.map(end => toEnem(eap(mine.filter(a => a.createdAt.getTime() < end).map(a => ({ item: a.item, correct: a.correct }))).theta)) };
  });

  const bySubject = new Map<string, { n: number; ok: number }>();
  for (const a of att) { const s = bySubject.get(a.subject) ?? { n: 0, ok: 0 }; s.n++; if (a.correct) s.ok++; bySubject.set(a.subject, s); }
  const subjects = [...bySubject].sort((x, y) => y[1].n - x[1].n).slice(0, 8).map(([label, s]) => ({ label, pct: Math.round((s.ok / s.n) * 100), n: s.n }));

  const times = areas.map(area => { const m = att.filter(a => a.area === area); return { code: area, label: AREAS[area], sec: Math.round(m.reduce((x, a) => x + a.timeMs, 0) / Math.max(1, m.length) / 1000) }; });

  const perDay = new Map<string, number>();
  for (const a of att) if (a.createdAt >= since) perDay.set(isoDay(a.createdAt), (perDay.get(isoDay(a.createdAt)) ?? 0) + 1);
  const heat = Array.from({ length: 84 }, (_, i) => { const d = isoDay(new Date(Date.now() - (83 - i) * DAY)); return { day: d, n: perDay.get(d) ?? 0 }; });

  // Relatório: última sessão com respostas + comparação com as 5 anteriores
  const withAtt = sessions.map(s => ({ s, a: att.filter(a => a.sessionId && String(a.sessionId) === String(s._id)) })).filter(x => x.a.length);
  const pct = (a: typeof att) => Math.round((a.filter(x => x.correct).length / Math.max(1, a.length)) * 100);
  let report = null;
  if (withAtt.length) {
    const { s, a } = withAtt[0];
    const qs = await c.questions.find({ _id: { $in: a.map(x => x.questionId) } }).toArray();
    report = {
      at: s.startedAt, mode: s.mode,
      attempts: a.map(x => {
        const q = qs.find(q => String(q._id) === String(x.questionId));
        return { subject: x.subject, correct: x.correct, chosen: x.chosen, timeMs: x.timeMs, answer: q?.answer ?? null, statement: q?.statement ?? '', number: q?.number, explanation: q?.explanations?.[x.chosen] ?? null };
      }),
      prev: withAtt.slice(1, 6).map(x => pct(x.a)).reverse(),
    };
  }

  return NextResponse.json({
    total: att.length, lines, subjects, times, heat,
    comps: essays.reverse().map(e => e.comps),
    report,
  });
}
