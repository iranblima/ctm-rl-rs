// Cenário C — acrescenta ao teste já feito (results/test_*.json) o DDQN treinado só com esperar e desobstruir.
// Os cenários são os mesmos (mesmas sementes); os outros métodos não são rodados de novo. node test_desob.js <parte> <nPartes>
process.chdir(__dirname);
'use strict';
const E = require('./env.js'), { Net, makePolicy } = require('./rl.js'), fs = require('fs');
const part = +process.argv[2], np = +process.argv[3], NM = 'Dueling DDQN MLP — só desobstruir';
const pol = makePolicy(Net.from(JSON.parse(fs.readFileSync('results/so_desob/selected.json')).net)); pol.acoes = 'desob';
const F = `results/test_${part}.json`, res = JSON.parse(fs.readFileSync(F));
const byI = new Map(); for (const it of res) { if (!byI.has(it.i)) byI.set(it.i, []); byI.get(it.i).push(it); }
for (const [i, items] of byI) {
  const sc = E.scenario(E.SEEDS.teste(i)), show = i % 6 === 0;
  for (const item of items) { const o = E.runEpisode(sc, item.K, pol, { frames: show });
    item.m[NM] = { kpi: o.kpi, censored: o.censored, sustained: o.sustained, unstable: o.unstable, vh: o.vh, used: o.used, log: o.log, stabs: o.stabs, frames: show ? o.frames : undefined };
    console.log(i, item.K, 'só desobstruir', o.kpi, Math.round(o.vh), '| G3', item.m['Guloso (3 h)'].kpi); }
}
fs.writeFileSync(F, JSON.stringify(res));
