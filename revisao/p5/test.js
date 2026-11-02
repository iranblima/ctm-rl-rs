// P5 — teste de uma ablação nos 100 cenários de teste do D (× K ∈ {1,3,5,10}): node test.js <config> <parte> <nPartes>
// Testa a melhor rede de cada semente (selected_seed_<s>.json), com a mesma máscara de atributos do treino.
process.chdir(__dirname);
'use strict';
const E = require('../../simulador_d/env.js'), { Net, makePolicy } = require('../../simulador_d/rl.js'), { CONFIGS } = require('./configs.js'), fs = require('fs');
const [CFG, part, np] = [process.argv[2], +process.argv[3], +process.argv[4]], cfg = CONFIGS[CFG], NTE = +process.env.CTM_NTE || 100;
if (cfg.mascara && cfg.mascara.length) { const orig = E.Ep.prototype.feats; E.Ep.prototype.feats = function (C) { return orig.call(this, C).map(f => { for (const i of cfg.mascara) f[i] = 0; return f; }); }; }
const RD = `results/${CFG}`, NETS = fs.readdirSync(RD).filter(f => /^selected_seed_\d+\.json$/.test(f)).map(f => [`s${f.match(/\d+/)[0]}`, makePolicy(Net.from(JSON.parse(fs.readFileSync(`${RD}/${f}`)).net))]);
const res = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste2(i));
  for (const K of [1, 3, 5, 10]) { const item = { i, K, m: {} };
    for (const [nm, pol] of NETS) { const o = E.runEpisode(sc, K, pol, { variavel: cfg.variavel }); item.m[nm] = { kpi: o.kpi, vh: o.vh, used: o.used }; }
    res.push(item); console.log(i, K, Object.entries(item.m).map(([k, v]) => k + ' ' + v.kpi).join(' | ')); }
}
fs.writeFileSync(`${RD}/test_${part}.json`, JSON.stringify(res));
