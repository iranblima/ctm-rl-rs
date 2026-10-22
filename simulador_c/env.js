// Cenário C da proposta CTM–RL: interdições sintéticas de quatro tipos.
// Demanda pelo VDM do DNIT por sentido; KPI e observação em todos os 630 sentidos de trecho; obstruções sorteadas na rede toda.
// Cada obstrução tem um tipo, com duração, capacidade restante e tempo de remoção próprios (tabela TIPOS abaixo).
// Desobstruir deixa de ser instantâneo: a interdição só sai depois do tempo de remoção do tipo.
// Atributos: 18 (tipo de ação, prioridade, fluxo do trecho e dos vizinhos, orçamento, progresso) + 4 do tipo da interdição = 22.
// Ações: todas (esperar, desobstruir, interromper, controle 50%, liberar) ou, com CTM_ACOES=desob, só esperar e desobstruir.
'use strict';
const fs = require('fs'), path = require('path');
const { makeSim } = require('./sim.js');
const DATA = p => path.join(__dirname, '..', 'data', 'derived', p);
const D = JSON.parse(fs.readFileSync(DATA('rsdata.json')));
const VDM = JSON.parse(fs.readFileSync(DATA('vdm_dnit.json')));
let OBS = process.env.CTM_OBS === 'postos' ? 'postos' : 'total';
const setObs = m => { const p = OBS; OBS = m; return p; };
const sim = makeSim(D, { vdm: VDM });
const H = 12, B = 32, THR = 0.8, WARM = 720;
const TYPES = ['WAIT', 'DESOB', 'INTERR', 'CTRL50', 'LIBERAR'];
const NF = 22;
let ACOES = process.env.CTM_ACOES === 'desob' ? 'desob' : 'todas';
const setAcoes = m => { const p = ACOES; ACOES = m; return p; };

// ---------- estrutura ----------
const nN = D.nodes.length;
const deg = new Int16Array(nN); for (const e of D.edges) { deg[e.a]++; deg[e.b]++; }
const nb = D.nodes.map(() => new Set()); D.edges.forEach(e => { nb[e.a].add(e.b); nb[e.b].add(e.a); });
const two = n => { const s = new Set([n]); for (const a of nb[n]) { s.add(a); for (const b of nb[a]) s.add(b); } return s; };
const EDEG = D.edges.map(e => deg[e.a] + deg[e.b] - 2);
const ETWO = D.edges.map(e => { const s = two(e.a); for (const x of two(e.b)) s.add(x); return s.size; });
const EVDM = VDM.map(v => v.C + v.D);
const prof = t => { const dow = (5 + Math.floor(t / 1440)) % 7, hr = Math.floor(t / 60) % 24; return D.prof[dow][hr]; };
// fluxo típico esperado de cada sentido na hora que termina em t (conhecido antes do evento: VDM × perfil horário)
const prior = (k, t) => Math.max(1, k.T * prof(t - 1));
// postos (modo de controle): posto mais próximo de cada trecho, por distância na malha
const adj = D.nodes.map(() => []); D.edges.forEach(e => { adj[e.a].push([e.b, Math.max(0.1, e.km)]); adj[e.b].push([e.a, Math.max(0.1, e.km)]); });
function dijkstra(src) { const d = new Float64Array(nN).fill(Infinity); d[src] = 0; const done = new Uint8Array(nN);
  for (;;) { let u = -1, b = Infinity; for (let i = 0; i < nN; i++) if (!done[i] && d[i] < b) { b = d[i]; u = i; } if (u < 0) break; done[u] = 1; for (const [v, w] of adj[u]) if (d[u] + w < d[v]) d[v] = d[u] + w; } return d; }
const DST = sim.STATIONS.map(st => { const e = D.edges[st.e], da = dijkstra(e.a), db = dijkstra(e.b); return da.map((x, i) => Math.min(x, db[i])); });
const NEAR = D.edges.map(e => { let best = 0, bd = Infinity; DST.forEach((d, j) => { const x = Math.min(d[e.a], d[e.b]); if (x < bd) { bd = x; best = j; } }); return [best, bd]; });
function stPrior(j, t) { const s = D.stations[j], dow = (5 + Math.floor(t / 1440)) % 7, hr = Math.floor((t - 1) / 60) % 24; return s.ref ? Math.max(1, s.ref[dow][hr]) : 1; }

