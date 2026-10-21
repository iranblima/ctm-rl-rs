// Teste do cenário B (rodado uma única vez): node test.js <parte> <nPartes>
// 60 cenários de teste independentes × K ∈ {1,3,5,10}; Esperar, Guloso, DDQN (observação total) e, se existir, DDQN (observação nos postos).
process.chdir(__dirname);
'use strict';
const E = require('./env.js'), { Net, makePolicy } = require('./rl.js'), fs = require('fs');
const part = +process.argv[2], np = +process.argv[3], NTE = 60;
const pol = mode => { const f = `results/${mode}/selected.json`; if (!fs.existsSync(f)) return null; const p = makePolicy(Net.from(JSON.parse(fs.readFileSync(f)).net));
  return (ep, C) => { const prev = E.setObs(mode); const r = p(ep, C); E.setObs(prev); return r; }; };
const POL = { 'Esperar': E.P.wait, 'Guloso (Greedy MC)': E.P.greedy, 'Dueling DDQN MLP — rede inteira': pol('total'), 'Dueling DDQN MLP — só postos': pol('postos') };
for (const k of Object.keys(POL)) if (!POL[k]) delete POL[k];
const res = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste(i)), show = i % 6 === 0;
  const evs = sc.z.ev.map(e => ({ i: e.i, e: e.e, fr: e.fr, d: e.d, s: e.s, f: e.f, cls: e.cls }));
  for (const K of [1, 3, 5, 10]) {
    const item = { i, K, t: sc.t, stab0: sc.stab0, n: sc.n, evs, m: {} };
    for (const [nm, p] of Object.entries(POL)) { const o = E.runEpisode(sc, K, p, { frames: show });
      item.m[nm] = { kpi: o.kpi, censored: o.censored, sustained: o.sustained, unstable: o.unstable, vh: o.vh, used: o.used, log: o.log, stabs: o.stabs, frames: show ? o.frames : undefined }; }
    res.push(item);
    console.log(i, K, sc.stab0.toFixed(2), Object.entries(item.m).map(([k, v]) => k.slice(0, 12) + ' ' + v.kpi + '/' + Math.round(v.vh)).join(' | '));
  }
}
fs.writeFileSync(`results/test_${part}.json`, JSON.stringify(res));
