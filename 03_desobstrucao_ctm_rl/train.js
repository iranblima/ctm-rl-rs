process.chdir(__dirname);
'use strict';
const E = require('./env.js'), { Net, makePolicy, rng } = require('./rl.js'), fs = require('fs');
const seed = +process.argv[2], EPIS = +process.argv[3], CK = 300, GAMMA = 0.95, KS = [1, 3, 5, 10];
const ALL = E.starts(); const n = ALL.length, ntr = Math.round(0.6 * n), nva = Math.round(0.2 * n);
const TR = ALL.slice(0, ntr), VA = ALL.slice(ntr, ntr + nva);
const r = rng(seed * 31 + 3), net = new Net(seed); let tgt = net.copy();
const buf = [], prio = [], CAP = 20000, T0 = Date.now(), ckpts = [];
function evalVal(pol) { let k = 0, v = 0, c = 0; for (const st of VA) for (const K of KS) { const o = E.runEpisode(st, K, pol); k += o.kpi; v += o.vh; c++; } return { kpi: k / c, vh: v / c }; }
for (let epi = 0; epi < EPIS; epi++) {
  const eps = Math.max(0.05, 1 - epi / (0.6 * EPIS));
  const st = TR[Math.floor(r() * TR.length)], K = KS[Math.floor(r() * KS.length)];
  const ep = new E.Ep(st, K);
  if (ep.done) continue;
  let C = ep.legal(), X = ep.feats(C);
  for (let h = 0; h < E.H && !ep.done; h++) {
    let a; if (r() < eps) a = Math.floor(r() * C.length); else { const { Q } = net.fwd(X); a = Q.indexOf(Math.max(...Q)); }
    ep.apply(E.bindEv(ep, C[a])); const rew = ep.advance();
    let X2 = null, C2 = null; if (!ep.done && h < E.H - 1) { C2 = ep.legal(); X2 = ep.feats(C2); }
    const tr = { X, a, r: rew, X2 };
    if (buf.length < CAP) { buf.push(tr); prio.push(1); } else { const j = Math.floor(r() * CAP); buf[j] = tr; prio[j] = 1; }
    if (buf.length >= 256) {
      const pr = prio.map(p => p ** 0.6), tot = pr.reduce((a, b) => a + b, 0), batch = [];
      for (let b = 0; b < 32; b++) { let u = r() * tot, j = 0; while (u > pr[j] && j < pr.length - 1) { u -= pr[j]; j++; }
        const t = buf[j]; let y = t.r;
        if (t.X2) { const qo = net.fwd(t.X2).Q, qt = tgt.fwd(t.X2).Q; y += GAMMA * qt[qo.indexOf(Math.max(...qo))]; }
        prio[j] = Math.abs(net.fwd(t.X).Q[t.a] - y) + 1e-3; batch.push({ X: t.X, a: t.a, y }); }
      net.trainBatch(batch); if (net.t % 200 === 0) tgt = net.copy();
    }
    if (X2) { X = X2; C = C2; }
  }
  if ((epi + 1) % CK === 0) {
    const v = evalVal(makePolicy(net));
    ckpts.push({ seed, ep: epi + 1, ...v, net: net.toJSON() });
    console.log(`seed ${seed} ep ${epi + 1} val kpi ${v.kpi.toFixed(3)} vh ${v.vh.toFixed(0)} (${((Date.now() - T0) / 60000).toFixed(1)} min)`);
    fs.writeFileSync(`results/ckpt_${seed}.json`, JSON.stringify(ckpts));
  }
}