// ---------- gerador de cenários ----------
function rng(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
// ---------- tipos de interdição (suposições do cenário C; ver CENARIO_C.md) ----------
// p: proporção; dur: duração natural em minutos (se ninguém desobstruir); both: chance de bloquear os dois sentidos;
// cap: capacidade que sobra no ponto (0 = bloqueio total, 0,5 = meia pista); rem: tempo de remoção após desobstruir [mín, máx] em minutos;
// cap2: capacidade depois da remoção (null = libera tudo); removível = rem != null.
const realBy = c => sim.SITES.filter(s => s.cls === c);
const realDur = c => realBy(c).map(s => s.f - s.s);
const realBoth = c => realBy(c).filter(s => s.d === 0).length / Math.max(1, realBy(c).length);
const TIPOS = {
  acidente:  { p: 0.40, dur: r => Math.round(60 * Math.min(10, Math.max(0.75, 2.5 * Math.exp(0.6 * gauss(r))))), both: 0.30, cap: r => (r() < 0.5 ? 0 : 0.5), rem: [30, 90], cap2: null },
  barreira:  { p: 0.25, dur: r => pick(r, realDur('barr')), both: realBoth('barr'), cap: () => 0, rem: [120, 360], cap2: null },
  estrutura: { p: 0.15, dur: r => pick(r, realDur('estr')), both: realBoth('estr'), cap: () => 0, rem: [360, 720], cap2: 0.5 },
  agua:      { p: 0.20, dur: r => pick(r, realDur('agua')), both: realBoth('agua'), cap: () => 0, rem: null, cap2: null },
};
const TNAMES = Object.keys(TIPOS);
const REM_MED = Object.fromEntries(TNAMES.map(k => [k, TIPOS[k].rem ? (TIPOS[k].rem[0] + TIPOS[k].rem[1]) / 2 : 0]));
function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function drawType(r) { let u = r(), a = 0; for (const k of TNAMES) { a += TIPOS[k].p; if (u < a) return k; } return TNAMES.at(-1); }
const WCUM = (() => { let a = 0; return EVDM.map(v => (a += v)); })();
let BASES = null;           // estados de tráfego normal (semana típica), um a cada 2 h
const REF = new Map();      // fluxo horário de referência (sem obstrução) por base: horas 0..H a partir do início das decisões
function buildBases() {
  sim.reset(0); sim.S.real = false; sim.setEvents([]);
  sim.run(1440); sim.hourLinkFlows(); sim.hourFlows();
  BASES = []; for (let i = 0; i < 84; i++) { BASES.push(sim.snap()); sim.run(120); sim.hourLinkFlows(); sim.hourFlows(); }
}
function refFor(bi) {
  if (REF.has(bi)) return REF.get(bi);
  sim.restore(BASES[bi]); sim.S.real = false; sim.setEvents([]);
  sim.run(WARM - 60); sim.hourLinkFlows(); sim.hourFlows();
  const lk = [], st = [];
  for (let h = 0; h <= H; h++) { sim.run(60); lk.push(sim.hourLinkFlows()); st.push(sim.hourFlows()); }
  const r = { lk, st }; REF.set(bi, r); return r;
}
function stable(flows, ref) { let s = 0, n = 0; flows.forEach((v, j) => { if (ref[j] < 5) return; n++; if (Math.abs(v - ref[j]) <= Math.max(0.2 * ref[j], 30)) s++; }); return n ? s / n : 1; }
function flags(flows, ref) { return flows.map((v, j) => ref[j] < 5 ? '-' : (Math.abs(v - ref[j]) <= Math.max(0.2 * ref[j], 30) ? '1' : '0')).join(''); }
// um cenário: tráfego normal + N obstruções sorteadas (peso pelo volume), iniciadas 1 a 12 h antes da primeira decisão
// atalho: guarda, por semente, a tentativa aceita (results/cenarios_c.json); o sorteio é o mesmo, só pula as tentativas rejeitadas
const HINTF = path.join(__dirname, 'results', 'cenarios_c.json');
const SC_HINT = new Map(fs.existsSync(HINTF) ? Object.entries(JSON.parse(fs.readFileSync(HINTF))).map(([k, v]) => [+k, v]) : []);
function saveHint(seed, tries) { if (SC_HINT.get(seed) === tries || process.env.CTM_NOHINT) return; SC_HINT.set(seed, tries); try { const o = fs.existsSync(HINTF) ? JSON.parse(fs.readFileSync(HINTF)) : {}; o[seed] = tries; fs.mkdirSync(path.dirname(HINTF), { recursive: true }); fs.writeFileSync(HINTF, JSON.stringify(o)); } catch (e) { } }
function scenario(seed) {
  if (!BASES) buildBases();
  for (let tries = (SC_HINT.get(seed) || 0); tries < 400; tries++) {
    const r = rng(seed * 7919 + tries * 104729 + 17);
    const bi = Math.floor(r() * BASES.length), base = BASES[bi], t0 = base.t + WARM;
    const n = 4 + Math.floor(r() * 9), used = new Set(), evs = [];
    while (evs.length < n) {
      const u = r() * WCUM.at(-1); let e = WCUM.findIndex(c => c >= u); if (e < 0) e = WCUM.length - 1;
      if (used.has(e)) continue; used.add(e);
      const cls = drawType(r), T = TIPOS[cls];
      const fr = 0.1 + 0.8 * r(), d = r() < T.both ? 0 : (r() < 0.5 ? 1 : -1), dur = T.dur(r), cap = T.cap(r);
      // início entre 1 h e 12 h antes da primeira decisão, sem passar do ponto em que a interdição já teria acabado
      const back = 60 + Math.floor(r() * Math.max(1, Math.min(WARM, Math.max(90, dur - 30)) - 60)), s = t0 - back;
      const rm = T.rem ? T.rem[0] + Math.floor(r() * (T.rem[1] - T.rem[0] + 1)) : null;
      evs.push({ i: evs.length, e, fr, d, s, f: Math.max(t0 + 30, s + dur), cls, cap, rm, cap2: T.cap2, r2: null, dt: null, cells: sim.cellsAt(D.edges[e], fr, d) });
    }
    const ref = refFor(bi);
    sim.restore(base); sim.S.real = false; sim.setEvents(evs);
    sim.run(WARM - 180); sim.hourLinkFlows(); sim.hourFlows();
    const hl = [], hs = [];
    for (let h = 0; h < 3; h++) { sim.run(60); hl.push(sim.hourLinkFlows()); hs.push(sim.hourFlows()); }
    const stab0 = stable(hl[2], ref.lk[0]);
    if (stab0 < THR) { saveHint(seed, tries); return { seed, tries, bi, t: t0, z: sim.snap(), hl, hs, ref, stab0, n }; }
  }
  throw new Error('cenário não obstruído após 400 tentativas: ' + seed);
}

// ---------- episódio ----------
class Ep {
  constructor(sc, K) {
    sim.restore(sc.z); sim.S.real = false; this.sc = sc; this.t0 = sc.t; this.K = K; this.left = K; this.h = 0;
    this.hl = sc.hl.map(x => x.slice()); this.hs = sc.hs.map(x => x.slice());
    this.ctrl = new Map(); this.stabs = []; this.stab = sc.stab0; this.done = this.stab >= THR; this.kpi = this.done ? 0 : null; this.vh = 0; this.log = [];
  }
  legal() {
    const out = [{ type: 'WAIT' }];
    if (this.done || this.left <= 0) return out;
    const t = sim.S.t, act = sim.S.ev.filter(e => e.on);
    const z = arr => { const m = arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length); const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, arr.length)) + 1e-9; return arr.map(x => (x - m) / sd); };
    const pf = t => { let s = 0; for (let k = 0; k < 3; k++) s += prof(t + 60 * k); return s / 3; };
    const eq2 = list => { const fu = z(list.map(c => EVDM[c.e] * pf(t))), now = z(list.map(c => EVDM[c.e] * prof(t))), dg = z(list.map(c => EDEG[c.e])), tw = z(list.map(c => ETWO[c.e]));
      list.forEach((c, j) => { c.score = fu[j] + 0.5 * now[j] + 0.3 * dg[j] + 0.2 * tw[j]; c.zf = fu[j]; c.zs = now[j]; c.zd = dg[j]; c.zt = tw[j]; }); return list; };
    let des = act.filter(ev => ev.f > t && ev.s <= t && ev.rm != null && ev.dt == null).map(ev => ({ type: 'DESOB', ev, e: ev.e, since: ev.s }));
    const feed = new Map();
    for (const ev of act) { const E = D.edges[ev.e]; for (const n of [E.a, E.b]) for (const k of sim.nodes[n].ins) if (k.e !== E && !this.ctrl.has(k.id)) feed.set(k.id, { k, since: ev.s }); }
    let ctl = []; for (const { k, since } of feed.values()) for (const ty of ['INTERR', 'CTRL50']) ctl.push({ type: ty, link: k.id, e: k.ei, since });
    const lib = [...this.ctrl.entries()].map(([id, c]) => ({ type: 'LIBERAR', link: id, e: sim.links[id].ei, since: c.since }));
    if (ACOES === 'desob') { ctl = []; }
    const all = eq2([...des, ...ctl, ...lib]);
    des = all.filter(c => c.type === 'DESOB').sort((a, b) => b.score - a.score).slice(0, 20);
    const libs = all.filter(c => c.type === 'LIBERAR');
    ctl = all.filter(c => c.type === 'INTERR' || c.type === 'CTRL50').sort((a, b) => b.score - a.score).slice(0, Math.max(0, B - des.length - libs.length));
    return out.concat(des, libs, ctl);
  }
  // 18 atributos por ação. Modo 'total': fluxo medido no próprio trecho (t, t−1, t−2) e nos trechos que chegam a ele.
  // Modo 'postos': fluxo no posto mais próximo, como no simulador original.
  feats(C) {
    const t = sim.S.t, L = this.hl.length, nAct = sim.S.ev.filter(e => e.on).length;
    const hl = [this.hl[L - 1], this.hl[L - 2] || this.hl[L - 1], this.hl[L - 3] || this.hl[L - 1]];
    const M = this.hs.length, hs = [this.hs[M - 1], this.hs[M - 2] || this.hs[M - 1], this.hs[M - 3] || this.hs[M - 1]];
    return C.map(c => {
      const f = new Array(NF).fill(0); f[TYPES.indexOf(c.type)] = 1;
      f[14] = this.left / 10; f[15] = this.h / H; f[16] = nAct / 30; f[17] = this.stab;
      if (c.type === 'WAIT') return f;
      if (c.type === 'DESOB') { const ev = c.ev; f[18] = ev.cls === 'acidente' ? 1 : 0; f[19] = ev.cls === 'barreira' ? 1 : 0; f[20] = ev.cls === 'estrutura' ? 1 : 0; f[21] = REM_MED[ev.cls] / 720; }
      f[5] = c.zf; f[6] = c.zs; f[7] = c.zd; f[8] = c.zt; f[13] = Math.log1p(Math.max(0, t - c.since) / 60) / 5;
      if (OBS === 'total') {
        const ks = c.link != null ? [sim.links[c.link]] : D.edges[c.e].links;
        for (let q = 0; q < 3; q++) { let o = 0, p = 0; for (const k of ks) { o += hl[q][k.id]; p += prior(k, t - 60 * q); } f[9 + q] = Math.min(2, o / p); }
        let o = 0, p = 0; for (const k of ks) for (const kk of sim.nodes[k.from].ins) { if (kk.e === k.e) continue; o += hl[0][kk.id]; p += prior(kk, t); }
        f[12] = p > 0 ? Math.min(2, o / p) : 1;
      } else {
        const [j, d] = NEAR[c.e], pr = stPrior(j, t);
        f[9] = Math.min(2, hs[0][j] / pr); f[10] = Math.min(2, hs[1][j] / pr); f[11] = Math.min(2, hs[2][j] / pr); f[12] = Math.exp(-d / 30);
      }
      return f;
    });
  }
  apply(c) {
    const t = sim.S.t;
    if (c.type === 'WAIT') return;
    this.left--;
    if (c.type === 'DESOB') { // começa a remoção; a interdição só sai (ou vira meia pista) depois do tempo de remoção
      const ev = sim.S.ev.find(x => x.i === c.ev.i && x.on);
      if (ev) { ev.dt = t; if (ev.cap2 == null) ev.f = Math.min(ev.f, t + ev.rm); else ev.r2 = t + ev.rm; }
    }
    else if (c.type === 'INTERR' || c.type === 'CTRL50') { sim.links[c.link].man[0] = c.type === 'INTERR' ? 0 : 0.5; this.ctrl.set(c.link, { type: c.type, since: t }); }
    else if (c.type === 'LIBERAR') { sim.links[c.link].man[0] = 1; this.ctrl.delete(c.link); }
  }
  advance() {
    const d0 = sim.S.delay; sim.run(60); this.vh += sim.S.delay - d0;
    const fl = sim.hourLinkFlows(), fs_ = sim.hourFlows();
    this.hl.push(fl); if (this.hl.length > 3) this.hl.shift(); this.hs.push(fs_); if (this.hs.length > 3) this.hs.shift();
    this.h++; this.stab = stable(fl, this.sc.ref.lk[this.h]); this.stabs.push(this.stab);
    if (!this.done && this.stab >= THR) { this.done = true; this.kpi = this.h; return 0; }
    return this.done ? 0 : -1;
  }
  desc(c) {
    if (c.type === 'WAIT') return { type: 'WAIT' };
    if (c.type === 'DESOB') return { type: 'DESOB', ev: c.ev.i, edge: c.ev.e };
    const k = sim.links[c.link]; return { type: c.type, edge: k.ei, dir: k.dir, to: k.to };
  }
  save() { return { z: sim.snap(), left: this.left, h: this.h, hl: this.hl.map(x => x.slice()), hs: this.hs.map(x => x.slice()), ctrl: new Map(this.ctrl), stab: this.stab, done: this.done, kpi: this.kpi, vh: this.vh, stabs: this.stabs.slice() }; }
  load(s) { sim.restore(s.z); sim.S.real = false; Object.assign(this, { left: s.left, h: s.h, hl: s.hl.map(x => x.slice()), hs: s.hs.map(x => x.slice()), ctrl: new Map(s.ctrl), stab: s.stab, done: s.done, kpi: s.kpi, vh: s.vh, stabs: s.stabs.slice() }); }
}

