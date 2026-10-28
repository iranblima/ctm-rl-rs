// Cenário C2 — dados da página do simulador (results/viz.json): node viz.js
// Grava a animação de 10 cenários de teste (1º, 11º, …, 91º) × 4 orçamentos, para Esperar, Aleatória e a rede escolhida de cada
// configuração M0–M5, com um quadro a cada 15 min. Depois que a rede estabiliza, a animação segue só esperando até 12 h.
// Junta também as tabelas do teste (results/summary.json), a média por sementes (results/test_sementes_*.json) e a auditoria.
process.chdir(__dirname);
'use strict';
const E = require('./env.js'), { Net, makePolicy } = require('./rl.js'), { CONFIGS } = require('./configs.js'), fs = require('fs'), sim = E.sim, D = E.D;
const names = JSON.parse(fs.readFileSync('../data/derived/node_names.json'));
const POL = { 'Esperar': [E.P.wait, false], 'Aleatória': [E.P.random, false] };
for (const [M, c] of Object.entries(CONFIGS)) POL[M] = [makePolicy(Net.from(JSON.parse(fs.readFileSync(`results/${M}/selected.json`)).net)), c.variavel];
// RLE com separador: "c" seguido do tamanho; para não confundir dígitos do estado (0–9) com o tamanho, usa "c*n,"
const enc = s => { const o = []; let i = 0; while (i < s.length) { let j = i; while (j < s.length && s[j] === s[i]) j++; o.push(j - i > 1 ? `${s[i]}*${j - i}` : s[i]); i = j; } return o.join(','); };
// sentidos instáveis ('0') como bits em base64 (bit j = sentido j)
const bits = f => { const b = Buffer.alloc(Math.ceil(f.length / 8)); for (let j = 0; j < f.length; j++) if (f[j] === '0') b[j >> 3] |= 1 << (j & 7); return b.toString('base64'); };
const flags = (fl, ref) => fl.map((v, j) => ref[j] < 5 ? '-' : (Math.abs(v - ref[j]) <= Math.max(0.2 * ref[j], 30) ? '1' : '0')).join('');
const eps = [];
for (let i = 0; i < 100; i += 10) {
  const sc = E.scenario(E.SEEDS.teste2(i));
  const evs = sc.z.ev.map(e => ({ i: e.i, e: e.e, fa: +(D.edges[e.e].o === -1 ? 1 - e.fr : e.fr).toFixed(3), cls: e.cls, cap: e.cap, rm: e.rm }));
  for (const K of [1, 3, 5, 10]) {
    const item = { i, t: sc.t, K, stab0: sc.stab0, n: sc.n, evs, m: {} };
    for (const [nm, [pol, variavel]] of Object.entries(POL)) {
      const ep = new E.Ep(sc, K, { variavel }), frames = [], log = [];
      const rec = () => frames.push({ s: enc(sim.slowFrac().map(x => x.join('')).join('')), on: sim.S.ev.filter(e => e.on).map(e => e.i),
        rm: sim.S.ev.filter(e => e.on && e.dt != null).map(e => e.i), half: sim.S.ev.filter(e => e.on && e.cur > 0).map(e => e.i),
        ctrl: [...ep.ctrl.entries()].map(([id, c]) => [sim.links[id].ei, sim.links[id].dir, c.type]), stab: +ep.stab.toFixed(4), st: bits(flags(ep.hl(0), sc.ref.roll[ep.m])) });
      rec();
      while (ep.m < E.NB) {
        if (!ep.done) { const C = ep.legal(), c = pol(ep, C), m0 = ep.m; ep.apply(c); const o = ep.advance(c.dt || 60, 0, rec); log.push({ m: m0, ...ep.desc(c), tau: o.tau, why: o.why }); }
        else ep.advance(15, 0, rec);
      }
      item.m[nm] = { kpi: ep.kpi == null ? E.H + 1 : ep.kpi, vh: Math.round(ep.vh), used: ep.K - ep.left, log, frames };
    }
    eps.push(item); console.log('cenário', i + 1, 'K', K, Object.entries(item.m).map(([k, v]) => k + ' ' + v.kpi).join(' | '));
  }
}
// média por sementes (contrastes) a partir do teste de cada semente
const SR = fs.readdirSync('results').filter(f => /^test_sementes_\d+\.json$/.test(f)).flatMap(f => JSON.parse(fs.readFileSync(`results/${f}`)));
let xs = 7; const rnd = () => { xs ^= xs << 13; xs >>>= 0; xs ^= xs >> 17; xs ^= xs << 5; xs >>>= 0; return xs / 4294967296; };
const avg = (c, x) => { const v = Object.keys(x.m).filter(n => n.startsWith(c + ' ')).map(n => x.m[n].kpi); return v.reduce((a, b) => a + b, 0) / v.length; };
const boot = d => { const n = d.length, bs = []; for (let b = 0; b < 3000; b++) { let s = 0; for (let k = 0; k < n; k++) s += d[Math.floor(rnd() * n)]; bs.push(s / n); } bs.sort((a, b) => a - b); return { mean: d.reduce((a, b) => a + b, 0) / n, lo: bs[74], hi: bs[2924] }; };
const S = JSON.parse(fs.readFileSync('results/summary.json'));
for (const c of S.contrastes) if (/^M\d$/.test(c.a) && /^M\d$/.test(c.b) && SR.length) c.sementes = boot(SR.map(x => avg(c.a, x) - avg(c.b, x)));
const A = fs.existsSync('results/auditoria.json') ? JSON.parse(fs.readFileSync('results/auditoria.json')).resumo : null;
const out = { nodes: D.nodes, nodeNames: names, edges: D.edges.map(e => ({ a: e.a, b: e.b, sup: e.sup, br: e.br, ki: e.ki, kf: e.kf, o: e.o })),
  links: D.edges.flatMap((e, ei) => [[ei, 0], [ei, 1]]), methods: Object.keys(POL), nomes: Object.fromEntries(Object.entries(CONFIGS).map(([k, v]) => [k, v.nome])),
  variavel: Object.fromEntries(Object.entries(POL).map(([k, v]) => [k, v[1]])), eps, test: S, auditoria: A };
const str = JSON.stringify(out); fs.writeFileSync('results/viz.json', str); console.log('viz bytes', str.length);
