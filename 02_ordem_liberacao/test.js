process.chdir(__dirname);
// teste nas enchentes reais: node test.js <parte> <nPartes>
'use strict';
const E = require('./env.js'), { Net, makePolicy } = require('./rl.js'), fs = require('fs');
const part = +process.argv[2], np = +process.argv[3];
const sel = JSON.parse(fs.readFileSync('results/selected.json'));
const net = Net.from(sel.net), agent = makePolicy(net);
const cand = []; for (let t = 3 * 1440; t <= 33.5 * 1440; t += 720) cand.push(t);
const snaps = E.realStarts(cand);
const starts = [];
snaps.forEach((z, i) => { E.sim.restore(z); const n = E.legal().length; if (n >= 3) starts.push({ t: cand[i], z, n }); });
if (part === 0) fs.writeFileSync('results/starts.json', JSON.stringify(starts.map(s => ({ t: s.t, n: s.n }))));
const POL = { 'Ninguém libera': E.P.none, 'Aleatória': E.P.random, 'Guloso (Greedy MC)': E.P.greedy, 'Dueling DDQN (método da Andina)': agent };
const res = [];
starts.forEach((s, i) => {
  if (i % np !== part) return;
  const show = i % 3 === 0;
  const item = { i, t: s.t, n: s.n, m: {} };
  for (const [name, p] of Object.entries(POL)) {
    const o = E.runEpisode(s.z, p, { frames: show, seed: 11 + i });
    item.m[name] = { nc: o.nc, total: o.total, gave: o.gaveT, costs: o.costs, gaveS: o.gave, seeds: o.seeds, times: o.times,
      frames: show ? o.frames.map(f => ({ t: f.t, s: f.s.map(x => x.join('')).join(''), on: f.on })) : undefined };
  }
  res.push(item);
  console.log(i, s.t, s.n, Object.entries(item.m).map(([k, v]) => k.slice(0, 6) + ' ' + Math.round(v.total)).join(' | '));
});
fs.writeFileSync(`results/test_${part}.json`, JSON.stringify(res));
