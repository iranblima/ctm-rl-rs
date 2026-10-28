// Cenário C2 — escolhe, para cada configuração, o checkpoint de menor KPI médio na validação (desempate: veículo-hora):
// results/<M>/selected.json (entre todas as sementes) e results/<M>/selected_seed_<s>.json (o melhor de cada semente).
process.chdir(__dirname);
const fs = require('fs'), { CONFIGS } = require('./configs.js');
const best = a => a.reduce((x, y) => (y.kpi < x.kpi - 1e-9 || (Math.abs(y.kpi - x.kpi) < 1e-9 && y.vh < x.vh)) ? y : x);
for (const M of Object.keys(CONFIGS)) {
  const RD = `results/${M}`; if (!fs.existsSync(RD)) continue;
  const bySeed = fs.readdirSync(RD).filter(f => /^ckpt_\d+\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(`${RD}/${f}`))).filter(a => a.length);
  if (!bySeed.length) continue;
  for (const a of bySeed) { const b = best(a); fs.writeFileSync(`${RD}/selected_seed_${b.seed}.json`, JSON.stringify(b)); }
  const all = bySeed.flat(), b = best(all);
  fs.writeFileSync(`${RD}/selected.json`, JSON.stringify({ ...b, val: all.map(c => ({ seed: c.seed, ep: c.ep, kpi: c.kpi, vh: c.vh })) }));
  console.log(`${M}: escolhida semente ${b.seed}, episódio ${b.ep} (validação ${b.kpi.toFixed(3)} h)`);
}
