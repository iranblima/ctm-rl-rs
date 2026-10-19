// Problema de decisão adaptado do artigo: a cada passo (6 h), a equipe libera UMA interdição ativa (a "semente" é a liberação de um trecho).
// K = 5 passos por episódio, lista curta B = 32 pela Eq. (2) adaptada, recompensa = −(veículo-hora perdido no passo).
'use strict';
const { makeSim } = require('./sim.js');
const K = 5, B = 32, STEP = 360, H = 3;
const D = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'data', 'derived', 'rsdata.json')));
const sim = makeSim(D);
const nN = D.nodes.length;
const deg = new Int16Array(nN); for (const e of D.edges) { deg[e.a]++; deg[e.b]++; }
const adj = D.nodes.map(() => []); D.edges.forEach(e => { adj[e.a].push(e.b); adj[e.b].push(e.a); });
const two = n => { const s = new Set([n]); for (const a of adj[n]) { s.add(a); for (const b of adj[n === a ? n : a]) s.add(b); } return s; };
const EDEG = D.edges.map(e => deg[e.a] + deg[e.b] - 2);
const ETWO = D.edges.map(e => { const s = two(e.a); for (const x of two(e.b)) s.add(x); return s.size; });
const RELEASABLE = s => s.cls !== 'agua';

function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const zs = a => { const m = a.reduce((p, q) => p + q, 0) / a.length; const sd = Math.sqrt(a.reduce((p, q) => p + (q - m) ** 2, 0) / a.length) + 1e-9; return a.map(x => (x - m) / sd); };

// candidatos legais: interdições ativas, liberáveis (não é água na pista), ainda não liberadas
function legal() { return sim.S.ev.filter(ev => ev.on && RELEASABLE(sim.SITES[ev.i])); }
function flowNow(ev) { return D.edges[sim.SITES[ev.i].e].vdm * sim.demandFactor(sim.S.t); }
function flowFuture(ev) { let s = 0; for (let h = 0; h < H * STEP / 60; h++) s += sim.demandFactor(sim.S.t + 60 * h); return D.edges[sim.SITES[ev.i].e].vdm * s / (H * STEP / 60); }
function shortlist() {
  const L = legal(); if (!L.length) return [];
  const zf = zs(L.map(flowFuture)), zst = zs(L.map(flowNow)), zd = zs(L.map(ev => EDEG[sim.SITES[ev.i].e])), zt = zs(L.map(ev => ETWO[sim.SITES[ev.i].e]));
  const sc = L.map((ev, j) => [zf[j] + 0.5 * zst[j] + 0.3 * zd[j] + 0.2 * zt[j], ev.i, ev]);
  sc.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return sc.slice(0, B).map(x => x[2]);
}
const NF = 11;
function features(C, k) {
  const e = C.map(ev => D.edges[sim.SITES[ev.i].e]);
  const zf = zs(C.map(flowFuture)), zst = zs(C.map(flowNow)), zd = zs(C.map(ev => EDEG[sim.SITES[ev.i].e])), zt = zs(C.map(ev => ETWO[sim.SITES[ev.i].e]));
  const nAct = sim.S.ev.filter(x => x.on).length;
  return C.map((ev, j) => {
    const ed = e[j];
    let slow = 0; for (const n of [ed.a, ed.b]) for (const kk of sim.nodes[n].ins) slow += kk.slow;
    return [zf[j], zst[j], zd[j], zt[j], Math.log1p(sim.queueVeh(ev)) / 8, Math.log1p(slow) / 4, ed.lanes / 2,
      Math.log1p(Math.max(0, ev.f - sim.S.t) / 60) / 5, k / K, nAct / 30, sim.demandFactor(sim.S.t)];
  });
}
// executa um passo: libera ev (ou nada) e simula 6 h; devolve veículo-hora perdido no passo
function release(ev) { if (ev) { ev.f = sim.S.t; ev.rel = sim.S.t; } }
function advance() { const d0 = sim.S.delay, g0 = sim.S.gaveup; sim.run(STEP); return { cost: sim.S.delay - d0, gave: sim.S.gaveup - g0 }; }

