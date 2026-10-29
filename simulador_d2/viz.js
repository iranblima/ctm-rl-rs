// Cenário D2 — dados da página (results/viz.json). Parte da página do D (../simulador_d/results/viz.json) e acrescenta a animação
// do Guloso decidindo a cada 15 min (5 ações e só desobstruir) nos mesmos 10 cenários de teste × 4 orçamentos.
// node simulador_d2/viz.js        → grava as partes em paralelo (results/viz15_ep_<i>.json) e junta tudo em results/viz.json
// node simulador_d2/viz.js <i>    → grava só o cenário i (0, 10, …, 90)
process.chdir(__dirname);
'use strict';
const fs = require('fs'), os = require('os'), { spawn } = require('child_process');
const SO = process.argv[2] != null ? +process.argv[2] : null;
if (SO != null) grava(SO); else orquestra();

function greedy15For(E) {   // mesma regra de guloso15.js
  const sim = E.sim;
  const save = ep => ({ z: sim.snap(), left: ep.left, m: ep.m, bins: ep.bins.map(x => x.slice()), ctrl: new Map(ep.ctrl), stab: ep.stab, stabs: ep.stabs.slice(), done: ep.done, kpi: ep.kpi, vh: ep.vh });
  const load = (ep, s) => { sim.restore(s.z); sim.S.real = false; Object.assign(ep, { left: s.left, m: s.m, bins: s.bins.map(x => x.slice()), ctrl: new Map(s.ctrl), stab: s.stab, stabs: s.stabs.slice(), done: s.done, kpi: s.kpi, vh: s.vh }); };
  return (ep, C) => {
    let best = 0;
    if (C.length > 1) { const s = save(ep); let bs = -1, bv = Infinity;
      C.forEach((c, j) => { load(ep, s); ep.apply(c); const v0 = ep.vh; ep.advance(60, 0); const dv = ep.vh - v0;
        if (ep.stab > bs + 1e-9 || (Math.abs(ep.stab - bs) <= 1e-9 && dv < bv - 1e-6)) { bs = ep.stab; bv = dv; best = j; } });
      load(ep, s); }
    return { ...C[best], dt: 15 };
  };
}
function grava(i) {
  const ED = require('../simulador_d/env.js'), E5 = require('../simulador_c2/env.js');
  const POL = { Guloso15_5: [E5, greedy15For(E5)], Guloso15_D: [ED, greedy15For(ED)] };
  const enc = s => { const o = []; let a = 0; while (a < s.length) { let b = a; while (b < s.length && s[b] === s[a]) b++; o.push(b - a > 1 ? `${s[a]}*${b - a}` : s[a]); a = b; } return o.join(','); };
  const bits = f => { const b = Buffer.alloc(Math.ceil(f.length / 8)); for (let j = 0; j < f.length; j++) if (f[j] === '0') b[j >> 3] |= 1 << (j & 7); return b.toString('base64'); };
  const flags = (fl, ref) => fl.map((v, j) => ref[j] < 5 ? '-' : (Math.abs(v - ref[j]) <= Math.max(0.2 * ref[j], 30) ? '1' : '0')).join('');
  const scs = new Map([[ED, ED.scenario(ED.SEEDS.teste2(i))], [E5, E5.scenario(E5.SEEDS.teste2(i))]]), out = [];
  for (const K of [1, 3, 5, 10]) {
    const item = { i, K, m: {} };
    for (const [nm, [E, pol]] of Object.entries(POL)) {
      const sim = E.sim, s0 = scs.get(E), ep = new E.Ep(s0, K, { variavel: false }), frames = [], log = [];
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
    out.push(item); console.log('cenário', i + 1, 'K', K, Object.entries(item.m).map(([k, v]) => k + ' ' + v.kpi).join(' | '));
  }
  fs.writeFileSync(`results/viz15_ep_${i}.json`, JSON.stringify(out));
}
function orquestra() {
  const fila = [], t0 = Date.now(); for (let i = 0; i < 100; i += 10) if (!fs.existsSync(`results/viz15_ep_${i}.json`)) fila.push(i);
  const JOBS = Math.max(2, Math.min(10, os.cpus().length - 2)); let ativos = 0;
  console.log(`Página D2: ${fila.length} cenários para animar, ${JOBS} em paralelo.`);
  const prox = fim => { if (!fila.length) { if (!ativos) fim(); return; } const i = fila.shift(); ativos++;
    spawn(process.execPath, ['viz.js', String(i)], { stdio: 'inherit' }).on('exit', c => { ativos--; if (c) console.log('ERRO no cenário', i + 1); prox(fim); }); };
  new Promise(r => { for (let j = 0; j < JOBS; j++) prox(r); }).then(() => { junta(); console.log(`Pronto em ${((Date.now() - t0) / 60000).toFixed(0)} min: simulador_d2/results/viz.json`); });
}
function junta() {
  const V = JSON.parse(fs.readFileSync('../simulador_d/results/viz.json'));
  const P = new Map(); for (let i = 0; i < 100; i += 10) for (const it of JSON.parse(fs.readFileSync(`results/viz15_ep_${i}.json`))) P.set(it.i + ':' + it.K, it.m);
  for (const e of V.eps) Object.assign(e.m, P.get(e.i + ':' + e.K));
  const ord = ['Esperar', 'Aleatória', 'Guloso5', 'GulosoD', 'Guloso15_5', 'Guloso15_D'];
  V.methods = [...ord, ...V.methods.filter(m => !ord.includes(m))];
  V.nomes.Guloso5 = 'Guloso 60 min · 5 ações'; V.nomes.GulosoD = 'Guloso 60 min · só esperar ou desobstruir';
  V.nomes.Guloso15_5 = 'Guloso 15 min · 5 ações'; V.nomes.Guloso15_D = 'Guloso 15 min · só esperar ou desobstruir';
  V.variavel.Guloso15_5 = V.variavel.Guloso15_D = false;
  const ld = pre => fs.readdirSync('results').filter(f => new RegExp(`^${pre}_\\d+\\.json$`).test(f)).flatMap(f => JSON.parse(fs.readFileSync(`results/${f}`)));
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  for (const [key, pre] of [['Guloso15_5', 'guloso15_c2'], ['Guloso15_D', 'guloso15_d']]) {
    const R = ld(pre), acoes = {}; for (const r of R) for (const [t, n] of Object.entries(r.acoes)) acoes[t] = (acoes[t] || 0) + n;
    V.test.metodos[key] = { kpi: mean(R.map(r => r.kpi)), vh: mean(R.map(r => r.vh)), usadas: mean(R.map(r => r.used)), acoes,
      porK: Object.fromEntries([1, 3, 5, 10].map(K => [K, mean(R.filter(r => r.K === K).map(r => r.kpi))])) };
  }
  const NG = { 'Guloso 15 min, 5 ações': 'Guloso15_5', 'Guloso 15 min, só desobstruir': 'Guloso15_D', 'Guloso 60 min, 5 ações': 'Guloso5', 'Guloso 60 min, só desobstruir': 'GulosoD' };
  for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync('results/summary_d2.json')))) { const [a, b] = k.split(' − ').map(x => NG[x] || x); V.test.contrastes.push({ a, b, kpi: v }); }
  fs.writeFileSync('results/viz.json', JSON.stringify(V));
}
