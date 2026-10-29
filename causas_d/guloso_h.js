// Causa 2 — Guloso olhando mais longe (diagnóstico; o Guloso da comparação principal não muda): node guloso_h.js <c2|d> <H> <parte> <nPartes>
// Mesma regra de escolha do cenário C, mas o teste de cada ação dura H minutos (60, 180 ou 360) em vez de 60. Decide a cada 60 min
// (no D2, decidir a cada 15 min mudou só 0,03 h). No teste, o simulador avança em blocos de 15 min até o fim do horizonte, mesmo que a
// rede estabilize no meio (assim a comparação é sempre no mesmo instante); escolhe a ação com mais trechos estáveis ao fim do horizonte
// (empate: menos veículo-hora; empate total: esperar).
process.chdir(__dirname);
'use strict';
const fs = require('fs'), { estado, contaAcoes } = require('./comum.js');
const which = process.argv[2], H = +process.argv[3], part = +process.argv[4], np = +process.argv[5], NTE = +process.env.CTM_NTE || 100;
const E = require(which === 'c2' ? '../simulador_c2/env.js' : '../simulador_d/env.js');
function pol(ep, C) {
  if (C.length === 1) return C[0];
  const st = estado(E, ep), s = st.save(); let best = 0, bs = -1, bv = Infinity;
  C.forEach((c, j) => { st.load(s); ep.apply(c); const v0 = ep.vh; for (let b = 0; b < H / 15 && ep.m < E.NB; b++) ep.advance(15, 0); const dv = ep.vh - v0;
    if (ep.stab > bs + 1e-9 || (Math.abs(ep.stab - bs) <= 1e-9 && dv < bv - 1e-6)) { bs = ep.stab; bv = dv; best = j; } });
  st.load(s); return { ...C[best], dt: 60 };
}
const res = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste2(i));
  for (const K of [1, 3, 5, 10]) {
    const o = E.runEpisode(sc, K, pol, { variavel: false });
    res.push({ i, K, kpi: o.kpi, vh: o.vh, used: o.used, acoes: contaAcoes(o.epochs) });
    console.log(i, K, o.kpi, o.used);
  }
}
fs.writeFileSync(`results/guloso_h${H}_${which}_${part}.json`, JSON.stringify(res));
