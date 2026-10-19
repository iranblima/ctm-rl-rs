process.chdir(__dirname);
// treino de uma semente: node train.js <seed> <episodios>
'use strict';
const E = require('./env.js'), { Net, makePolicy } = require('./rl.js'), fs = require('fs');
const seed = +process.argv[2], EPIS = +process.argv[3], CK = 200, SCALE = 1000, GAMMA = 0.9;
const r = E.rng(seed * 31 + 3), net = new Net(seed); let tgt = net.copy();
const buf = [], prio = [], CAP = 20000, T0 = Date.now();
const VAL = Array.from({ length: 16 }, (_, i) => E.synthScenario(900000 + i));
const ckpts = [];
const evalVal = pol => VAL.map(z => E.runEpisode(z, pol).total);
for (let epi = 0; epi < EPIS; epi++) {
  const eps = Math.max(0.05, 1 - epi / (0.6 * EPIS));
  const z = E.synthScenario(seed * 1000003 + epi + 1);
  E.sim.restore(z);
  for (let k = 0; k < E.K; k++) {
    const C = E.shortlist();
    if (!C.length) break;
    const X = E.features(C, k);
    let a; if (r() < eps) a = Math.floor(r() * C.length); else { const { Q } = net.fwd(X); a = Q.indexOf(Math.max(...Q)); }
    E.release(E.sim.S.ev.find(x => x.i === C[a].i));
    const rew = -E.advance().cost / SCALE;
    let X2 = null; if (k < E.K - 1) { const C2 = E.shortlist(); if (C2.length) X2 = E.features(C2, k + 1); }
    const tr = { X, a, r: rew, X2 };
    if (buf.length < CAP) { buf.push(tr); prio.push(1); } else { const j = Math.floor(r() * CAP); buf[j] = tr; prio[j] = 1; }
    if (buf.length >= 256) {
      const pr = prio.map(p => p ** 0.6), tot = pr.reduce((a, b) => a + b, 0), batch = [], bi = [];
      for (let b = 0; b < 32; b++) { let u = r() * tot, j = 0; while (u > pr[j] && j < pr.length - 1) { u -= pr[j]; j++; } bi.push(j); }
      for (const j of bi) {
        const t = buf[j]; let y = t.r;
        if (t.X2) { const qo = net.fwd(t.X2).Q, qt = tgt.fwd(t.X2).Q; const as = qo.indexOf(Math.max(...qo)); y += GAMMA * qt[as]; }
        const q = net.fwd(t.X).Q[t.a]; prio[j] = Math.abs(q - y) + 1e-3;
        batch.push({ X: t.X, a: t.a, y });
      }
      net.trainBatch(batch);
      if (net.t % 200 === 0) tgt = net.copy();
    }
  }
  if ((epi + 1) % CK === 0) {
    const v = evalVal(makePolicy(net)); const m = v.reduce((a, b) => a + b, 0) / v.length;
    ckpts.push({ seed, ep: epi + 1, val: v, mean: m, net: net.toJSON() });
    console.log(`seed ${seed} ep ${epi + 1} val mean ${m.toFixed(0)} (${((Date.now() - T0) / 60000).toFixed(1)} min)`);
    fs.writeFileSync(`results/ckpt_${seed}.json`, JSON.stringify(ckpts));
  }
}
