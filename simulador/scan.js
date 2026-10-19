process.chdir(__dirname);
// varredura: replay real com e sem interdições, fluxo horário nos postos, estabilidade
const { makeSim } = require('./sim.js'), fs = require('fs');
const D = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'data', 'derived', 'rsdata.json')));
const A = makeSim(D), Bs = makeSim(D);
const T0 = 1.5 * 1440, TEND = 50 * 1440;
for (const s of [A, Bs]) { s.reset(T0); s.S.real = true; }
A.setEvents(A.SITES.map(s => ({ i: s.idx, s: s.s, f: s.f, cells: s.cells }))); Bs.setEvents([]);
const ref = [], obs = [], info = [];
while (A.S.t < TEND) {
  A.run(60); Bs.run(60);
  const fa = A.hourFlows(), fb = Bs.hourFlows();
  ref.push(fb); obs.push(fa);
  const act = A.S.ev.filter(e => e.on), rel = act.filter(e => A.SITES[e.i].cls !== 'agua').length;
  let st = 0, n = 0; fa.forEach((v, j) => { if (fb[j] < 5) return; n++; if (Math.abs(v - fb[j]) <= Math.max(0.2 * fb[j], 30)) st++; });
  info.push({ t: A.S.t, act: act.length, rel, stab: st / n, n });
}
fs.writeFileSync('results/scan.json', JSON.stringify({ ref, obs, info, nSt: A.STATIONS.length }));
for (let i = 0; i < info.length; i += 24) console.log((info[i].t / 1440).toFixed(1), info[i].act, info[i].rel, info[i].stab.toFixed(2), info[i].n);
