process.chdir(__dirname);
'use strict';
const E = require('./env.js'), { Net, makePolicy } = require('./rl.js'), fs = require('fs');
const part = +process.argv[2], np = +process.argv[3];
const sel = JSON.parse(fs.readFileSync('results/selected.json')); const net = Net.from(sel.net);
const ALL = E.starts(); const n = ALL.length, ntr = Math.round(0.6 * n), nva = Math.round(0.2 * n);
const TE = ALL.slice(ntr + nva);
const POL = { 'Esperar': () => E.P.wait, 'Guloso (Greedy MC)': () => E.P.greedy, 'Dueling DDQN MLP (método da Andina)': () => makePolicy(net) };
const res = [];
TE.forEach((st, i) => {
  if (i % np !== part) return;
  const show = i % 4 === 0;
  for (const K of [1, 3, 5, 10]) {
    const item = { i, t: st.t, K, stab0: st.stab0, m: {} };
    for (const [nm, mk] of Object.entries(POL)) {
      const qs = []; const pol = mk(); const p = nm.startsWith('Dueling') ? (ep, C) => pol(ep, C, qs) : pol;
      const o = E.runEpisode(st, K, p, { frames: show });
      item.m[nm] = { kpi: o.kpi, censored: o.censored, sustained: o.sustained, unstable: o.unstable, vh: o.vh, used: o.used, log: o.log, stabs: o.stabs, q0: qs[0], frames: show ? o.frames : undefined };
    }
    res.push(item);
    console.log(i, (st.t / 1440).toFixed(2), K, Object.entries(item.m).map(([k, v]) => k.slice(0, 6) + ' ' + v.kpi + '/' + v.sustained + '/' + Math.round(v.vh) + '/' + v.used).join(' | '));
  }
});
fs.writeFileSync(`results/test_${part}.json`, JSON.stringify({ res, split: { ntr, nva, nte: TE.length, tr: [ALL[0].t, ALL[ntr - 1].t], va: [ALL[ntr].t, ALL[ntr + nva - 1].t], te: [TE[0].t, TE[TE.length - 1].t] } }));
