// Referência na validação: Esperar e Guloso nos mesmos 38 momentos × 4 orçamentos usados para escolher o checkpoint.
// Grava results/valref.json (lido pelo monitor como linhas de comparação).
process.chdir(__dirname);
const E = require('./env.js'), fs = require('fs');
const ALL = E.starts(); const n = ALL.length, ntr = Math.round(0.6 * n), nva = Math.round(0.2 * n);
const VA = ALL.slice(ntr, ntr + nva);
const out = {};
for (const [nm, p] of [['wait', E.P.wait], ['greedy', E.P.greedy]]) {
  let k = 0, v = 0, c = 0;
  for (const st of VA) for (const K of [1, 3, 5, 10]) { const o = E.runEpisode(st, K, p); k += o.kpi; v += o.vh; c++; }
  out[nm] = { kpi: k / c, vh: v / c }; console.log(nm, (k / c).toFixed(3), (v / c).toFixed(0));
}
fs.writeFileSync('results/valref.json', JSON.stringify(out));
