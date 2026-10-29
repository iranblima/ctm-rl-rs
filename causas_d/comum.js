// Análise das causas (cenário D) — funções comuns. Nada aqui treina; tudo usa os mesmos 100 cenários de teste do D.
'use strict';
function estado(E, ep) {   // salva/restaura o episódio inteiro (simulador + contadores)
  const sim = E.sim;
  return {
    save: () => ({ z: sim.snap(), left: ep.left, m: ep.m, bins: ep.bins.map(x => x.slice()), ctrl: new Map(ep.ctrl), stab: ep.stab, stabs: ep.stabs.slice(), done: ep.done, kpi: ep.kpi, vh: ep.vh }),
    load: s => { sim.restore(s.z); sim.S.real = false; Object.assign(ep, { left: s.left, m: s.m, bins: s.bins.map(x => x.slice()), ctrl: new Map(s.ctrl), stab: s.stab, stabs: s.stabs.slice(), done: s.done, kpi: s.kpi, vh: s.vh }); },
  };
}
function contaAcoes(epochs) { const a = {}; for (const e of epochs) a[e.type] = (a[e.type] || 0) + 1; return a; }
module.exports = { estado, contaAcoes };
