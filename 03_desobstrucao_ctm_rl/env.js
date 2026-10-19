// Ambiente da proposta CTM–RL (Andina, out/2026), adaptado ao que foi combinado na reunião:
// rede começa obstruída (momento real de 2024), decisão a cada 1 h, horizonte H = 12 h, orçamento K ∈ {1,3,5,10},
// ações: ESPERAR (não gasta), DESOBSTRUIR interdição real, INTERROMPER, CONTROLE 50%, LIBERAR controle (gastam 1).
// KPI: horas até ≥ 80% dos postos de contagem (trechos observáveis) estarem estáveis; r = −1 por hora até estabilizar.
'use strict';
const fs = require('fs');
const { makeSim } = require('./sim.js');
const D = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'data', 'derived', 'rsdata.json')));
const SCAN = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'results', 'scan.json')));
const sim = makeSim(D);
const H = 12, B = 32, THR = 0.8, T0 = 1.5 * 1440;
const TYPES = ['WAIT', 'DESOB', 'INTERR', 'CTRL50', 'LIBERAR'];
const NF = 18;

// ---------- estrutura da malha ----------
const nN = D.nodes.length;
const deg = new Int16Array(nN); for (const e of D.edges) { deg[e.a]++; deg[e.b]++; }
const adj = D.nodes.map(() => []); D.edges.forEach((e, i) => { adj[e.a].push([e.b, Math.max(0.1, e.km)]); adj[e.b].push([e.a, Math.max(0.1, e.km)]); });
const nb = D.nodes.map(() => new Set()); D.edges.forEach(e => { nb[e.a].add(e.b); nb[e.b].add(e.a); });
const two = n => { const s = new Set([n]); for (const a of nb[n]) { s.add(a); for (const b of nb[a]) s.add(b); } return s; };
const EDEG = D.edges.map(e => deg[e.a] + deg[e.b] - 2);
const ETWO = D.edges.map(e => { const s = two(e.a); for (const x of two(e.b)) s.add(x); return s.size; });
// distância (km) de cada nó ao posto mais próximo → confiança da medição usada para cada candidato
const stNode = sim.STATIONS.map(st => D.edges[st.e].a);
function dijkstra(src) { const d = new Float64Array(nN).fill(Infinity); d[src] = 0; const done = new Uint8Array(nN);
  for (;;) { let u = -1, b = Infinity; for (let i = 0; i < nN; i++) if (!done[i] && d[i] < b) { b = d[i]; u = i; } if (u < 0) break; done[u] = 1; for (const [v, w] of adj[u]) if (d[u] + w < d[v]) d[v] = d[u] + w; } return d; }
const DST = sim.STATIONS.map(st => { const e = D.edges[st.e], da = dijkstra(e.a), db = dijkstra(e.b); return da.map((x, i) => Math.min(x, db[i])); });
const NEAR = D.edges.map(e => { let best = 0, bd = Infinity; DST.forEach((d, j) => { const x = Math.min(d[e.a], d[e.b]); if (x < bd) { bd = x; best = j; } }); return [best, bd]; });

// ---------- referência (sem interdições) e estabilidade ----------
const hourIdx = t => Math.round((t - T0) / 60) - 1;   // índice da hora que termina em t
function stableFrac(flows, t) {
  const ref = SCAN.ref[hourIdx(t)]; let st = 0, n = 0;
  flows.forEach((v, j) => { if (ref[j] < 5) return; n++; if (Math.abs(v - ref[j]) <= Math.max(0.2 * ref[j], 30)) st++; });
  return n ? st / n : 1;
}
function stFlags(flows, t) { const ref = SCAN.ref[hourIdx(t)]; return flows.map((v, j) => ref[j] < 5 ? '-' : (Math.abs(v - ref[j]) <= Math.max(0.2 * ref[j], 30) ? '1' : '0')).join(''); }
// fluxo "típico" que um operador conhece antes do evento: perfil horário médio do posto (dados anteriores)
const prof = (t) => { const dow = (5 + Math.floor(t / 1440)) % 7, hr = Math.floor(t / 60) % 24; return D.prof[dow][hr]; };
function stPrior(j, t) { const s = D.stations[j], dow = (5 + Math.floor(t / 1440)) % 7, hr = Math.floor(t / 60) % 24; return s.ref ? Math.max(1, s.ref[dow][hr]) : 1; }

