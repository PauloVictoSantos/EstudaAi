// lib/srs — FSRS-4.5 (pesos padrão).
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5, FACTOR = 19 / 81, DAY = 864e5;
export const RATING = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 } as const;
export type Grade = 1 | 2 | 3 | 4;

export interface Card { stability: number; difficulty: number; dueAt: number; lastAt: number; reps: number; days?: number }

const clampD = (d: number) => Math.min(10, Math.max(1, d));
export const retrievability = (days: number, S: number) => (1 + (FACTOR * days) / S) ** DECAY;
export const interval = (S: number, r = 0.9) => (S / FACTOR) * (r ** (1 / DECAY) - 1);
const d0 = (g: number) => clampD(W[4] - (g - 3) * W[5]);

export function review(card: Card | null, g: Grade, now = Date.now()): Card & { days: number } {
  let S: number, D: number;
  if (!card?.stability) { S = W[g - 1]; D = d0(g); }
  else {
    const R = retrievability(Math.max(0, (now - card.lastAt) / DAY), card.stability);
    D = clampD(W[7] * d0(3) + (1 - W[7]) * (card.difficulty - W[6] * (g - 3)));
    S = g === 1
      ? W[11] * card.difficulty ** -W[12] * ((card.stability + 1) ** W[13] - 1) * Math.exp(W[14] * (1 - R))
      : card.stability * (1 + Math.exp(W[8]) * (11 - card.difficulty) * card.stability ** -W[9] * (Math.exp(W[10] * (1 - R)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1));
  }
  const days = g === 1 ? 1 : Math.max(1, Math.round(interval(S)));
  return { stability: S, difficulty: D, lastAt: now, dueAt: now + days * DAY, reps: (card?.reps || 0) + 1, days };
}

export const isDue = (card: Pick<Card, 'dueAt'>, now = Date.now()) => card.dueAt <= now;
