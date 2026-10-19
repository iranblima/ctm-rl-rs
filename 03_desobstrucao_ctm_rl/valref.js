process.chdir(__dirname);
const E = require('./env.js'); const ALL = E.starts(); const n = ALL.length, ntr = Math.round(0.6 * n), nva = Math.round(0.2 * n);
const VA = ALL.slice(ntr, ntr + nva); console.log('train', ntr, 'val', nva, 'test', n - ntr - nva, (ALL[ntr].t/1440).toFixed(2), (ALL[ntr+nva].t/1440).toFixed(2));
for (const [nm, p] of [['wait', E.P.wait], ['greedy', E.P.greedy]]) { let k = 0, v = 0, c = 0; for (const st of VA) for (const K of [1, 3, 5, 10]) { const o = E.runEpisode(st, K, p); k += o.kpi; v += o.vh; c++; } console.log(nm, (k / c).toFixed(3), (v / c).toFixed(0)); }
