// P4 simplificado — Guloso com modelo IMPERFEITO: node guloso_imperfeito.js <c2|d> <H> <tempo|realista> <parte> <nPartes>
// Mesma regra e mesmo procedimento do diagnóstico de horizonte (causas_d/guloso_h.js): decide a cada 60 min; testa cada ação por H min
// (60 ou 360) em blocos de 15 min até o fim do horizonte; fica com a ação de mais trechos estáveis (empate: menos veículo-hora; esperar).
// O episódio real continua com o simulador verdadeiro; só as simulações de teste do Guloso usam o modelo imperfeito:
//   tempo:     não conhece o tempo de remoção sorteado (usa o típico do tipo, também para remoções já em andamento) nem quando cada
//              obstrução acabaria sozinha (supõe que dura até o fim do teste).
//   realista:  "tempo" + demanda errada (um fator fixo por cenário, entre 0,8 e 1,2) + filas com erro (a ocupação de cada sentido
//              multiplicada por um fator entre 0,8 e 1,2, sorteado a cada decisão).
// Sorteios fixos por cenário/decisão, iguais nos dois conjuntos de ações.
process.chdir(__dirname);
'use strict';
const fs = require('fs'), { estado, contaAcoes } = require('../../causas_d/comum.js');
const [which, H, cond, part, np] = [process.argv[2], +process.argv[3], process.argv[4], +process.argv[5], +process.argv[6]], NTE = +process.env.CTM_NTE || 100;
const E = require(which === 'c2' ? '../../simulador_c2/env.js' : '../../simulador_d/env.js'), sim = E.sim, PROF = E.D.prof.map(r => r.slice());
let fDem = 1, rDec = null;
function crenca(t) {   // o que o Guloso imperfeito supõe sobre as obstruções (aplicado só na cópia de teste)
  for (const ev of sim.S.ev) {
    if (!ev.on && !(ev.s <= t && t < ev.f)) continue;
    const rmT = E.REM_MED[ev.cls] || null; ev.rm = ev.rm == null ? null : Math.round(rmT);
    if (ev.dt != null && ev.rm != null) { if (ev.cap2 == null) ev.f = ev.dt + ev.rm; else if (ev.r2 != null && ev.r2 > t) ev.r2 = ev.dt + ev.rm; }
    else ev.f = Math.max(ev.f, t + H + 15);   // fim natural desconhecido: supõe que dura até o fim do teste
  }
}
function demanda(f) { E.D.prof.forEach((r, i) => r.forEach((_, j) => { r[j] = PROF[i][j] * f; })); }
function pol(ep, C) {
  if (C.length === 1) return C[0];
  const st = estado(E, ep), s = st.save(), t = sim.S.t; let best = 0, bs = -1, bv = Infinity;
  rDec = E.rng(31 * ep.sc.seed + ep.m + 1);
  const ruido = cond === 'realista' ? (() => { const r0 = rDec, fs_ = sim.links.map(() => 0.8 + 0.4 * r0()); return fs_; })() : null;
  try {
    if (cond === 'realista') demanda(fDem);
    C.forEach((c, j) => { st.load(s); crenca(t); if (ruido) sim.links.forEach((k, li) => { for (let q = 0; q < k.n.length; q++) k.n[q] *= ruido[li]; });
      ep.apply(c); const v0 = ep.vh; for (let b = 0; b < H / 15 && ep.m < E.NB; b++) ep.advance(15, 0); const dv = ep.vh - v0;
      if (ep.stab > bs + 1e-9 || (Math.abs(ep.stab - bs) <= 1e-9 && dv < bv - 1e-6)) { bs = ep.stab; bv = dv; best = j; } });
  } finally { demanda(1); }
  st.load(s); return { ...C[best], dt: 60 };
}
const res = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste2(i)); fDem = 0.8 + 0.4 * E.rng(5000000 + i)();
  for (const K of [1, 3, 5, 10]) { const o = E.runEpisode(sc, K, pol, { variavel: false });
    res.push({ i, K, kpi: o.kpi, vh: o.vh, used: o.used, acoes: contaAcoes(o.epochs) }); console.log(i, K, o.kpi, o.used); }
}
fs.writeFileSync(`results/g_${which}_h${H}_${cond}_${part}.json`, JSON.stringify(res));
