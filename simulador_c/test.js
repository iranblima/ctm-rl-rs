// Teste do cenário C (rodado uma única vez): node test.js <parte> <nPartes>
// 60 cenários de teste independentes × K ∈ {1,3,5,10}. Métodos: Esperar, Guloso (1 h), Guloso (3 h) e
// Dueling DDQN MLP treinado do zero no cenário C, com todas as ações e só com esperar/desobstruir.
// (Se a rede só-desobstruir for treinada depois, test_desob.js acrescenta só ela ao teste já feito.)
process.chdir(__dirname);
'use strict';
const E = require('./env.js'), { Net, makePolicy } = require('./rl.js'), fs = require('fs');
const part = +process.argv[2], np = +process.argv[3], NTE = 60;
const load = (f, acoes) => { if (!fs.existsSync(f)) return null; const p = makePolicy(Net.from(JSON.parse(fs.readFileSync(f)).net)); p.acoes = acoes; return p; };
const POL = { 'Esperar': E.P.wait, 'Guloso (1 h)': E.P.greedy, 'Guloso (3 h)': E.P.greedy3,
  'Dueling DDQN MLP — todas as ações': load('results/total/selected.json', 'todas'),
  'Dueling DDQN MLP — só desobstruir': load('results/so_desob/selected.json', 'desob') };
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
