// Causa 3 — auditoria offline no ambiente do D (só esperar/desobstruir): node auditoria.js <parte> <nPartes>
// Igual à auditoria do C2, mas com as ações do D e horizontes até 6 h. Estados: os 100 cenários de teste no início e depois de 60 e
// 120 min só esperando (quando ainda instáveis). Em cada estado, cada ação (esperar ou desobstruir uma obstrução) é aplicada e depois
// só se espera; registra a fração estável e o veículo-hora em 15, 30, 60, 120, 180 e 360 min. Nenhuma política usa isto.
process.chdir(__dirname);
'use strict';
const E = require('../simulador_d/env.js'), fs = require('fs'), { estado } = require('./comum.js'), sim = E.sim;
const part = +process.argv[2] || 0, np = +process.argv[3] || 1, NTE = +process.env.CTM_NTE || 100;
const MARKS = [1, 2, 4, 8, 12, 24];
const out = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste2(i)), ep = new E.Ep(sc, 10, { variavel: false }), st = estado(E, ep);
  for (const pre of [0, 4, 8]) {
    while (ep.m < pre && ep.m < E.NB) ep.advance(15);
    if (ep.done) break;
    const s = st.save(), C = ep.legalBase(), C0 = ep.stab, acts = [];
    for (const c of C) {
      st.load(s); ep.apply(c); const v0 = ep.vh, r = {};
      for (let b = 1; b <= 24 && ep.m < E.NB; b++) { ep.advance(15); if (MARKS.includes(b)) r[b * 15] = { C: ep.stab, vh: ep.vh - v0 }; }
      const d = ep.desc(c); if (c.type === 'DESOB') { d.cls = c.ev.cls; d.rm = c.ev.rm; d.fluxo = E.importance(c.ev).fluxo; }
      acts.push({ ...d, res: r });
    }
    st.load(s);
    out.push({ i, pre: pre * 15, C0, acts });
  }
  console.log(i, out.filter(o => o.i === i).length, 'estados');
}
fs.writeFileSync(`results/auditoria_${part}.json`, JSON.stringify(out));
