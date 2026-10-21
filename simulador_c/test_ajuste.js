// Cenário C — acrescenta ao teste já feito (results/test_*.json) a rede ajustada a partir do B (results/ajuste/selected.json).
// Os cenários são os mesmos (mesmas sementes); os outros métodos não são rodados de novo. node test_ajuste.js <parte> <nPartes>
process.chdir(__dirname);
'use strict';
const E = require('./env.js'), { Net, makePolicy } = require('./rl.js'), fs = require('fs');
const part = +process.argv[2], np = +process.argv[3], NM = 'Dueling DDQN MLP — ajustado a partir do B';
const pol = makePolicy(Net.from(JSON.parse(fs.readFileSync('results/ajuste/selected.json')).net));
const F = `results/test_${part}.json`, res = JSON.parse(fs.readFileSync(F));
const byI = new Map(); for (const it of res) { if (!byI.has(it.i)) byI.set(it.i, []); byI.get(it.i).push(it); }
for (const [i, items] of byI) {
  const sc = E.scenario(E.SEEDS.teste(i)), show = i % 6 === 0;
  for (const item of items) { const o = E.runEpisode(sc, item.K, pol, { frames: show });
    item.m[NM] = { kpi: o.kpi, censored: o.censored, sustained: o.sustained, unstable: o.unstable, vh: o.vh, used: o.used, log: o.log, stabs: o.stabs, frames: show ? o.frames : undefined };
    console.log(i, item.K, 'ajustado', o.kpi, Math.round(o.vh), '| B', item.m['Dueling DDQN MLP — rede do B'].kpi, '| G3', item.m['Guloso (3 h)'].kpi); }
}
fs.writeFileSync(F, JSON.stringify(res));
