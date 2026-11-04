import 'server-only';
import { cols, ObjectId, type GameState, type QuestionDoc, type UserDoc } from './db';
import { eap, itemParams, type Ability } from './tri';
import { isoDay, levelInfo, touchStreak, XP, type XpKind } from './game';
import { review, type Card } from './fsrs';

export const emptyGame = (): GameState => ({ xp: 0, questions: 0, reviews: 0, essays: 0, s: { streak: 0, lastDay: null, freezes: 2, freezeMonth: null }, days: {} });

/** Soma XP pelo esforço e atualiza a sequência. Nunca tira XP. */
export async function awardXp(user: UserDoc, kind: XpKind, when = new Date()) {
  const { users } = await cols();
  const g = user.game ?? emptyGame();
  const today = isoDay(when), before = levelInfo(g.xp).level;
  const s = touchStreak(g.s, today);
  const days = { ...g.days, [today]: 'study' as const };
  // dias cobertos por congelamento ficam marcados na semana
  for (let i = 1; i <= s.used; i++) days[isoDay(new Date(when.getTime() - i * 864e5))] = 'freeze';
  const key = ({ question: 'questions', review: 'reviews', essay: 'essays' } as const)[kind];
  const next: GameState = { ...g, xp: g.xp + XP[kind], [key]: g[key] + 1, s: { streak: s.streak, lastDay: s.lastDay, freezes: s.freezes, freezeMonth: s.freezeMonth }, days };
  await users.updateOne({ _id: user._id }, { $set: { game: next } });
  user.game = next;
  const L = levelInfo(next.xp);
  return { gained: XP[kind], total: next.xp, level: L.level, levelUp: L.level > before };
}

/** Recalcula θ da área por EAP sobre as respostas do aluno (últimas 300). */
export async function recomputeAbility(userId: ObjectId, area: string): Promise<Ability> {
  const { attempts } = await cols();
  const list = await attempts.find({ userId, area: area as never }).sort({ createdAt: -1 }).limit(300).toArray();
  return eap(list.map(a => ({ item: a.item, correct: a.correct })));
}

/** Registra uma resposta: tentativa, estatística do item, θ, caderno de erros e XP. */
export async function recordAttempt(user: UserDoc, q: QuestionDoc, chosen: string, timeMs: number, sessionId: ObjectId | null, createdAt = new Date(), offline = false) {
  const c = await cols();
  const correct = chosen === q.answer;
  await c.attempts.insertOne({ _id: new ObjectId(), userId: user._id, sessionId, questionId: q._id, area: q.area, subject: q.subject, chosen, correct, timeMs, item: paramsOf(q), createdAt, offline });
  // escolhas por alternativa alimentam a análise clássica (TCT) dos itens
  await c.questions.updateOne({ _id: q._id }, { $inc: { 'stats.attempts': 1, 'stats.correct': correct ? 1 : 0, [`stats.choices.${chosen}`]: 1 } });
  const ability = await recomputeAbility(user._id, q.area);
  if (user.exam) {
    await c.users.updateOne({ _id: user._id }, { $set: { [`exam.abilities.${q.area}`]: ability } });
    user.exam.abilities = { ...user.exam.abilities, [q.area]: ability };
  }
  if (!correct) {
    // Errou: entra no caderno de erros com revisão para amanhã (FSRS, nota "Errei").
    const card: Card = review(null, 1, createdAt.getTime());
    await c.cards.updateOne({ userId: user._id, questionId: q._id }, { $set: { chosen, card }, $setOnInsert: { createdAt } }, { upsert: true });
  }
  const xp = await awardXp(user, 'question', createdAt);
  return { correct, answer: q.answer, ability, abilities: user.exam?.abilities ?? { [q.area]: ability }, xp };
}

export async function userSourceIds(user: UserDoc): Promise<ObjectId[]> {
  if (user.exam?.sourceIds?.length) return user.exam.sourceIds;
  const { sources } = await cols();
  return (await sources.find({}, { projection: { _id: 1 } }).toArray()).map(s => s._id);
}

/** Parâmetros TRI do item: oficiais do INEP quando importados; senão, estimados pelo acerto dos alunos. */
export const paramsOf = (q: QuestionDoc) => (q.params ? { a: q.params.a, b: q.params.b, c: q.params.c } : itemParams(q.stats));

/** Questão para o navegador: texto, figuras e recortes do caderno; nunca o gabarito. */
export const publicQuestion = (q: QuestionDoc) => ({
  id: q._id.toHexString(), number: q.number, variant: q.variant, area: q.area, subject: q.subject, year: q.year ?? null,
  statement: q.statement, content: q.content?.length ? q.content : [{ type: 'text' as const, text: q.statement }],
  options: q.options, original: q.original ?? [], hasAnswer: !!q.answer && !q.annulled,
  official: q.params?.source === 'inep', ...paramsOf(q),
});
