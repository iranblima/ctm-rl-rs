// Esperar, Guloso (1 h) e Guloso (3 h) nos 40 cenários de validação × 4 orçamentos → results/valref.json
// node valref.js [wait|greedy|greedy3 ...]   (sem argumento: os três). Cada execução junta seu resultado ao arquivo.
process.chdir(__dirname);
const E = require('./env.js'), fs = require('fs');
const VA = Array.from({ length: 40 }, (_, i) => E.scenario(E.SEEDS.validacao(i)));
const F = 'results/valref.json', which = process.argv.slice(2).length ? process.argv.slice(2) : ['wait', 'greedy', 'greedy3'];
for (const nm of which) {
  const p = E.P[nm]; let k = 0, v = 0, c = 0;
  for (const sc of VA) for (const K of [1, 3, 5, 10]) { const o = E.runEpisode(sc, K, p); k += o.kpi; v += o.vh; c++; }
  const out = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F)) : {}; out[nm] = { kpi: k / c, vh: v / c };
  fs.mkdirSync('results', { recursive: true }); fs.writeFileSync(F, JSON.stringify(out)); console.log(nm, (k / c).toFixed(3), (v / c).toFixed(0));
}
