// Cenário C2 — Esperar e Aleatória na validação (40 cenários × 4 orçamentos), mesma medida do treino → results/valref.json
process.chdir(__dirname);
const E = require('./env.js'), fs = require('fs');
const VA = Array.from({ length: 40 }, (_, i) => E.scenario(E.SEEDS.validacao(i))), out = {};
for (const [nm, p] of [['Esperar', E.P.wait], ['Aleatória', E.P.random]]) { let k = 0, v = 0, c = 0; for (const sc of VA) for (const K of [1, 3, 5, 10]) { const o = E.runEpisode(sc, K, p); k += o.kpi; v += o.vh; c++; } out[nm] = { kpi: k / c, vh: v / c }; console.log(nm, (k / c).toFixed(3)); }
fs.writeFileSync('results/valref.json', JSON.stringify(out));
