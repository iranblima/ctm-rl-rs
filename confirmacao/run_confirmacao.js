// Confirmação num conjunto de teste novo (sem treino): node confirmacao/run_confirmacao.js → confirmacao/RESULTADOS_CONFIRMACAO.md
// 1) sorteia os 100 cenários novos; 2) roda os métodos fixados em CONFIRMACAO.md; 3) tabelas. Pode interromper e rodar de novo.
process.chdir(__dirname);
'use strict';
const fs = require('fs'), os = require('os'), { spawn } = require('child_process');
fs.mkdirSync('results', { recursive: true });
const JOBS = Math.max(2, Math.min(16, os.cpus().length - 2)), NP = 8, NPG = 10, t0 = Date.now(), LOG = 'results/progresso.log';
const log = s => { const l = `[${new Date().toLocaleTimeString()}] ${s}`; console.log(l); fs.appendFileSync(LOG, l + '\n'); };
const env = { ...process.env, CTM_NOHINT: '1' };
function fase(nome, jobs) { return new Promise(res => { const fila = jobs.filter(j => !fs.existsSync(j.feito)), total = fila.length; let ativos = 0, feitos = 0;
  log(`${nome}: ${total} tarefas pendentes, ${JOBS} em paralelo.`); if (!total) return res();
  const prox = () => { if (!fila.length) { if (!ativos) res(); return; } const j = fila.shift(); ativos++; const t1 = Date.now();
    spawn(process.execPath, j.args, { env, stdio: ['ignore', fs.openSync(j.feito.replace('.json', '.out'), 'w'), 'inherit'] }).on('exit', c => { ativos--; feitos++;
      log(`  ${j.args.slice(1).join(' ')} ${c === 0 ? 'ok' : 'ERRO ' + c} (${((Date.now() - t1) / 60000).toFixed(1)} min) — ${feitos}/${total}`); prox(); }); };
  for (let k = 0; k < JOBS; k++) prox(); }); }
(async () => {
  await fase('1/3 sorteio dos cenários novos', Array.from({ length: NPG }, (_, p) => ({ args: ['pregen.js', String(p), String(NPG)], feito: `results/hints_${p}.json` })));
  const H = Object.assign({}, ...Array.from({ length: NPG }, (_, p) => JSON.parse(fs.readFileSync(`results/hints_${p}.json`))));
  for (const f of ['../simulador_d/results/cenarios_c.json', '../simulador_c2/results/cenarios_c.json']) { const o = JSON.parse(fs.readFileSync(f)); Object.assign(o, H); fs.writeFileSync(f, JSON.stringify(o)); }
  log(`atalhos dos ${Object.keys(H).length} cenários novos gravados.`);
  const G = []; for (const [w, h, c] of [['c2', 360, 'perfeito'], ['c2', 360, 'realista'], ['c2', 180, 'perfeito'], ['d', 360, 'perfeito'], ['d', 360, 'realista'], ['c2', 60, 'perfeito'], ['d', 180, 'perfeito'], ['d', 60, 'perfeito']])
    for (let p = 0; p < NP; p++) G.push({ args: ['metodos.js', `g_${w}_${h}_${c}`, String(p), String(NP)], feito: `results/g_${w}_${h}_${c}_${p}.json` });
  for (let p = 0; p < NP; p++) G.push({ args: ['metodos.js', 'aprendidas', String(p), String(NP)], feito: `results/aprendidas_${p}.json` });
  await fase('2/3 métodos', G);
  log('3/3 tabelas…'); await new Promise(r => spawn(process.execPath, ['analise.js'], { stdio: 'inherit' }).on('exit', r));
  log(`Pronto em ${((Date.now() - t0) / 3600000).toFixed(1)} h. Resultados: confirmacao/RESULTADOS_CONFIRMACAO.md`);
})();
