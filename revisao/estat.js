// Estatística comum da revisão (P0): diferenças pareadas com bootstrap AGRUPADO POR CENÁRIO.
// Os 4 orçamentos K de um mesmo cenário não são independentes; por isso sorteamos cenários (com reposição), e cada cenário
// sorteado entra com todas as suas linhas. 5.000 reamostragens, sorteio fixo.
'use strict';
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN;
function rngFix(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
// pares: [{i, d}] (i = cenário, d = diferença naquele episódio)
function bootCenario(pares, B = 5000, seed = 12345) {
  const por = new Map(); for (const p of pares) { if (!por.has(p.i)) por.set(p.i, []); por.get(p.i).push(p.d); }
  const g = [...por.values()], n = g.length, rnd = rngFix(seed), bs = [];
  for (let b = 0; b < B; b++) { let s = 0, c = 0; for (let k = 0; k < n; k++) { const v = g[Math.floor(rnd() * n)]; for (const d of v) { s += d; c++; } } bs.push(s / c); }
  bs.sort((a, b) => a - b); const d = pares.map(p => p.d);
  return { mean: mean(d), lo: bs[Math.floor(0.025 * B) - 1], hi: bs[Math.ceil(0.975 * B) - 1], win: d.filter(v => v < 0).length / d.length, tie: d.filter(v => v === 0).length / d.length, loss: d.filter(v => v > 0).length / d.length, nCen: n, n: d.length };
}
// bootstrap por episódio (o usado até agora), para comparação
function bootEpisodio(pares, B = 5000, seed = 12345) {
  const d = pares.map(p => p.d), n = d.length, rnd = rngFix(seed), bs = [];
  for (let b = 0; b < B; b++) { let s = 0; for (let k = 0; k < n; k++) s += d[Math.floor(rnd() * n)]; bs.push(s / n); }
  bs.sort((a, b) => a - b); return { mean: mean(d), lo: bs[Math.floor(0.025 * B) - 1], hi: bs[Math.ceil(0.975 * B) - 1] };
}
const f2 = v => isNaN(v) ? '—' : v.toFixed(2).replace('.', ','), sg = v => isNaN(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + f2(Math.abs(v));
const pc = v => isNaN(v) ? '—' : (100 * v).toFixed(1).replace('.', ',') + '%';
const ic = p => `${sg(p.lo)} a ${sg(p.hi)}`, sig = p => (p.hi < 0 || p.lo > 0) ? 'sim' : 'não';
module.exports = { mean, bootCenario, bootEpisodio, f2, sg, pc, ic, sig };
