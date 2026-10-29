// Cenário D — Guloso nos mesmos 100 cenários de teste (× K ∈ {1,3,5,10}). node guloso.js <c2|d> <parte> <nPartes>
// A regra é a MESMA do cenário C, sem alteração: a cada 60 min, testa cada ação válida no simulador por 1 h e fica com a
// que deixa mais trechos estáveis (empate: menos veículo-hora; empate total: esperar).
//   c2: Guloso com as 5 ações (ambiente do C2, como no cenário C).
//   d : Guloso com o conjunto de ações do D (só esperar ou desobstruir).
process.chdir(__dirname);
'use strict';
const fs = require('fs');
const which = process.argv[2], part = +process.argv[3], np = +process.argv[4], NTE = +process.env.CTM_NTE || 100;
const E = require(which === 'c2' ? '../simulador_c2/env.js' : './env.js'), sim = E.sim;
function save(ep) { return { z: sim.snap(), left: ep.left, m: ep.m, bins: ep.bins.map(x => x.slice()), ctrl: new Map(ep.ctrl), stab: ep.stab, stabs: ep.stabs.slice(), done: ep.done, kpi: ep.kpi, vh: ep.vh }; }
function load(ep, s) { sim.restore(s.z); sim.S.real = false; Object.assign(ep, { left: s.left, m: s.m, bins: s.bins.map(x => x.slice()), ctrl: new Map(s.ctrl), stab: s.stab, stabs: s.stabs.slice(), done: s.done, kpi: s.kpi, vh: s.vh }); }
function greedy(ep, C) {
  if (C.length === 1) return C[0];
  const s = save(ep); let best = 0, bs = -1, bv = Infinity;
  C.forEach((c, j) => { load(ep, s); ep.apply(c); const v0 = ep.vh; ep.advance(60, 0); const dv = ep.vh - v0;
    if (ep.stab > bs + 1e-9 || (Math.abs(ep.stab - bs) <= 1e-9 && dv < bv - 1e-6)) { bs = ep.stab; bv = dv; best = j; } });
  load(ep, s); return C[best];
}
const res = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste2(i));
  for (const K of [1, 3, 5, 10]) {
    const o = E.runEpisode(sc, K, greedy, { variavel: false });
    const acoes = {}; for (const e of o.epochs) acoes[e.type] = (acoes[e.type] || 0) + 1;
    res.push({ i, K, kpi: o.kpi, vh: o.vh, used: o.used, acoes });
    console.log(i, K, o.kpi, o.used, JSON.stringify(acoes));
  }
}
fs.writeFileSync(`results/guloso_${which}_${part}.json`, JSON.stringify(res));
