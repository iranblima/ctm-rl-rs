// Modelo de tráfego (transmissão por células) extraído do simulador das enchentes, para rodar no Node.
// Cenário C: cada interdição tem capacidade restante própria (0 = bloqueio total, 0,5 = meia pista) e pode mudar de estado
// (ex.: dano na estrutura vira meia pista depois da obra provisória). k.blk guarda, por célula, a menor capacidade entre as interdições ativas.
// Modo "fila": quem chega numa interdição para e espera; quem está parado antes do bloqueio desiste aos poucos (3% por minuto).
'use strict';
const DT = 1 / 60, KJ = 130;
const SUP = { DUP: { vf: 100, q: 2000 }, PAV: { vf: 80, q: 1500 }, IMP: { vf: 50, q: 700 }, TRV: { vf: 60, q: 1500 }, PLA: { vf: 80, q: 1500 } };

function classify(txt) {
  const t = (txt || '').toLowerCase();
  if (/água|agua|aguá|cheia|nível do rio|nivel do rio|alag|inund/.test(t)) return 'agua';
  if (/cedeu|ruindo|rompimento|galeria|reparo|cratera|erosão|erosao/.test(t)) return 'estr';
  if (/barreira|desliz|encosta/.test(t)) return 'barr';
  return 'nd';
}

