// Cenário D — dados da página do simulador (results/viz.json): node viz.js
// Grava a animação de 10 cenários de teste (1º, 11º, …, 91º) × 4 orçamentos, com um quadro a cada 15 min, para Esperar, Aleatória,
// o Guloso (regra do cenário C, sem alteração) com as 5 ações e só com esperar/desobstruir, e a rede escolhida de cada configuração.
// O Guloso com 5 ações roda no ambiente do C2 (mesmos cenários). Depois que a rede estabiliza, a animação segue só esperando até 12 h.
// Pode rodar por partes: node viz.js <i> grava só o cenário i (0, 10, …, 90) em results/viz_ep_<i>.json; sem argumento, junta tudo
// (e calcula o que faltar).
// Junta as tabelas do teste (results/summary.json) e os resultados do Guloso (results/guloso_*.json e summary_guloso.json).
process.chdir(__dirname);
'use strict';
const ED = require('./env.js'), E5 = require('../simulador_c2/env.js'), { Net, makePolicy } = require('./rl.js'), { CONFIGS } = require('./configs.js'), fs = require('fs'), D = ED.D;
const names = JSON.parse(fs.readFileSync('../data/derived/node_names.json'));
function greedyFor(E) {   // mesma regra de guloso.js
  const sim = E.sim;
  const save = ep => ({ z: sim.snap(), left: ep.left, m: ep.m, bins: ep.bins.map(x => x.slice()), ctrl: new Map(ep.ctrl), stab: ep.stab, stabs: ep.stabs.slice(), done: ep.done, kpi: ep.kpi, vh: ep.vh });
  const load = (ep, s) => { sim.restore(s.z); sim.S.real = false; Object.assign(ep, { left: s.left, m: s.m, bins: s.bins.map(x => x.slice()), ctrl: new Map(s.ctrl), stab: s.stab, stabs: s.stabs.slice(), done: s.done, kpi: s.kpi, vh: s.vh }); };
  return (ep, C) => {
    if (C.length === 1) return C[0];
    const s = save(ep); let best = 0, bs = -1, bv = Infinity;
    C.forEach((c, j) => { load(ep, s); ep.apply(c); const v0 = ep.vh; ep.advance(60, 0); const dv = ep.vh - v0;
      if (ep.stab > bs + 1e-9 || (Math.abs(ep.stab - bs) <= 1e-9 && dv < bv - 1e-6)) { bs = ep.stab; bv = dv; best = j; } });
    load(ep, s); return C[best];
  };
}
// método → [ambiente, política, Δτ variável]
const POL = { 'Esperar': [ED, ED.P.wait, false], 'Aleatória': [ED, ED.P.random, false], 'Guloso5': [E5, greedyFor(E5), false], 'GulosoD': [ED, greedyFor(ED), false] };
for (const [M, c] of Object.entries(CONFIGS)) POL[M] = [ED, makePolicy(Net.from(JSON.parse(fs.readFileSync(`results/${M}/selected.json`)).net)), c.variavel];
const enc = s => { const o = []; let i = 0; while (i < s.length) { let j = i; while (j < s.length && s[j] === s[i]) j++; o.push(j - i > 1 ? `${s[i]}*${j - i}` : s[i]); i = j; } return o.join(','); };
const bits = f => { const b = Buffer.alloc(Math.ceil(f.length / 8)); for (let j = 0; j < f.length; j++) if (f[j] === '0') b[j >> 3] |= 1 << (j & 7); return b.toString('base64'); };
const flags = (fl, ref) => fl.map((v, j) => ref[j] < 5 ? '-' : (Math.abs(v - ref[j]) <= Math.max(0.2 * ref[j], 30) ? '1' : '0')).join('');
const eps = [], SO = process.argv[2] != null ? +process.argv[2] : null;
for (let i = 0; i < 100; i += 10) {
  if (SO != null && i !== SO) continue;
  const PF = `results/viz_ep_${i}.json`;
  if (SO == null && fs.existsSync(PF)) { eps.push(...JSON.parse(fs.readFileSync(PF))); continue; }
  const mine = [];
  const scs = new Map([[ED, ED.scenario(ED.SEEDS.teste2(i))], [E5, E5.scenario(E5.SEEDS.teste2(i))]]), sc = scs.get(ED);
  const evs = sc.z.ev.map(e => ({ i: e.i, e: e.e, fa: +(D.edges[e.e].o === -1 ? 1 - e.fr : e.fr).toFixed(3), cls: e.cls, cap: e.cap, rm: e.rm }));
  for (const K of [1, 3, 5, 10]) {
    const item = { i, t: sc.t, K, stab0: sc.stab0, n: sc.n, evs, m: {} };
    for (const [nm, [E, pol, variavel]] of Object.entries(POL)) {
      const sim = E.sim, s0 = scs.get(E), ep = new E.Ep(s0, K, { variavel }), frames = [], log = [];
      const rec = () => frames.push({ s: enc(sim.slowFrac().map(x => x.join('')).join('')), on: sim.S.ev.filter(e => e.on).map(e => e.i),
        rm: sim.S.ev.filter(e => e.on && e.dt != null).map(e => e.i), half: sim.S.ev.filter(e => e.on && e.cur > 0).map(e => e.i),
        ctrl: [...ep.ctrl.entries()].map(([id, c]) => [sim.links[id].ei, sim.links[id].dir, c.type]), stab: +ep.stab.toFixed(4), st: bits(flags(ep.hl(0), s0.ref.roll[ep.m])) });
      rec();
      while (ep.m < E.NB) {
        if (!ep.done) { const C = ep.legal(), c = pol(ep, C), m0 = ep.m; ep.apply(c); const o = ep.advance(c.dt || 60, 0, rec); log.push({ m: m0, ...ep.desc(c), tau: o.tau, why: o.why }); }
        else ep.advance(15, 0, rec);
      }
      item.m[nm] = { kpi: ep.kpi == null ? E.H + 1 : ep.kpi, vh: Math.round(ep.vh), used: ep.K - ep.left, log, frames };
    }
    eps.push(item); mine.push(item); console.log('cenário', i + 1, 'K', K, Object.entries(item.m).map(([k, v]) => k + ' ' + v.kpi).join(' | '));
  }
  fs.writeFileSync(PF, JSON.stringify(mine));
}
if (SO != null) process.exit(0);
// tabelas: D (summary.json) + Guloso (guloso_*.json, summary_guloso.json)
const S = JSON.parse(fs.readFileSync('results/summary.json'));
const ld = pre => fs.readdirSync('results').filter(f => new RegExp(`^${pre}_\\d+\\.json$`).test(f)).flatMap(f => JSON.parse(fs.readFileSync(`results/${f}`)));
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
for (const [key, pre] of [['Guloso5', 'guloso_c2'], ['GulosoD', 'guloso_d']]) {
  const R = ld(pre); if (!R.length) continue;
  const acoes = {}; for (const r of R) for (const [t, n] of Object.entries(r.acoes)) acoes[t] = (acoes[t] || 0) + n;
  S.metodos[key] = { kpi: +mean(R.map(r => r.kpi)).toFixed(4), vh: mean(R.map(r => r.vh)), usadas: mean(R.map(r => r.used)), acoes, escolhaDtau: { 60: Object.values(acoes).reduce((a, b) => a + b, 0) },
    porK: Object.fromEntries([1, 3, 5, 10].map(K => [K, +mean(R.filter(r => r.K === K).map(r => r.kpi)).toFixed(4)])) };
}
const NG = { 'Guloso (5 ações)': 'Guloso5', 'Guloso (esperar/desobstruir)': 'GulosoD' };
if (fs.existsSync('results/summary_guloso.json')) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync('results/summary_guloso.json')))) {
  const [a, b] = k.split(' − ').map(x => NG[x] || x); S.contrastes.push({ a, b, kpi: v });
}
const out = { nodes: D.nodes, nodeNames: names, edges: D.edges.map(e => ({ a: e.a, b: e.b, sup: e.sup, br: e.br, ki: e.ki, kf: e.kf, o: e.o })),
  links: D.edges.flatMap((e, ei) => [[ei, 0], [ei, 1]]), methods: Object.keys(POL),
  nomes: { ...Object.fromEntries(Object.entries(CONFIGS).map(([k, v]) => [k, v.nome])), Guloso5: 'Guloso · 5 ações (como no cenário C)', GulosoD: 'Guloso · só esperar ou desobstruir' },
  variavel: Object.fromEntries(Object.entries(POL).map(([k, v]) => [k, v[2]])), eps, test: S, auditoria: null };
const str = JSON.stringify(out); fs.writeFileSync('results/viz.json', str); console.log('viz bytes', str.length);
