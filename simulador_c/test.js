// Teste do cenário C (rodado uma única vez): node test.js <parte> <nPartes>
// 60 cenários de teste independentes × K ∈ {1,3,5,10}. Métodos: Esperar, Guloso (1 h), Guloso (3 h),
// Dueling DDQN MLP treinado no cenário C, a rede do cenário B (sem novo treino; teste de generalização)
// e a rede do B ajustada no cenário C (se results/ajuste/selected.json existir; ou rode test_ajuste.js depois).
process.chdir(__dirname);
'use strict';
const E = require('./env.js'), { Net, makePolicy } = require('./rl.js'), fs = require('fs');
const part = +process.argv[2], np = +process.argv[3], NTE = 60;
const load = f => fs.existsSync(f) ? makePolicy(Net.from(JSON.parse(fs.readFileSync(f)).net)) : null;
const POL = { 'Esperar': E.P.wait, 'Guloso (1 h)': E.P.greedy, 'Guloso (3 h)': E.P.greedy3,
  'Dueling DDQN MLP — treinado no C': load('results/total/selected.json'),
  'Dueling DDQN MLP — rede do B': load('../simulador_b/baseline/total/selected.json'),
  'Dueling DDQN MLP — ajustado a partir do B': load('results/ajuste/selected.json') };
for (const k of Object.keys(POL)) if (!POL[k]) { console.log('sem rede:', k); delete POL[k]; }
const res = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste(i)), show = i % 6 === 0;
  const evs = sc.z.ev.map(e => ({ i: e.i, e: e.e, fr: e.fr, d: e.d, s: e.s, f: e.f, cls: e.cls, cap: e.cap, rm: e.rm }));
  for (const K of [1, 3, 5, 10]) {
    const item = { i, K, t: sc.t, stab0: sc.stab0, n: sc.n, evs, m: {} };
    for (const [nm, p] of Object.entries(POL)) { const o = E.runEpisode(sc, K, p, { frames: show });
      item.m[nm] = { kpi: o.kpi, censored: o.censored, sustained: o.sustained, unstable: o.unstable, vh: o.vh, used: o.used, log: o.log, stabs: o.stabs, frames: show ? o.frames : undefined }; }
    res.push(item);
    console.log(i, K, sc.stab0.toFixed(2), Object.entries(item.m).map(([k, v]) => k.slice(0, 14) + ' ' + v.kpi + '/' + Math.round(v.vh)).join(' | '));
  }
  fs.writeFileSync(`results/test_${part}.json`, JSON.stringify(res));
}
fs.writeFileSync(`results/test_${part}.json`, JSON.stringify(res));
