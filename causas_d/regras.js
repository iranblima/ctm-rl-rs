// Causa 1 — regras simples de "desobstruir cedo" (sem aprendizado, sem simulador): node regras.js <parte> <nPartes>
// A cada 15 min (a frequência das políticas aprendidas), se ainda há orçamento e alguma obstrução pode ser desobstruída,
// desobstrui a primeira da lista pela regra; senão, espera. Só esperar/desobstruir (ambiente do D), mesmos candidatos do RL.
//   fluxo: maior fluxo do trecho (percentil do VDM).   importância: maior importância (a do D2).
//   longa primeiro: maior tempo típico de remoção (estrutura > barreira > acidente).   curta primeiro: o contrário.
//   Empates: maior fluxo.
process.chdir(__dirname);
'use strict';
const E = require('../simulador_d/env.js'), fs = require('fs'), { contaAcoes } = require('./comum.js');
const part = +process.argv[2], np = +process.argv[3], NTE = +process.env.CTM_NTE || 100;
const fx = c => E.importance(c.ev).fluxo, im = c => E.importance(c.ev).imp, rm = c => E.REM_MED[c.ev.cls];
const REGRAS = {
  'Regra: fluxo': c => [fx(c)],
  'Regra: importância': c => [im(c), fx(c)],
  'Regra: remoção longa primeiro': c => [rm(c), fx(c)],
  'Regra: remoção curta primeiro': c => [-rm(c), fx(c)],
};
const cmp = (a, b) => { for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return b[k] - a[k]; return 0; };
const pol = chave => (ep, C) => {
  const des = C.filter(c => c.type === 'DESOB');
  if (!des.length) return { ...C.find(c => c.type === 'WAIT'), dt: 15 };
  des.sort((a, b) => cmp(chave(a), chave(b)));
  return { ...des[0], dt: 15 };
};
const res = [];
for (let i = 0; i < NTE; i++) {
  if (i % np !== part) continue;
  const sc = E.scenario(E.SEEDS.teste2(i));
  for (const K of [1, 3, 5, 10]) {
    const item = { i, K, m: {} };
    for (const [nm, ch] of Object.entries(REGRAS)) { const o = E.runEpisode(sc, K, pol(ch), { variavel: false });
      item.m[nm] = { kpi: o.kpi, vh: o.vh, used: o.used, acoes: contaAcoes(o.epochs), epochs: o.epochs.filter(e => e.type === 'DESOB').map(e => ({ type: 'DESOB', m: e.m, ev: e.ev })) }; }
    res.push(item); console.log(i, K, Object.entries(item.m).map(([k, v]) => k.slice(7) + ' ' + v.kpi).join(' | '));
  }
}
fs.writeFileSync(`results/regras_${part}.json`, JSON.stringify(res));
