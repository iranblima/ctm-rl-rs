// Diagnóstico (cenário C): quanto vale para o Guloso conhecer o tempo EXATO de remoção?
// "Guloso com tempo típico": igual ao Guloso, mas na simulação de 1 h de cada candidato toda remoção (a nova e as já em
// andamento) usa o tempo típico do tipo (meio da faixa), que é o que o DDQN conhece. O ambiente real continua com o tempo exato.
// Os outros privilégios do Guloso (estado completo do CTM e fim natural de cada obstrução) continuam. node diag_guloso_tipico.js <parte> <nPartes>
process.chdir(__dirname);
'use strict';
const E = require('./env.js'), fs = require('fs'), sim = E.sim;
const part = +process.argv[2], np = +process.argv[3];
function tipico() { // reescreve, só dentro da simulação do candidato, o fim das remoções com o tempo típico
  for (const ev of sim.S.ev) if (ev.dt != null) { const m = E.REM_MED[ev.cls]; if (ev.cap2 == null) ev.f = Math.min(ev.f0, ev.dt + m); else ev.r2 = ev.dt + m; }
}
function gulosoTipico(ep, C) {
  if (C.length === 1) return C[0];
  const s = ep.save(); let best = 0, bs = -1, bv = Infinity;
  C.forEach((c, j) => { ep.load(s);
    if (c.type === 'DESOB') { const ev = sim.S.ev.find(x => x.i === c.ev.i); if (ev) ev.rm = E.REM_MED[ev.cls]; }
    ep.apply(c); tipico(); const v0 = ep.vh; ep.advance(); const dv = ep.vh - v0;
    if (ep.stab > bs + 1e-9 || (Math.abs(ep.stab - bs) <= 1e-9 && dv < bv - 1e-6)) { bs = ep.stab; bv = dv; best = j; } });
  ep.load(s); return C[best];
}
const out = [];
for (let i = 0; i < 60; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste(i));
  for (const K of [1, 3, 5, 10]) { const o = E.runEpisode(sc, K, gulosoTipico);
    out.push({ i, K, kpi: o.kpi, vh: o.vh, log: o.log.filter(l => l.type !== 'WAIT') }); console.log(i, K, o.kpi, Math.round(o.vh)); }
}
fs.writeFileSync(`results/diag_tipico_${part}.json`, JSON.stringify(out));
