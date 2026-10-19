process.chdir(__dirname);
const fs = require('fs');
const all = [0, 1].flatMap(s => JSON.parse(fs.readFileSync(`results/ckpt_${s}.json`)));
all.forEach(c => console.log(c.seed, c.ep, c.mean.toFixed(0)));
const best = all.reduce((a, b) => b.mean < a.mean ? b : a);
fs.writeFileSync('results/selected.json', JSON.stringify({ seed: best.seed, ep: best.ep, net: best.net, val: all.map(c => ({ seed: c.seed, ep: c.ep, mean: c.mean })) }));
console.log('selected', best.seed, best.ep);
