// lib/gamification — XP por esforço, níveis 100·n^1.5, sequência com 2 congelamentos/mês. Sem ranking, sem penalidade.
export const XP = { question: 5, review: 10, essay: 20 } as const;
export type XpKind = keyof typeof XP;

export const threshold = (n: number) => Math.round(100 * n ** 1.5); // XP total para concluir o nível n
export function levelInfo(xp: number) {
  let level = 1; while (xp >= threshold(level)) level++;
  const from = level === 1 ? 0 : threshold(level - 1), to = threshold(level);
  return { level, from, to, into: xp - from, need: to - from, pct: (xp - from) / (to - from) };
}

export interface Streak { streak: number; lastDay: string | null; freezes: number; freezeMonth: string | null; used?: number }

const dayNum = (iso: string) => Math.floor(Date.parse(iso + 'T00:00:00Z') / 864e5);
export function touchStreak(s: Streak, iso: string): Streak & { used: number } {
  const month = iso.slice(0, 7);
  let freezes = s.freezeMonth === month ? s.freezes : 2, used = 0, streak: number;
  if (!s.lastDay) streak = 1;
  else {
    const gap = dayNum(iso) - dayNum(s.lastDay);
    if (gap <= 0) return { ...s, freezes, freezeMonth: month, used: 0 };
    const missed = gap - 1;
    if (missed === 0) streak = s.streak + 1;
    else if (missed <= freezes) { used = missed; freezes -= missed; streak = s.streak + 1; }
    else streak = 1;
  }
  return { streak, lastDay: iso, freezes, freezeMonth: month, used };
}

export interface BadgeStats { essays: number; streak: number; questions: number; reviews: number; mastery: Record<string, { theta: number; se: number }> }

const mastered = (m: BadgeStats['mastery'], k: string) => (m[k]?.theta ?? -9) >= 1 && (m[k]?.se ?? 9) <= 0.4;
export const BADGES: { code: string; name: string; rule: string; icon: string; test: (s: BadgeStats) => boolean }[] = [
  { code: 'FIRST_ESSAY', name: 'Primeira redação', rule: 'Envie uma redação', icon: 'pen-line', test: s => s.essays >= 1 },
  { code: 'STREAK_7', name: 'Uma semana firme', rule: '7 dias seguidos', icon: 'flame', test: s => s.streak >= 7 },
  { code: 'Q_100', name: 'Cem questões', rule: 'Responda 100 questões', icon: 'list-checks', test: s => s.questions >= 100 },
  { code: 'REVIEW_20', name: 'Memória longa', rule: 'Faça 20 revisões', icon: 'brain', test: s => s.reviews >= 20 },
  { code: 'MASTER_MT', name: 'Domínio · Matemática', rule: 'θ ≥ 1,0 com EP ≤ 0,4', icon: 'dice-5', test: s => mastered(s.mastery, 'MT') },
  { code: 'MASTER_LC', name: 'Domínio · Linguagens', rule: 'θ ≥ 1,0 com EP ≤ 0,4', icon: 'book-open', test: s => mastered(s.mastery, 'LC') },
];

export const isoDay = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4);
  return z.toISOString().slice(0, 10);
};