// Guloso: testa cada ação no simulador por L horas (a ação na 1ª hora, depois esperar) e fica com a que deixa mais trechos estáveis
// no fim (empate: menos veículo-hora; empate total: esperar). L = 1 é o Guloso dos cenários anteriores.
function greedyLook(ep, C, L) {
  if (C.length === 1) return C[0];
  const s = ep.save(), steps = Math.max(1, Math.min(L, H - ep.h)); let best = 0, bs = -1, bv = Infinity;
  C.forEach((c, j) => { ep.load(s); ep.apply(c); const v0 = ep.vh; for (let q = 0; q < steps; q++) ep.advance(); const dv = ep.vh - v0;
    if (ep.stab > bs + 1e-9 || (Math.abs(ep.stab - bs) <= 1e-9 && dv < bv - 1e-6)) { bs = ep.stab; bv = dv; best = j; } });
  ep.load(s); return C[best];
}
const P = {
  wait: (ep, C) => C[0],
  // Guloso: testa cada ação por 1 h no simulador e fica com a que deixa mais trechos estáveis (empate: menos veículo-hora; empate total: esperar)
  greedy: (ep, C) => greedyLook(ep, C, 1),
  // Guloso com 3 h de antecipação: cada ação é aplicada e o simulador avança 3 h esperando (útil quando a remoção demora)
  greedy3: (ep, C) => greedyLook(ep, C, 3),
};
function runEpisode(sc, K, pol, opt = {}) {
  const prevA = pol.acoes ? setAcoes(pol.acoes) : null;
  try { return runEpisode_(sc, K, pol, opt); } finally { if (prevA) setAcoes(prevA); }
}
function runEpisode_(sc, K, pol, opt) {
  const ep = new Ep(sc, K), frames = [];
  const rec = () => { if (opt.frames) frames.push({ s: sim.slowFrac().map(x => x.join('')).join(''), on: sim.S.ev.filter(e => e.on).map(e => e.i), rm: sim.S.ev.filter(e => e.on && e.dt != null).map(e => e.i), half: sim.S.ev.filter(e => e.on && e.cur > 0).map(e => e.i),
    ctrl: [...ep.ctrl.entries()].map(([id, c]) => [sim.links[id].ei, sim.links[id].dir, c.type]), stab: ep.stab, st: flags(ep.hl[ep.hl.length - 1], sc.ref.lk[ep.h]) }); };
  rec();
  for (let h = 0; h < H; h++) { const C = ep.legal(); const c = pol(ep, C); ep.log.push({ h, n: C.length, ...ep.desc(c) }); ep.apply(c); ep.advance(); rec(); }
  let sus = H + 1; for (let h = H; h >= 1; h--) { if (ep.stabs[h - 1] >= THR) sus = h; else break; }
  return { stabs: ep.stabs, sustained: sus, unstable: ep.stabs.filter(x => x < THR).length, kpi: ep.kpi == null ? H + 1 : ep.kpi, censored: ep.kpi == null, vh: ep.vh, log: ep.log, used: ep.K - ep.left, frames };
}
// conjuntos independentes de cenários (sementes separadas por faixa)
const SEEDS = { treino: s => 1000000 + s, validacao: i => 2000000 + i, teste: i => 3000000 + i };
module.exports = { sim, D, VDM, H, B, NF, TIPOS, TNAMES, setAcoes, get ACOES() { return ACOES; }, THR, TYPES, OBS, setObs, Ep, P, scenario, runEpisode, SEEDS, rng, stable, flags };