// ---------- partida: replay real até cada hora de início ----------
function starts() {
  const cand = SCAN.info.filter(x => x.stab < THR).map(x => x.t);
  sim.reset(T0); sim.S.real = true;
  sim.setEvents(sim.SITES.map(s => ({ i: s.idx, s: s.s, f: s.f, cells: s.cells })));
  const out = [], hist = [];
  for (const t of cand) {
    while (sim.S.t < t) { sim.run(60); hist.push(sim.hourFlows()); }
    out.push({ t, z: sim.snap(), hist: hist.slice(-3), stab0: stableFrac(hist[hist.length - 1], t) });
  }
  return out;
}

// ---------- episódio ----------
class Ep {
  constructor(st, K) {
    sim.restore(st.z); this.t0 = st.t; this.K = K; this.left = K; this.h = 0; this.hist = st.hist.map(x => x.slice());
    this.ctrl = new Map(); // id do link -> {type, since}
    this.stabs = []; this.stab = st.stab0; this.done = this.stab >= THR; this.kpi = this.done ? 0 : null; this.vh = 0; this.log = [];
  }
  legal() {
    const out = [{ type: 'WAIT' }];
    if (this.done || this.left <= 0) return out;
    const act = sim.S.ev.filter(e => e.on), t = sim.S.t;
    const sc = id => { const e = D.edges[id]; return e; };
    const z = arr => { const m = arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length); const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, arr.length)) + 1e-9; return arr.map(x => (x - m) / sd); };
    const pf = t => { let s = 0; for (let k = 0; k < 3; k++) s += prof(t + 60 * k); return s / 3; };
    const eq2 = list => { const fu = z(list.map(c => D.edges[c.e].vdm * pf(t))), now = z(list.map(c => D.edges[c.e].vdm * prof(t))), dg = z(list.map(c => EDEG[c.e])), tw = z(list.map(c => ETWO[c.e]));
      list.forEach((c, j) => { c.score = fu[j] + 0.5 * now[j] + 0.3 * dg[j] + 0.2 * tw[j]; c.zf = fu[j]; c.zs = now[j]; c.zd = dg[j]; c.zt = tw[j]; }); return list; };
    // desobstruir: interdições reais ativas que a equipe consegue remover (água na pista não)
    let des = act.filter(ev => ev.f > t && ev.s <= t && sim.SITES[ev.i].cls !== 'agua').map(ev => ({ type: 'DESOB', ev, e: sim.SITES[ev.i].e, since: ev.s }));
    // controles: trechos que chegam aos entroncamentos das interdições ativas
    const feed = new Map();
    for (const ev of act) { const e = sim.SITES[ev.i].e, E = D.edges[e]; for (const n of [E.a, E.b]) for (const k of sim.nodes[n].ins) if (k.e !== E && !this.ctrl.has(k.id)) feed.set(k.id, { k, since: ev.s }); }
    let ctl = []; for (const { k, since } of feed.values()) for (const ty of ['INTERR', 'CTRL50']) ctl.push({ type: ty, link: k.id, e: k.ei, since });
    const lib = [...this.ctrl.entries()].map(([id, c]) => ({ type: 'LIBERAR', link: id, e: sim.links[id].ei, since: c.since }));
    const all = eq2([...des, ...ctl, ...lib]);
    des = all.filter(c => c.type === 'DESOB').sort((a, b) => b.score - a.score).slice(0, 20);
    const libs = all.filter(c => c.type === 'LIBERAR');
    ctl = all.filter(c => c.type === 'INTERR' || c.type === 'CTRL50').sort((a, b) => b.score - a.score).slice(0, Math.max(0, B - des.length - libs.length));
    return out.concat(des, libs, ctl);
  }
  feats(C) {
    const t = sim.S.t, [h0, h1, h2] = [this.hist[this.hist.length - 1], this.hist[this.hist.length - 2] || this.hist[this.hist.length - 1], this.hist[this.hist.length - 3] || this.hist[this.hist.length - 1]];
    const nAct = sim.S.ev.filter(e => e.on).length;
    return C.map(c => {
      const f = new Array(NF).fill(0); f[TYPES.indexOf(c.type)] = 1;
      f[14] = this.left / 10; f[15] = this.h / H; f[16] = nAct / 30; f[17] = this.stab;
      if (c.type === 'WAIT') return f;
      const [j, d] = NEAR[c.e], pr = stPrior(j, t);
      f[5] = c.zf; f[6] = c.zs; f[7] = c.zd; f[8] = c.zt;
      f[9] = Math.min(2, h0[j] / pr); f[10] = Math.min(2, h1[j] / pr); f[11] = Math.min(2, h2[j] / pr);
      f[12] = Math.exp(-d / 30); f[13] = Math.log1p(Math.max(0, t - c.since) / 60) / 5;
      return f;
    });
  }
  apply(c) {
    const t = sim.S.t;
    if (c.type === 'WAIT') return;
    this.left--;
    if (c.type === 'DESOB') { const ev = sim.S.ev.find(x => x === c.ev || (x.i === c.ev.i && x.on)); if (ev) ev.f = t; }
    else if (c.type === 'INTERR' || c.type === 'CTRL50') { sim.links[c.link].man[0] = c.type === 'INTERR' ? 0 : 0.5; this.ctrl.set(c.link, { type: c.type, since: t }); }
    else if (c.type === 'LIBERAR') { sim.links[c.link].man[0] = 1; this.ctrl.delete(c.link); }
  }
  // avança 1 h; devolve recompensa (−1 enquanto não estabiliza)
  advance() {
    const d0 = sim.S.delay; sim.run(60); this.vh += sim.S.delay - d0;
    const fl = sim.hourFlows(); this.hist.push(fl); if (this.hist.length > 3) this.hist.shift();
    this.h++; this.stab = stableFrac(fl, sim.S.t); this.stabs.push(this.stab);
    if (!this.done && this.stab >= THR) { this.done = true; this.kpi = this.h; return 0; }
    return this.done ? 0 : -1;
  }
  desc(c) {
    if (c.type === 'WAIT') return { type: 'WAIT' };
    if (c.type === 'DESOB') return { type: 'DESOB', site: c.ev.i };
    const k = sim.links[c.link]; return { type: c.type, edge: k.ei, dir: k.dir, to: k.to };
  }
}
// sincroniza o objeto de evento após restore (snap copia os eventos)
function bindEv(ep, c) { if (c.type === 'DESOB') c.ev = sim.S.ev.find(x => x.i === c.ev.i && x.on) || c.ev; return c; }

