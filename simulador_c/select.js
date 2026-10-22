// Escolhe o checkpoint de menor KPI médio na validação (desempate: veículo-hora), entre todas as sementes de results/<observação>/.
// node select.js   (cenário C: results/total/)
process.chdir(__dirname);
const fs = require('fs');
const mode = process.argv[2] || 'total' /* ou 'ajuste' */, RD = `results/${mode}`;
const semPartida = process.argv.includes('--sem-partida'); // ignora o episódio 0 (ponto de partida do ajuste)
const all = fs.readdirSync(RD).filter(f => /^ckpt_\d+\.json$/.test(f)).flatMap(f => JSON.parse(fs.readFileSync(`${RD}/${f}`))).filter(c => !semPartida || c.ep > 0);
all.forEach(c => console.log(mode, 'semente', c.seed, 'ep', c.ep, 'KPI', c.kpi.toFixed(3), 'v·h', c.vh.toFixed(0)));
const best = all.reduce((a, b) => (b.kpi < a.kpi - 1e-9 || (Math.abs(b.kpi - a.kpi) < 1e-9 && b.vh < a.vh)) ? b : a);
fs.writeFileSync(`${RD}/selected.json`, JSON.stringify({ seed: best.seed, ep: best.ep, kpi: best.kpi, vh: best.vh, net: best.net, val: all.map(c => ({ seed: c.seed, ep: c.ep, kpi: c.kpi, vh: c.vh })) }));
console.log('escolhido:', mode, 'semente', best.seed, 'episódio', best.ep);
