// Confirmação — roda um grupo de métodos nos cenários novos: node metodos.js <grupo> <parte> <nPartes>
//   grupo "aprendidas": Esperar, Aleatória, regra "maior fluxo", D1-Q1, D1-DDQN, D2P-Q1 (ambiente do D).
//   grupo "g_<c2|d>_<H>_<perfeito|realista>": Guloso com teste de H min (decide a cada 60 min), como em causas_d/guloso_h.js
//   (perfeito) e revisao/p4/guloso_imperfeito.js (realista). Mesma lógica, copiada para não alterar os originais.
process.chdir(__dirname);
'use strict';
const fs = require('fs'), { estado, contaAcoes } = require('../causas_d/comum.js');
const [grupo, part, np] = [process.argv[2], +process.argv[3], +process.argv[4]], NTE = +process.env.CTM_NTE || 100, SEED = i => 5000000 + i;
const res = [];
if (grupo === 'aprendidas') {
  const E = require('../simulador_d/env.js'), { Net, makePolicy } = require('../simulador_d/rl.js');
  const rede = M => makePolicy(Net.from(JSON.parse(fs.readFileSync(`../simulador_d/results/${M}/selected.json`)).net));
  const fluxo = (ep, C) => { const des = C.filter(c => c.type === 'DESOB'); if (!des.length) return { ...C.find(c => c.type === 'WAIT'), dt: 15 };
    des.sort((a, b) => E.importance(b.ev).fluxo - E.importance(a.ev).fluxo); return { ...des[0], dt: 15 }; };
  const POL = { 'Esperar': [E.P.wait, false], 'Aleatória': [E.P.random, false], 'Regra: fluxo': [fluxo, false], 'D1-Q1': [rede('D1-Q1'), true], 'D1-DDQN': [rede('D1-DDQN'), true], 'D2P-Q1': [rede('D2P-Q1'), true] };
  for (let i = 0; i < NTE; i++) { if (i % np !== part) continue; const sc = E.scenario(SEED(i));
    for (const K of [1, 3, 5, 10]) { const item = { i, K, n: sc.n, stab0: sc.stab0, m: {} };
      for (const [nm, [p, v]] of Object.entries(POL)) { const o = E.runEpisode(sc, K, p, { variavel: v }); item.m[nm] = { kpi: o.kpi, vh: o.vh, used: o.used }; }
      res.push(item); console.log(i, K, Object.entries(item.m).map(([k, v]) => k + ' ' + v.kpi).join(' | ')); } }
} else {
  const [, w, Hs, cond] = grupo.split('_'), H = +Hs;
  const E = require(w === 'c2' ? '../simulador_c2/env.js' : '../simulador_d/env.js'), sim = E.sim, PROF = E.D.prof.map(r => r.slice());
  let fDem = 1;
  const crenca = t => { for (const ev of sim.S.ev) { if (!ev.on && !(ev.s <= t && t < ev.f)) continue; ev.rm = ev.rm == null ? null : Math.round(E.REM_MED[ev.cls]);
    if (ev.dt != null && ev.rm != null) { if (ev.cap2 == null) ev.f = ev.dt + ev.rm; else if (ev.r2 != null && ev.r2 > t) ev.r2 = ev.dt + ev.rm; } else ev.f = Math.max(ev.f, t + H + 15); } };
  const demanda = f => E.D.prof.forEach((r, a) => r.forEach((_, b) => { r[b] = PROF[a][b] * f; }));
  const pol = (ep, C) => {
    if (C.length === 1) return C[0];
    const st = estado(E, ep), s = st.save(), t = sim.S.t; let best = 0, bs = -1, bv = Infinity;
    const real = cond === 'realista', rD = E.rng(31 * ep.sc.seed + ep.m + 1), ruido = real ? sim.links.map(() => 0.8 + 0.4 * rD()) : null;
    try { if (real) demanda(fDem);
      C.forEach((c, j) => { st.load(s); if (real) { crenca(t); sim.links.forEach((k, li) => { for (let q = 0; q < k.n.length; q++) k.n[q] *= ruido[li]; }); }
        ep.apply(c); const v0 = ep.vh; for (let b = 0; b < H / 15 && ep.m < E.NB; b++) ep.advance(15, 0); const dv = ep.vh - v0;
        if (ep.stab > bs + 1e-9 || (Math.abs(ep.stab - bs) <= 1e-9 && dv < bv - 1e-6)) { bs = ep.stab; bv = dv; best = j; } });
    } finally { demanda(1); }
    st.load(s); return { ...C[best], dt: 60 };
  };
  for (let i = 0; i < NTE; i++) { if (i % np !== part) continue; const sc = E.scenario(SEED(i)); fDem = 0.8 + 0.4 * E.rng(5000000 + i)();
    for (const K of [1, 3, 5, 10]) { const o = E.runEpisode(sc, K, pol, { variavel: false }); res.push({ i, K, kpi: o.kpi, vh: o.vh, used: o.used, acoes: contaAcoes(o.epochs) }); console.log(i, K, o.kpi, o.used); } }
}
fs.writeFileSync(`results/${grupo}_${part}.json`, JSON.stringify(res));