function makeSim(D, opt = {}) {
  const VDM = opt.vdm || null; // cenário B: VDM por sentido do DNIT (C = km crescente, D = decrescente)
  const links = [], nodes = D.nodes.map((_, i) => ({ i, ins: [], outs: [] }));
  D.edges.forEach((e, ei) => {
    const sp = SUP[e.sup] || SUP.PAV, lanes = e.lanes, Q = lanes * sp.q, L = Math.max(e.km, 0.1);
    const nc = Math.max(1, Math.round(L / 2)), cl = L / nc, w = Q / (KJ * lanes - Q / sp.vf);
    e.links = [];
    for (const dir of [0, 1]) {
      const from = dir ? e.b : e.a, to = dir ? e.a : e.b;
      const k = { id: links.length, e, ei, dir, from, to, lanes, vf: sp.vf, Q, nc, cl,
        N: KJ * lanes * Math.max(cl, 1.5), qdt: Q * DT, vfr: Math.min(1, sp.vf * DT / cl), wr: Math.min(1, w * DT / cl),
        T: e.vdm / 2, cres: (e.o >= 0) ? dir === 0 : dir === 1, mid: Math.floor(nc / 2),
        v: new Float64Array(nc).fill(sp.vf), n: new Float64Array(nc), blk: new Float64Array(nc).fill(1), man: new Float64Array(nc).fill(1), S: new Float64Array(nc), R: new Float64Array(nc), out: new Float64Array(nc),
        inflow: 0, outflow: 0, src: 0, q: 0, slow: 0 };
      if (VDM) k.T = k.cres ? VDM[ei].C : VDM[ei].D;
      links.push(k); e.links.push(k); nodes[from].outs.push(k); nodes[to].ins.push(k);
    }
  });
  const DM = new Float64Array(links.length), RR = new Float64Array(links.length);
  for (const nd of nodes) {
    const X = new Map();
    const col = f => { let c = 0; for (const k of nd.ins) c += (X.get(k) && X.get(k).get(f)) || 0; return c; };
    for (const k of nd.ins) X.set(k, new Map());
    for (let it = 0; it < 4; it++) for (const k of nd.ins) {
      const row = X.get(k); let rs = 0; for (const v of row.values()) rs += v;
      const slack = k.T - rs; if (slack <= 1e-6) continue;
      const cands = nd.outs.filter(f => f.e !== k.e), cs = cands.map(f => Math.max(0, f.T - col(f)));
      const tot = cs.reduce((a, b) => a + b, 0); if (tot <= 1e-6) continue;
      cands.forEach((f, j) => { const add = Math.min(cs[j], slack * cs[j] / tot); row.set(f, (row.get(f) || 0) + add); });
    }
    for (const k of nd.ins) { const row = X.get(k); k.split = [...row.entries()].filter(([, v]) => v > 1e-6).map(([f, v]) => ({ f, b: k.T > 0 ? v / k.T : 0 })); k.fifo = k.lanes === 1; }
    for (const f of nd.outs) f.src = Math.max(0, f.T - col(f));
  }
  function cellsAt(e, frKm, d) {
    const fromA = e.o === -1 ? 1 - frKm : frKm, out = [];
    for (const k of e.links) {
      if (d !== 0 && e.o !== 0 && (d === 1) !== k.cres) continue;
      const pos = k.dir === 0 ? fromA : 1 - fromA;
      out.push([k.id, Math.min(k.nc - 1, Math.max(0, Math.floor(pos * k.nc)))]);
    }
    return out;
  }
  // interdições reais (locais) — usadas tanto no teste quanto para sortear cenários de treino
  const SITES = D.ints.map((it, idx) => ({ idx, e: it.e, br: it.br, km: it.km, mun: it.mun, cls: classify(it.txt), cells: cellsAt(D.edges[it.e], it.fr, it.d), s: it.s, f: it.f, d: it.d }));

  // postos de contagem (trechos observáveis): fluxo somado nos dois sentidos
  const STATIONS = D.stations.map((s, i) => {
    const e = D.edges[s.e];
    const fr = Math.min(1, Math.max(0, (s.km - e.ki) / Math.max(1e-6, e.kf - e.ki)));
    return { i, e: s.e, br: s.br, km: s.km, cells: cellsAt(e, fr, 0) };
  });
  const stAcc = new Float64Array(STATIONS.length);
  const lkAcc = new Float64Array(links.length); // fluxo horário no meio de cada sentido de trecho (cenário B: todos observáveis)
  // demanda
  const gReal = new Float64Array(D.nh).fill(1);
  for (let h = 0; h < D.nh; h++) {
    const dow = (5 + Math.floor(h / 24)) % 7, hr = h % 24; let so = 0, sr = 0, n = 0;
    for (const s of D.stations) { const o = s.obs[h]; if (o == null || !s.ref) continue; const r = s.ref[dow][hr]; if (r <= 0) continue; so += o; sr += r; n++; }
    if (n >= 6 && sr > 0) gReal[h] = Math.max(0.15, Math.min(1.6, so / sr));
  }

  const S = { t: 0, real: true, ev: [], delay: 0, gaveup: 0, congkm: 0 };
  // capacidade que a interdição impõe no minuto t (null = inativa)
  function want(ev, t) { if (!(ev.s <= t && t < ev.f)) return null; return (ev.r2 != null && t >= ev.r2) ? ev.cap2 : (ev.cap == null ? 0 : ev.cap); }
  function recompute(cells) {
    for (const [id, c] of cells) links[id].blk[c] = 1;
    for (const ev of S.ev) if (ev.cur != null) for (const [id, c] of ev.cells) { const k = links[id]; k.blk[c] = Math.min(k.blk[c], ev.cur); }
  }
  function applyEvents() {
    const touched = [];
    for (const ev of S.ev) { const w = want(ev, S.t); if (w !== ev.cur) { ev.cur = w; ev.on = w != null; touched.push(...ev.cells); } }
    if (touched.length) recompute(touched);
  }
  function demandFactor(m) {
    const h = Math.floor(m / 60), dow = (5 + Math.floor(m / 1440)) % 7, hr = Math.floor(m / 60) % 24;
    return D.prof[dow][hr] * (S.real && h >= 0 && h < D.nh ? gReal[h] : 1);
  }
  function nodeStep(nd, F) {
    const E = [];
    for (const k of nd.ins) E.push({ k, S: k.S[k.nc - 1], sp: k.split, fifo: k.fifo });
    for (const f of nd.outs) { f.q += f.src * F * DT; E.push({ src: f, S: f.q, sp: [{ f, b: 1 }], fifo: false }); }
    for (const f of nd.outs) DM[f.id] = 0;
    for (const e of E) for (const s of e.sp) DM[s.f.id] += e.S * s.b;
    for (const f of nd.outs) { const d = DM[f.id]; RR[f.id] = d > 1e-9 ? Math.min(1, f.R[0] / d) : 1; }
    for (const e of E) {
      let ff = 1;
      if (e.fifo) for (const s of e.sp) if (s.b > 0) ff = Math.min(ff, RR[s.f.id]);
      let moved = 0, bsum = 0;
      for (const s of e.sp) { const fl = e.S * s.b * (e.fifo ? ff : RR[s.f.id]); s.f.inflow += fl; moved += fl; bsum += s.b; }
      if (e.k) e.k.outflow = moved + e.S * Math.max(0, 1 - bsum) * (e.fifo ? ff : 1);
      else e.src.q = Math.max(0, e.src.q - moved);
    }
  }
  // desistência: quem está parado na fila (no trecho bloqueado ou em trechos com fila, velocidade < 50%) volta aos poucos
  function step() {
    applyEvents();
    const F = demandFactor(S.t);
    for (const k of links) {
      for (let i = 0; i < k.nc; i++) { const m = Math.min(k.blk[i], k.man[i]); k.S[i] = Math.min(k.vfr * k.n[i], k.qdt * m); k.R[i] = Math.min(k.qdt * m, k.wr * (k.N - k.n[i])); }
      k.inflow = 0; k.outflow = 0;
    }
    for (const nd of nodes) nodeStep(nd, F);
    let delay = 0, cong = 0, gu = 0;
    for (const k of links) {
      const n = k.n, out = k.out, nc = k.nc;
      // quem está parado (velocidade abaixo de 20% da livre) desiste aos poucos: 3% por minuto
      for (let i = 0; i < nc; i++) if (k.v[i] < 0.2 * k.vf && n[i] > 0.5) { const r = n[i] * 0.03; n[i] -= r; gu += r; }
      if (k.q > 1) { const r = k.q * 0.03 * Math.max(0, 1 - RR[k.id]); k.q -= r; gu += r; }
      for (let i = 0; i < nc; i++) out[i] = i < nc - 1 ? Math.min(k.S[i], k.R[i + 1]) : k.outflow;
      let slow = 0;
      for (let i = 0; i < nc; i++) {
        const before = n[i];
        n[i] = Math.max(0, before + (i === 0 ? k.inflow : out[i - 1]) - out[i]);
        delay += before * DT - out[i] * Math.max(k.cl / k.vf, DT);
        const v = before > 0.3 ? Math.min(k.vf, (out[i] / before) * k.cl / DT) : k.vf;
        k.v[i] = v;
        if (v < 0.5 * k.vf && before > 0.5) { cong += k.cl; slow += k.cl; }
      }
      k.slow = slow;
    }
    let wait = 0; for (const k of links) wait += k.q;
    S.delay += Math.max(0, delay) + wait * DT; S.gaveup += gu; S.congkm += cong * DT; S.cong = cong;
    for (const st of STATIONS) for (const [id, c] of st.cells) stAcc[st.i] += links[id].out[c];
    for (const k of links) lkAcc[k.id] += k.out[k.mid];
    S.t += 1;
  }
  function run(minutes) { for (let i = 0; i < minutes; i++) step(); }
  function reset(t) { stAcc.fill(0); lkAcc.fill(0); for (const k of links) { k.n.fill(0); k.blk.fill(1); k.man.fill(1); k.q = 0; k.v.fill(k.vf); } S.t = t; S.ev = []; S.delay = S.gaveup = S.congkm = 0; }
  function setEvents(evs) {
    const old = S.ev.flatMap(e => e.cells); S.ev = evs.map(e => ({ ...e, on: false, cur: null })); recompute(old);
    applyEvents();
  }
  function snap() { return { t: S.t, n: links.map(k => k.n.slice()), v: links.map(k => k.v.slice()), man: links.map(k => k.man.slice()), st: stAcc.slice(), lk: lkAcc.slice(), q: links.map(k => k.q), ev: S.ev.map(e => ({ ...e })), delay: S.delay, gaveup: S.gaveup, congkm: S.congkm, real: S.real }; }
  function restore(z) {
    const old = S.ev.flatMap(e => e.cells);
    links.forEach((k, i) => { k.n.set(z.n[i]); k.v.set(z.v[i]); k.man.set(z.man[i]); k.q = z.q[i]; }); stAcc.set(z.st); lkAcc.set(z.lk);
    S.t = z.t; S.real = z.real; S.delay = z.delay; S.gaveup = z.gaveup; S.congkm = z.congkm;
    S.ev = z.ev.map(e => ({ ...e, on: false, cur: null })); recompute(old); applyEvents();
  }
  // estado por trecho para os mapas: fração lenta por sentido
  function slowFrac() { return D.edges.map(e => e.links.map(k => Math.round(9 * k.slow / Math.max(0.1, k.nc * k.cl)))); }
  function queueVeh(ev) { // veículos parados antes do bloqueio
    let s = 0; for (const [id, c] of ev.cells) { const k = links[id]; for (let i = 0; i <= c; i++) s += k.n[i]; } return s;
  }
  function hourFlows() { const o = Array.from(stAcc); stAcc.fill(0); return o; }
  function hourLinkFlows() { const o = Array.from(lkAcc); lkAcc.fill(0); return o; }
  return { STATIONS, hourFlows, hourLinkFlows, cellsAt, D, S, links, nodes, SITES, run, step, reset, setEvents, snap, restore, slowFrac, queueVeh, gReal, demandFactor };
}
module.exports = { makeSim, classify };
