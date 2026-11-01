// P1 — feedback sequencial: a MESMA política aprendida, replanejando × com plano fixo no início (sem novo treino).
// node revisao/p1.js <det|novas> <15|60> <parte> <nPartes>
// Políticas: D1-Q1 e D1-DDQN do cenário D (mesma recompensa; redes escolhidas na validação). Só esperar/desobstruir.
// Calendário fixo de decisões (15 ou 60 min, nos dois modos); a ação usa esse intervalo (o Δτ da observação é fixado nele).
//   replanejar: a cada decisão, a rede recebe a observação nova da rede viária e escolhe entre os candidatos válidos.
//   plano fixo: a observação do tráfego fica congelada no instante inicial (fluxos, estabilidade, nº de obstruções e a lista de
//               candidatos de t0). A cada decisão, só se atualiza o que o próprio controlador sabe sem observar o tráfego: relógio,
//               orçamento restante e o tempo desde o início de cada obstrução. Assim o plano inteiro é determinado em t0.
//               Se a ação planejada deixou de ser válida (a obstrução acabou sozinha), executa ESPERAR e registra.
// Condições: det = os cenários de teste do D sem mudança. novas = os mesmos cenários + 1 a 4 obstruções NOVAS que começam entre
//   30 min e 6 h depois da primeira decisão (desconhecidas em t0; sorteio fixo por cenário, igual nos dois modos e nas duas políticas).
process.chdir(__dirname);
'use strict';
const E = require('../simulador_d/env.js'), { Net } = require('../simulador_d/rl.js'), fs = require('fs'), sim = E.sim, D = E.D;
const [cond, CAL, part, np] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5]], NTE = +process.env.CTM_NTE || 100;
const NETS = Object.fromEntries(['D1-Q1', 'D1-DDQN'].map(M => [M, Net.from(JSON.parse(fs.readFileSync(`../simulador_d/results/${M}/selected.json`)).net)]));
const EVDM = E.VDM.map(v => v.C + v.D), WC = (() => { let a = 0; return EVDM.map(v => (a += v)); })();
function sorteiaTipo(r) { let u = r(), a = 0; for (const k of E.TNAMES) { a += E.TIPOS[k].p; if (u < a) return k; } return E.TNAMES.at(-1); }
function novasObstrucoes(ep, i) {        // injeta no simulador obstruções que só começam depois de t0
  const r = E.rng(7000000 + i), t0 = sim.S.t, n = 1 + Math.floor(r() * 4), usados = new Set(sim.S.ev.map(e => e.e)), out = [];
  let prox = Math.max(...sim.S.ev.map(e => e.i)) + 1;
  while (out.length < n) {
    const u = r() * WC.at(-1); let e = WC.findIndex(c => c >= u); if (e < 0) e = WC.length - 1; if (usados.has(e)) continue; usados.add(e);
    const cls = sorteiaTipo(r), T = E.TIPOS[cls], fr = 0.1 + 0.8 * r(), d = r() < T.both ? 0 : (r() < 0.5 ? 1 : -1);
    const s = t0 + 30 + Math.floor(r() * 331), dur = T.dur(r), cap = T.cap(r), rm = T.rem ? T.rem[0] + Math.floor(r() * (T.rem[1] - T.rem[0] + 1)) : null;
    const ev = { i: prox++, e, fr, d, s, f: s + Math.max(60, dur), cls, cap, rm, cap2: T.cap2, r2: null, dt: null, cells: sim.cellsAt(D.edges[e], fr, d), on: false, cur: null };
    sim.S.ev.push(ev); out.push({ i: ev.i, cls, s: s - t0 });
  }
  return out;
}
const argmax = Q => { let b = 0; for (let j = 1; j < Q.length; j++) if (Q[j] > Q[b]) b = j; return b; };
function episodio(sc, K, net, modo) {
  const ep = new E.Ep(sc, K, { variavel: false }), novas = cond === 'novas' ? novasObstrucoes(ep, sc.seed) : [];
  let plano = null; const usados = new Set(), log = []; let inviaveis = 0;
  while (!ep.done && ep.m < E.NB) {
    const C = ep.legal().map(c => ({ ...c, dt: CAL })), wait = C.find(c => c.type === 'WAIT');
    let c = wait;
    if (modo === 'replanejar') { c = C[argmax(net.fwd(ep.feats(C)).Q)]; }
    else {
      if (!plano) { plano = { C: C.map(x => ({ ...x })), X: ep.feats(C).map(f => Array.from(f)) }; }
      const t = sim.S.t, idx = [], X = [];
      plano.C.forEach((p, j) => { if (p.type !== 'WAIT' && (usados.has(p.ev.i) || ep.left <= 0)) return;
        const f = plano.X[j].slice(); f[14] = ep.left / 10; f[15] = ep.h / E.H; if (p.type !== 'WAIT') f[13] = Math.log1p(Math.max(0, t - p.since) / 60) / 5;
        idx.push(j); X.push(Float32Array.from(f)); });
      const p = plano.C[idx[argmax(net.fwd(X).Q)]];
      if (p.type === 'DESOB') { usados.add(p.ev.i); const agora = C.find(x => x.type === 'DESOB' && x.ev.i === p.ev.i); if (agora) c = agora; else inviaveis++; }
    }
    const m0 = ep.m; ep.apply(c); ep.advance(CAL, 0);
    if (c.type === 'DESOB') log.push({ m: m0, ev: c.ev.i, nova: novas.some(n => n.i === c.ev.i) });
  }
  return { kpi: ep.kpi == null ? E.H + 1 : ep.kpi, vh: Math.round(ep.vh), used: ep.K - ep.left, inviaveis, desob: log.length, desobNovas: log.filter(l => l.nova).length, novas: novas.length };
}
const res = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste2(i));
  for (const K of [1, 3, 5, 10]) {
    const item = { i, K, m: {} };
    for (const [M, net] of Object.entries(NETS)) for (const modo of ['replanejar', 'plano fixo']) item.m[`${M} · ${modo}`] = episodio(sc, K, net, modo);
    res.push(item); console.log(i, K, Object.entries(item.m).map(([k, v]) => `${k} ${v.kpi}`).join(' | '));
  }
}
fs.writeFileSync(`results/p1_${cond}_${CAL}_${part}.json`, JSON.stringify(res));
