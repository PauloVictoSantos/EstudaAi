// lib/tri — 3PL, EAP, Fisher, seleção SMART. Segue "ENEM – Procedimentos de Análise" (Inep, 2021):
// P(x=1|θ) = c + (1 − c) / (1 + exp[−a(θ − b)]) (sem constante D), EAP com 40 pontos e priori N(0,1), escala 100θ + 500.
export interface ItemParams { a: number; b: number; c: number }
export interface Ability { theta: number; se: number }
export interface Response { item: ItemParams; correct: boolean }

export const p3pl = (t: number, { a, b, c }: ItemParams) => c + (1 - c) / (1 + Math.exp(-a * (t - b)));

export const fisher = (t: number, it: ItemParams) => {
  const P = p3pl(t, it), { a, c } = it;
  return a * a * ((P - c) ** 2 / (1 - c) ** 2) * ((1 - P) / P);
};

const NODES = Array.from({ length: 40 }, (_, i) => -4 + (8 * i) / 39);

// priori N(0,1)
export function eap(responses: Response[]): Ability {
  let num = 0, den = 0, sq = 0;
  for (const q of NODES) {
    let L = Math.exp((-q * q) / 2);
    for (const r of responses) { const P = p3pl(q, r.item); L *= r.correct ? P : 1 - P; }
    num += q * L; sq += q * q * L; den += L;
  }
  const theta = num / den;
  return { theta, se: Math.sqrt(Math.max(sq / den - theta * theta, 0)) };
}

export const toEnem = (t: number) => Math.round(100 * t + 500);
export const fromEnem = (s: number) => (s - 500) / 100;
/** Item sem calibração: a = 1, c = 0,2 e b tal que P(θ = 0) seja o acerto observado p. */
export const coldStart = (p: number): ItemParams => {
  const q = Math.min(0.99, Math.max(0.21, p));
  return { a: 1, b: Math.log(0.8 / (q - 0.2) - 1), c: 0.2 };
};
/** Parâmetros na escala do Enem (500,100): b = 100·b + 500 e a = a/100; c não muda. */
export const toEnemItem = ({ a, b, c }: ItemParams): ItemParams => ({ a: a / 100, b: 100 * b + 500, c });

/** Parâmetros do item a partir do acerto empírico (questões reais não trazem calibração oficial). */
export function itemParams(stats?: { attempts: number; correct: number }): ItemParams {
  if (!stats || stats.attempts < 5) return { a: 1, b: 0, c: 0.2 };
  const p = (stats.correct + 1) / (stats.attempts + 2);
  return coldStart(p);
}

export interface Pickable extends ItemParams { area: string; subject: string; due?: boolean }

// SMART: 10% revisões vencidas, 20% assunto com menor θ, 70% maior informação mirando ~70% de acerto
export function pickSmart<T extends Pickable>(pool: T[], abilities: Record<string, Ability>, rand = Math.random): { q: T; why: string } | null {
  if (!pool.length) return null;
  const th = (q: T) => (abilities[`${q.area}:${q.subject}`] ?? abilities[q.area] ?? { theta: 0 }).theta;
  const r = rand();
  if (r < 0.1) { const due = pool.find(q => q.due); if (due) return { q: due, why: 'Revisão vencida' }; }
  if (r < 0.3) return { q: [...pool].sort((x, y) => th(x) - th(y))[0], why: 'Assunto com menor θ' };
  const score = (q: T) => { const t = th(q); return fisher(t, q) * (1 - Math.abs(p3pl(t, q) - 0.7)) + rand() * 1e-3; };
  return { q: pool.reduce((best, q) => (score(q) > score(best) ? q : best)), why: 'Maior informação' };
}
