import { describe, expect, it } from 'vitest';
import { coldStart, eap, fisher, p3pl, pickSmart, toEnem, toEnemItem } from './tri';
import { interval, retrievability, review, RATING } from './fsrs';
import { levelInfo, threshold, touchStreak, XP } from './game';

const near = (x: number, y: number, tol = 1e-6) => Math.abs(x - y) <= tol;
const item = { a: 1.2, b: 0.5, c: 0.2 };

describe('tri', () => {
  it('p3pl em θ = b', () => expect(near(p3pl(0.5, item), 0.6)).toBe(true));
  it('p3pl limites', () => { expect(near(p3pl(-60, item), 0.2, 1e-9)).toBe(true); expect(near(p3pl(60, item), 1, 1e-9)).toBe(true); });
  it('fisher positiva', () => expect([-3, 0, 3].every(t => fisher(t, item) > 0)).toBe(true));
  it('eap sem respostas', () => { const r = eap([]); expect(near(r.theta, 0, 1e-9)).toBe(true); expect(near(r.se, 1, 0.03)).toBe(true); });
  it('eap acertos/erros', () => {
    expect(eap(Array(5).fill({ item, correct: true })).theta).toBeGreaterThan(0);
    expect(eap(Array(5).fill({ item, correct: false })).theta).toBeLessThan(0);
  });
  it('escala ENEM', () => expect(toEnem(1.5)).toBe(650));
  it('cold start: P(θ=0) igual ao acerto observado', () => { expect(near(p3pl(0, coldStart(0.5)), 0.5)).toBe(true); expect(near(p3pl(0, coldStart(0.8)), 0.8)).toBe(true); });
  it('parâmetros na escala (500,100)', () => expect(toEnemItem({ a: 2, b: 1, c: 0.2 })).toEqual({ a: 0.02, b: 600, c: 0.2 }));
  it('SMART escolhe item informativo', () => {
    const pool = [{ ...item, id: 1, area: 'MT', subject: 'x', b: 4 }, { ...item, id: 2, area: 'MT', subject: 'x', b: 0 }];
    expect(pickSmart(pool, {}, () => 0.9)!.q.id).toBe(2);
  });
});

describe('fsrs', () => {
  const now = Date.UTC(2026, 9, 1), DAY = 864e5;
  it('R(0) = 1', () => expect(near(retrievability(0, 5), 1)).toBe(true));
  it('intervalo ≈ estabilidade', () => expect(near(interval(7), 7, 1e-9)).toBe(true));
  it('primeira revisão Bom', () => expect(near(review(null, RATING.GOOD, now).stability, 3.7145)).toBe(true));
  it('Errei reduz estabilidade', () => { const c = review(null, RATING.GOOD, now); expect(review(c, RATING.AGAIN, now + 3 * DAY).stability).toBeLessThan(c.stability); });
});

describe('game', () => {
  const s = { streak: 3, lastDay: '2026-10-10', freezes: 2, freezeMonth: '2026-10' };
  it('xp', () => expect(XP).toEqual({ question: 5, review: 10, essay: 20 }));
  it('níveis', () => { expect(threshold(4)).toBe(800); expect(levelInfo(0).level).toBe(1); expect(levelInfo(100).level).toBe(2); });
  it('sequência', () => {
    expect(touchStreak(s, '2026-10-11').streak).toBe(4);
    const r = touchStreak(s, '2026-10-12'); expect([r.streak, r.freezes]).toEqual([4, 1]);
    expect(touchStreak({ ...s, streak: 9 }, '2026-10-14').streak).toBe(1);
    expect(touchStreak({ ...s, lastDay: '2026-10-31', freezes: 0 }, '2026-11-01').freezes).toBe(2);
  });
});
