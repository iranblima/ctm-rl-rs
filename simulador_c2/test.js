// Cenário C2 — teste no NOVO conjunto (100 cenários independentes × K ∈ {1,3,5,10}): node test.js <parte> <nPartes>
// Métodos: Esperar, Aleatória e a rede escolhida na validação de cada configuração M0–M5 (results/<M>/selected.json).
// Com --sementes, testa também a melhor rede de CADA semente (variabilidade entre sementes) → results/test_sementes_<parte>.json.
process.chdir(__dirname);
'use strict';
const E = require('./env.js'), { Net, makePolicy } = require('./rl.js'), { CONFIGS } = require('./configs.js'), fs = require('fs');
const part = +process.argv[2], np = +process.argv[3], porSemente = process.argv.includes('--sementes'), NTE = +process.env.CTM_NTE || 100;
const POL = {}, VAR = {};
if (!porSemente) { POL['Esperar'] = E.P.wait; POL['Aleatória'] = E.P.random; VAR['Esperar'] = VAR['Aleatória'] = false; }
for (const [M, cfg] of Object.entries(CONFIGS)) {
  const files = porSemente ? fs.readdirSync(`results/${M}`).filter(f => /^selected_seed_\d+\.json$/.test(f)).map(f => [`${M} s${f.match(/\d+/)[0]}`, `results/${M}/${f}`])
                           : [[M, `results/${M}/selected.json`]];
  for (const [nm, f] of files) if (fs.existsSync(f)) { POL[nm] = makePolicy(Net.from(JSON.parse(fs.readFileSync(f)).net)); VAR[nm] = cfg.variavel; }
}
const res = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste2(i));
  for (const K of [1, 3, 5, 10]) {
    const item = { i, K, stab0: sc.stab0, n: sc.n, evs: sc.z.ev.map(e => ({ i: e.i, e: e.e, cls: e.cls, cap: e.cap, rm: e.rm })), m: {} };
    for (const [nm, p] of Object.entries(POL)) { const o = E.runEpisode(sc, K, p, { variavel: VAR[nm] }); item.m[nm] = porSemente ? { kpi: o.kpi, vh: o.vh, used: o.used } : o; }
    res.push(item);
    if (!porSemente) console.log(i, K, Object.entries(item.m).map(([k, v]) => k.split(' ')[0] + ' ' + v.kpi).join(' | '));
  }
}
fs.writeFileSync(`results/${porSemente ? 'test_sementes' : 'test'}_${part}.json`, JSON.stringify(res));
