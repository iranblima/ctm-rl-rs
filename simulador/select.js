process.chdir(__dirname);
const fs = require('fs');
const all = [0, 1].flatMap(s => JSON.parse(fs.readFileSync(`results/ckpt_${s}.json`)));
all.forEach(c => console.log(c.seed, c.ep, c.kpi.toFixed(3), c.vh.toFixed(0)));
const best = all.reduce((a, b) => (b.kpi < a.kpi - 1e-9 || (Math.abs(b.kpi - a.kpi) < 1e-9 && b.vh < a.vh)) ? b : a);
fs.writeFileSync('results/selected.json', JSON.stringify({ seed: best.seed, ep: best.ep, net: best.net, val: all.map(c => ({ seed: c.seed, ep: c.ep, kpi: c.kpi, vh: c.vh })) }));
console.log('selected', best.seed, best.ep);