// ---------- cenários ----------
// treino/validação: tráfego de semana típica (perfil dos postos, sem o ajuste de 2024) e interdições sorteadas entre os 88 locais reais
let NORMAL = null;
function buildNormal() {
  sim.reset(0); sim.S.real = false; sim.setEvents([]);
  sim.run(1440); NORMAL = [];
  for (let i = 0; i < 28; i++) { NORMAL.push(sim.snap()); sim.run(360); }
}
const DURS = sim.SITES.map(s => s.f - s.s);
function synthScenario(seed) {
  if (!NORMAL) buildNormal();
  const r = rng(seed * 7919 + 13);
  const base = NORMAL[Math.floor(r() * NORMAL.length)];
  sim.restore(base); sim.S.real = false;
  const T = base.t + 720; // decisão começa 12 h depois
  const n = 5 + Math.floor(r() * 16), used = new Set(), evs = [];
  while (evs.length < n) {
    const i = Math.floor(r() * sim.SITES.length); if (used.has(i)) continue; used.add(i);
    const s = T - Math.floor(r() * 720), dur = DURS[Math.floor(r() * DURS.length)];
    evs.push({ i, s, f: Math.max(T + 30, s + dur), cells: sim.SITES[i].cells });
  }
  sim.setEvents(evs); sim.run(720);
  return sim.snap();
}
// teste: replay real (demanda ajustada pelos postos, interdições na data e hora reais)
function realStarts(times) {
  sim.reset(1.5 * 1440); sim.S.real = true;
  sim.setEvents(sim.SITES.map(s => ({ i: s.idx, s: s.s, f: s.f, cells: s.cells })));
  const out = [];
  for (const t of times) { sim.run(t - sim.S.t); out.push(sim.snap()); }
  return out;
}

// ---------- políticas ----------
const P = {
  none: () => null,
  random: (C, k, r) => C[Math.floor(r() * C.length)],
  greedy: (C) => { // guloso: simula 6 h à frente com cada candidato liberado e fica com o de menor custo (como o Greedy MC, sem sorteio)
    const z = sim.snap(); let best = null, bv = Infinity;
    for (const c of C) {
      sim.restore(z); const ev = sim.S.ev.find(x => x.i === c.i); release(ev);
      const { cost } = advance(); if (cost < bv - 1e-9) { bv = cost; best = c.i; }
    }
    sim.restore(z); return C.find(c => c.i === best);
  },
};
function runEpisode(start, pol, opt = {}) {
  sim.restore(start);
  const r = rng(opt.seed || 7), out = { costs: [], gave: [], seeds: [], frames: [], times: [], nc: [] };
  const rec = () => { if (opt.frames) out.frames.push({ t: sim.S.t, s: sim.slowFrac(), on: sim.S.ev.filter(e => e.on).map(e => e.i) }); };
  for (let k = 0; k < K; k++) {
    const C = shortlist();
    const c = C.length ? pol(C, k, r) : null;
    out.seeds.push(c ? c.i : -1); out.times.push(sim.S.t); out.nc.push(C.length);
    if (c) release(sim.S.ev.find(x => x.i === c.i));
    if (opt.frames) { let d0 = sim.S.delay, g0 = sim.S.gaveup; for (let h = 0; h < STEP / 60; h++) { rec(); sim.run(60); } out.costs.push(sim.S.delay - d0); out.gave.push(sim.S.gaveup - g0); }
    else { const a = advance(); out.costs.push(a.cost); out.gave.push(a.gave); }
  }
  if (opt.frames) rec();
  out.total = out.costs.reduce((a, b) => a + b, 0); out.gaveT = out.gave.reduce((a, b) => a + b, 0);
  return out;
}
module.exports = { sim, D, K, B, STEP, NF, legal, shortlist, features, release, advance, synthScenario, realStarts, P, runEpisode, rng, RELEASABLE };
