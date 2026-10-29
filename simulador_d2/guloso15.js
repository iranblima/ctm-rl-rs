// Cenário D2 — Guloso decidindo a cada 15 min, nos mesmos 100 cenários de teste do D (× K ∈ {1,3,5,10}).
// node guloso15.js <c2|d> <parte> <nPartes>
// Regra de escolha IGUAL à do cenário C: testa cada ação válida no simulador por 1 h e fica com a que deixa mais trechos
// estáveis (empate: menos veículo-hora; empate total: esperar). Muda só a frequência: depois de escolher, a ação é aplicada e o
// simulador avança 15 min (não 60); então decide de novo. Esperar também vale 15 min. É a frequência das políticas aprendidas.
//   c2: com as 5 ações (ambiente do C2, como no cenário C).   d: só esperar ou desobstruir (ambiente do D).
process.chdir(__dirname);
'use strict';
const fs = require('fs');
const which = process.argv[2], part = +process.argv[3], np = +process.argv[4], NTE = +process.env.CTM_NTE || 100;
const E = require(which === 'c2' ? '../simulador_c2/env.js' : '../simulador_d/env.js'), sim = E.sim;
const ROLLOUT = 60, PASSO = 15;
function save(ep) { return { z: sim.snap(), left: ep.left, m: ep.m, bins: ep.bins.map(x => x.slice()), ctrl: new Map(ep.ctrl), stab: ep.stab, stabs: ep.stabs.slice(), done: ep.done, kpi: ep.kpi, vh: ep.vh }; }
function load(ep, s) { sim.restore(s.z); sim.S.real = false; Object.assign(ep, { left: s.left, m: s.m, bins: s.bins.map(x => x.slice()), ctrl: new Map(s.ctrl), stab: s.stab, stabs: s.stabs.slice(), done: s.done, kpi: s.kpi, vh: s.vh }); }
function greedy15(ep, C) {
  let best = 0;
  if (C.length > 1) {
    const s = save(ep); let bs = -1, bv = Infinity;
    C.forEach((c, j) => { load(ep, s); ep.apply(c); const v0 = ep.vh; ep.advance(ROLLOUT, 0); const dv = ep.vh - v0;
      if (ep.stab > bs + 1e-9 || (Math.abs(ep.stab - bs) <= 1e-9 && dv < bv - 1e-6)) { bs = ep.stab; bv = dv; best = j; } });
    load(ep, s);
  }
  return { ...C[best], dt: PASSO };
}
const res = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste2(i));
  for (const K of [1, 3, 5, 10]) {
    const o = E.runEpisode(sc, K, greedy15, { variavel: false });
    const acoes = {}; for (const e of o.epochs) acoes[e.type] = (acoes[e.type] || 0) + 1;
    res.push({ i, K, kpi: o.kpi, vh: o.vh, used: o.used, decisoes: o.epochs.length, acoes });
    console.log(i, K, o.kpi, o.used, JSON.stringify(acoes));
  }
}
fs.writeFileSync(`results/guloso15_${which}_${part}.json`, JSON.stringify(res));
