import { describe, expect, it } from 'vitest';
import { analyzeItem, biserial, normInv } from './tct';

describe('TCT (procedimentos de análise do Inep)', () => {
  it('normal inversa', () => { expect(normInv(0.5)).toBeCloseTo(0, 6); expect(normInv(0.975)).toBeCloseTo(1.96, 2); });
  it('bisserial positiva quando quem acerta tem desempenho maior', () => {
    expect(biserial([2, 1.5, 1, -1, -1.5, -2], [true, true, true, false, false, false])!).toBeGreaterThan(0.5);
    expect(biserial([1, 1, 1], [true, true, true])).toBeNull();
  });
  it('item bom: discrimina e não levanta alerta', () => {
    const r = analyzeItem([{ chosen: 'B', score: 2 }, { chosen: 'B', score: 1.5 }, { chosen: 'B', score: 1 }, { chosen: 'A', score: -1 }, { chosen: 'C', score: -1.5 }, { chosen: 'A', score: -2 }, { chosen: 'B', score: 0.5 }, { chosen: 'D', score: -0.5 }], 'B');
    expect(r.pct).toBe(0.5);
    expect(r.disc).toBe(1);
    expect(r.flags).toEqual([]);
  });
  it('possível erro de gabarito: distrator escolhido pelos melhores', () => {
    const r = analyzeItem([{ chosen: 'C', score: 2 }, { chosen: 'C', score: 1.5 }, { chosen: 'C', score: 1 }, { chosen: 'B', score: -1 }, { chosen: 'B', score: -1.5 }, { chosen: 'B', score: -2 }], 'B');
    expect(r.flags).toContain('Distrator C com bisserial positivo');
    expect(r.flags).toContain('Bisserial da alternativa correta não é positivo');
  });
});
