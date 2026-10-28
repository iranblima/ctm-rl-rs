// Cenário C2 — auditoria offline de temporalidade (seção 13 da proposta): node audit.js <parte> <nPartes>
// Não é um controlador: nenhuma política usa estes resultados para decidir. Serve para medir se o ambiente tem oportunidade
// temporal, isto é, estados em que a melhor ação a longo prazo é diferente da melhor ação imediata.
// Estados auditados: os 100 cenários de teste novos, no início (t0) e depois de 60 e 120 min só esperando (300 estados).
// Em cada estado, cada ação válida (e esperar) é aplicada e depois só se espera ("continuação pré-definida"); registra-se a
// fração estável e o veículo-hora em 15, 30, 60, 120 e 180 min. Orçamento K = 10 (todas as ações disponíveis).
process.chdir(__dirname);
'use strict';
const E = require('./env.js'), fs = require('fs'), sim = E.sim;
const part = +process.argv[2] || 0, np = +process.argv[3] || 1, NTE = +process.env.CTM_NTE || 100;
const MARKS = [1, 2, 4, 8, 12];   // em blocos de 15 min: 15, 30, 60, 120, 180 min
const out = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste2(i));
  const ep = new E.Ep(sc, 10, { variavel: false });
  for (const pre of [0, 4, 8]) {                       // 0, 60 e 120 min de espera antes do estado auditado
    while (ep.m < pre && !(ep.m >= E.NB)) ep.advance(15);
    if (ep.done) break;                                // já estabilizou só esperando: não há o que auditar
    const z = sim.snap(), st = { bins: ep.bins.map(x => x.slice()), m: ep.m, stab: ep.stab, vh: ep.vh, left: ep.left, ctrl: new Map(ep.ctrl), stabs: ep.stabs.slice(), done: ep.done, kpi: ep.kpi };
    const C = ep.legalBase(), acts = [];
    for (const c of C) {
      sim.restore(z); sim.S.real = false; Object.assign(ep, { bins: st.bins.map(x => x.slice()), m: st.m, stab: st.stab, vh: st.vh, left: st.left, ctrl: new Map(st.ctrl), stabs: st.stabs.slice(), done: st.done, kpi: st.kpi });
      ep.apply(c); const v0 = ep.vh, res = {};
      for (let b = 1; b <= 12; b++) { ep.advance(15); if (MARKS.includes(b)) res[b * 15] = { C: ep.stab, vh: ep.vh - v0 }; }
      const d = ep.desc(c); if (c.type === 'DESOB') d.cls = c.ev.cls;
      acts.push({ ...d, res });
    }
    sim.restore(z); sim.S.real = false; Object.assign(ep, { bins: st.bins.map(x => x.slice()), m: st.m, stab: st.stab, vh: st.vh, left: st.left, ctrl: new Map(st.ctrl), stabs: st.stabs.slice(), done: st.done, kpi: st.kpi });
    out.push({ i, pre: pre * 15, C0: st.stab, nAcoes: C.length, acts });
  }
  console.log(i, out.filter(o => o.i === i).length, 'estados');
}
fs.writeFileSync(`results/auditoria_${part}.json`, JSON.stringify(out));
