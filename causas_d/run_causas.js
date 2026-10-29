// Análise das causas do cenário D — roda tudo e gera causas_d/RESULTADOS_CAUSAS.md: node causas_d/run_causas.js
// 1) regras simples de "desobstruir cedo"; 2) Guloso olhando 1, 3 e 6 h à frente (5 ações e só desobstruir);
// 3) auditoria no ambiente do D; 4) e 5) análise das decisões e de onde o RL vence (feitas em analise.js com os testes que já existem).
// Nada é treinado. Pode interromper e rodar de novo: as partes prontas são puladas.
process.chdir(__dirname);
'use strict';
const fs = require('fs'), os = require('os'), { spawn } = require('child_process');
const NP = 8, JOBS = Math.max(2, Math.min(16, os.cpus().length - 2)), fila = [];
const quer = (arq, args) => { if (!fs.existsSync(`results/${arq}.json`)) fila.push([arq, args]); };
// as mais demoradas primeiro, para aproveitar o paralelismo
for (const H of [360, 180, 60]) for (const w of ['c2', 'd']) for (let p = 0; p < NP; p++) quer(`guloso_h${H}_${w}_${p}`, ['guloso_h.js', w, H, p, NP]);
for (let p = 0; p < NP; p++) quer(`auditoria_${p}`, ['auditoria.js', p, NP]);
for (let p = 0; p < NP; p++) quer(`regras_${p}`, ['regras.js', p, NP]);
const t0 = Date.now(), log = s => { const l = `[${new Date().toLocaleTimeString()}] ${s}`; console.log(l); fs.appendFileSync('results/progresso.log', l + '\n'); };
log(`Análise das causas: ${fila.length} partes pendentes, ${JOBS} em paralelo (${os.cpus().length} núcleos).`);
let ativos = 0, feitos = 0; const total = fila.length;
function prox(fim) {
  if (!fila.length) { if (!ativos) fim(); return; }
  const [arq, args] = fila.shift(); ativos++; const t1 = Date.now(), out = fs.openSync(`results/${arq}.out`, 'w');
  spawn(process.execPath, args.map(String), { stdio: ['ignore', out, out] }).on('exit', c => { ativos--; feitos++;
    log(`  ${arq} ${c === 0 ? 'ok' : 'ERRO ' + c} (${((Date.now() - t1) / 60000).toFixed(1)} min) — ${feitos}/${total}`); prox(fim); });
}
new Promise(r => { for (let j = 0; j < JOBS; j++) prox(r); }).then(() => {
  const c = spawn(process.execPath, ['analise.js'], { stdio: 'inherit' });
  c.on('exit', () => log(`Pronto em ${((Date.now() - t0) / 60000).toFixed(0)} min. Resultados: causas_d/RESULTADOS_CAUSAS.md`));
});