const P = {
  wait: (ep, C) => C[0],
  greedy: (ep, C) => { // clona o ambiente, testa cada ação por 1 h e fica com a de maior ganho imediato (fração estável; desempate: menos veículo-hora)
    if (C.length === 1) return C[0];
    const z = sim.snap(), save = { left: ep.left, h: ep.h, hist: ep.hist.map(x => x.slice()), ctrl: new Map(ep.ctrl), stab: ep.stab, done: ep.done, kpi: ep.kpi, vh: ep.vh, stabs: ep.stabs.slice() };
    let best = 0, bs = -1, bv = Infinity;
    C.forEach((c, j) => {
      sim.restore(z); Object.assign(ep, { left: save.left, h: save.h, hist: save.hist.map(x => x.slice()), ctrl: new Map(save.ctrl), stab: save.stab, done: save.done, kpi: save.kpi, vh: save.vh, stabs: save.stabs.slice() });
      const cc = bindEv(ep, { ...c }); ep.apply(cc); const v0 = ep.vh; ep.advance(); const dv = ep.vh - v0;
      if (ep.stab > bs + 1e-9 || (Math.abs(ep.stab - bs) <= 1e-9 && dv < bv - 1e-6)) { bs = ep.stab; bv = dv; best = j; }
    });
    sim.restore(z); Object.assign(ep, { left: save.left, h: save.h, hist: save.hist, ctrl: save.ctrl, stab: save.stab, done: save.done, kpi: save.kpi, vh: save.vh, stabs: save.stabs });
    return bindEv(ep, C[best]);
  },
};
function runEpisode(st, K, pol, opt = {}) {
  const ep = new Ep(st, K);
  const frames = [];
  const rec = () => { if (opt.frames) frames.push({ t: sim.S.t, s: sim.slowFrac().map(x => x.join('')).join(''), on: sim.S.ev.filter(e => e.on).map(e => e.i), ctrl: [...ep.ctrl.entries()].map(([id, c]) => [sim.links[id].ei, sim.links[id].dir, c.type]), stab: ep.stab, st: stFlags(ep.hist[ep.hist.length - 1], sim.S.t) }); };
  rec();
  const qs = [];
  for (let h = 0; h < H; h++) {
    const C = ep.legal(); const c = pol(ep, C, qs);
    ep.log.push({ h, n: C.length, ...ep.desc(c) });
    ep.apply(c); ep.advance(); rec();
  }
  let sus = H + 1; for (let h = H; h >= 1; h--) { if (ep.stabs[h - 1] >= THR) sus = h; else break; }
  return { stabs: ep.stabs, sustained: sus, unstable: ep.stabs.filter(x => x < THR).length, kpi: ep.kpi == null ? H + 1 : ep.kpi, censored: ep.kpi == null, vh: ep.vh, log: ep.log, used: ep.K - ep.left, frames, q0: qs[0] };
}
module.exports = { sim, D, H, B, NF, THR, TYPES, Ep, P, starts, runEpisode, bindEv, SCAN };
