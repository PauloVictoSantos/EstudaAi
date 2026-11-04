// Análise clássica dos itens (Teoria Clássica dos Testes), conforme "ENEM – Procedimentos de Análise"
// (Inep, 2021): percentual de acerto, percentual de escolha de cada alternativa, acerto dos grupos
// superior e inferior (27%), índice de discriminação e correlação bisserial por alternativa.
// A medida de desempenho de cada aluno é a sua proficiência θ na área.

export interface Response { chosen: string; score: number }
export interface AltStat { k: string; pct: number; bis: number | null }
export interface ItemTct { n: number; pct: number; pSup: number | null; pInf: number | null; disc: number | null; alts: AltStat[]; flags: string[] }

const phi = (z: number) => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);

/** Inversa da normal padrão (Acklam). */
export function normInv(p: number): number {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const lo = 0.02425, hi = 1 - lo;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > hi) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * r_bis = (M_p − M) / S · p / h(p)
 * M_p: média de desempenho de quem escolheu a alternativa; M e S: média e desvio-padrão de todos;
 * p: proporção que escolheu; h(p): densidade da normal no ponto cuja área à esquerda é p.
 */
export function biserial(scores: number[], chose: boolean[]): number | null {
  const n = scores.length, k = chose.filter(Boolean).length;
  if (n < 3 || k === 0 || k === n) return null;
  const M = scores.reduce((a, b) => a + b, 0) / n;
  const S = Math.sqrt(scores.reduce((a, b) => a + (b - M) ** 2, 0) / n);
  if (!S) return null;
  const Mp = scores.filter((_, i) => chose[i]).reduce((a, b) => a + b, 0) / k;
  const p = k / n;
  return ((Mp - M) / S) * (p / phi(normInv(p)));
}

export function analyzeItem(responses: Response[], answer: string, keys = ['A', 'B', 'C', 'D', 'E']): ItemTct {
  const n = responses.length;
  const scores = responses.map(r => r.score);
  const pct = n ? responses.filter(r => r.chosen === answer).length / n : 0;
  const alts = keys.map(k => ({ k, pct: n ? responses.filter(r => r.chosen === k).length / n : 0, bis: biserial(scores, responses.map(r => r.chosen === k)) }));
  // grupos superior e inferior: 27% com maior e menor desempenho
  let pSup: number | null = null, pInf: number | null = null;
  const g = Math.floor(n * 0.27);
  if (g >= 1) {
    const sorted = [...responses].sort((a, b) => b.score - a.score);
    pSup = sorted.slice(0, g).filter(r => r.chosen === answer).length / g;
    pInf = sorted.slice(-g).filter(r => r.chosen === answer).length / g;
  }
  const flags: string[] = [];
  const right = alts.find(a => a.k === answer);
  if (right?.bis != null && right.bis <= 0) flags.push('Bisserial da alternativa correta não é positivo');
  for (const a of alts) if (a.k !== answer && a.bis != null && a.bis > 0) flags.push(`Distrator ${a.k} com bisserial positivo`);
  return { n, pct, pSup, pInf, disc: pSup != null && pInf != null ? pSup - pInf : null, alts, flags };
}
