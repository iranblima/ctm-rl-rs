// P5 — importância por permutação (sem treino): node permutacao.js <D1-DDQN|D1-Q1|D2P-Q1> <parte> <nPartes>
// Na rede já treinada do cenário D, em cada decisão embaralha UM grupo de atributos e mede quanto o tempo até estabilizar piora.
// Grupos que variam entre candidatos: os valores do grupo são trocados entre os candidatos da mesma decisão (quebra o vínculo
// candidato–informação). Contexto (igual para todos os candidatos): substituído pelo contexto de outra decisão, sorteado de um conjunto
// colhido na rodada sem permutação. Sorteios fixos. Mesmos 100 cenários de teste × K.
process.chdir(__dirname);
'use strict';
const E = require('../../simulador_d/env.js'), { Net } = require('../../simulador_d/rl.js'), { GRUPOS } = require('./configs.js'), fs = require('fs');
const [M, part, np] = [process.argv[2], +process.argv[3], +process.argv[4]], NTE = +process.env.CTM_NTE || 100;
const net = Net.from(JSON.parse(fs.readFileSync(`../../simulador_d/results/${M}/selected.json`)).net);
const G = { tipo_acao: [0, 1, 2, 3, 4], ...GRUPOS }, GLOBAL = new Set(['contexto']);
const argmax = Q => { let b = 0; for (let j = 1; j < Q.length; j++) if (Q[j] > Q[b]) b = j; return b; };
let rnd = E.rng(1);
const pool = [];
const pol = g => (ep, C) => {
  const X = ep.feats(C);
  if (g == null) { if (X.length) pool.push(G.contexto.map(i => X[0][i])); }
  else if (GLOBAL.has(g)) { const v = pool[Math.floor(rnd() * pool.length)]; for (const f of X) G[g].forEach((i, k) => { f[i] = v[k]; }); }
  else { const perm = X.map((_, j) => j); for (let j = perm.length - 1; j > 0; j--) { const k = Math.floor(rnd() * (j + 1)); [perm[j], perm[k]] = [perm[k], perm[j]]; }
    const orig = X.map(f => G[g].map(i => f[i])); X.forEach((f, j) => G[g].forEach((i, k) => { f[i] = orig[perm[j]][k]; })); }
  return C[argmax(net.fwd(X.map(f => Float32Array.from(f))).Q)];
};
const SC = []; for (let i = 0; i < NTE; i++) if (i % np === part) SC.push([i, E.scenario(E.SEEDS.teste2(i))]);
const res = new Map();
for (const g of [null, ...Object.keys(G)]) {
  rnd = E.rng(1000 + part);
  for (const [i, sc] of SC) for (const K of [1, 3, 5, 10]) { const k = i + ':' + K; if (!res.has(k)) res.set(k, { i, K, m: {} });
    const o = E.runEpisode(sc, K, pol(g), { variavel: true }); res.get(k).m[g == null ? 'sem permutação' : g] = { kpi: o.kpi, used: o.used }; }
  console.log(M, g, 'ok');
}
fs.writeFileSync(`results/perm_${M}_${part}.json`, JSON.stringify([...res.values()]));
