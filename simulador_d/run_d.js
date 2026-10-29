// Cenário D — roda TUDO em paralelo no seu computador: node simulador_d/run_d.js [--sementes 10] [--episodios 2400] [--jobs N]
//   [--configs M3,M4,M5]  treina sementes novas só destas configurações (as outras ficam como estão)
// Etapas (cada uma pula o que já estiver pronto, então dá para interromper com Ctrl+C e rodar de novo):
//   1. sorteia o novo conjunto de teste (100 cenários);  2. treina M0–M5 × sementes;  3. escolhe as redes na validação;
//   4. roda Esperar e Aleatória na validação;  5. testa;  6. gera results/summary.json e RESULTADOS_C2.md.
// Progresso em results/progresso.log. Saída de cada treino em results/<M>/train_<semente>.out.
process.chdir(__dirname);
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const SEEDS = arg('--sementes', 10), EPIS = arg('--episodios', 2400), CK = +process.env.CTM_CK || 300;
const JOBS = arg('--jobs', Math.max(1, Math.min(os.cpus().length - 2, Math.floor(os.totalmem() / 2 ** 30 / 2))));
const CFGARG = (() => { const i = process.argv.indexOf('--configs'); return i > 0 ? process.argv[i + 1].split(',') : null; })();
const AUDIT = false; // a auditoria do C2 não é refeita no cenário D
const ORDEM = ['D1-DDQN', 'D2L-DDQN', 'D2P-DDQN', 'D1-Q1', 'D2L-Q1', 'D2P-Q1'].filter(M => !CFGARG || CFGARG.includes(M));
fs.mkdirSync('results', { recursive: true });
const LOGF = 'results/progresso.log', T0 = Date.now();
const log = s => { const l = `[${new Date().toLocaleTimeString('pt-BR')}] ${s}`; console.log(l); fs.appendFileSync(LOGF, l + '\n'); };
function run(argv, out) {
  return new Promise((res, rej) => {
    const p = spawn(process.execPath, argv, { cwd: __dirname, env: process.env });
    const o = out ? fs.createWriteStream(out) : null;
    p.stdout.on('data', d => { if (o) o.write(d); }); p.stderr.on('data', d => { if (o) o.write(d); else process.stderr.write(d); });
    p.on('close', c => { if (o) o.end(); c === 0 ? res() : rej(new Error(`${argv.join(' ')} terminou com código ${c}` + (out ? ` (veja ${out})` : ''))); });
  });
}
async function pool(tasks, n) { let i = 0; const w = async () => { while (i < tasks.length) { const t = tasks[i++]; await t(); } }; await Promise.all(Array.from({ length: n }, w)); }
const okCkpt = (M, s) => { try { return JSON.parse(fs.readFileSync(`results/${M}/ckpt_${s}.json`)).length >= Math.floor(EPIS / CK); } catch (e) { return false; } };

(async () => {
  log(`Cenário D: ${SEEDS} sementes × ${ORDEM.length} configurações, ${EPIS} episódios cada, ${JOBS} processos em paralelo (${os.cpus().length} núcleos, ${Math.round(os.totalmem() / 2 ** 30)} GB).`);
  // 1. novo conjunto de teste
  const hint = 'results/cenarios_c.json', H = JSON.parse(fs.readFileSync(hint));
  const faltam = Array.from({ length: +process.env.CTM_NTE || 100 }, (_, i) => 4000000 + i).filter(s => H[s] == null);
  if (faltam.length) {
    const np = Math.min(JOBS, 10); log(`1/6 sorteando o novo conjunto de teste (${faltam.length} cenários, ${np} partes)…`);
    await pool(Array.from({ length: np }, (_, p) => () => run(['pregen.js', p, np])), np);
    for (let p = 0; p < np; p++) { const f = `results/cenarios_c2_teste_${p}.json`; Object.assign(H, JSON.parse(fs.readFileSync(f))); fs.unlinkSync(f); }
    fs.writeFileSync(hint, JSON.stringify(H));
  } else log('1/6 conjunto de teste já sorteado.');
  // 2. treinos
  const jobs = []; for (const M of ORDEM) for (let s = 0; s < SEEDS; s++) if (!okCkpt(M, s)) jobs.push([M, s]);
  log(`2/6 treinando ${ORDEM.join(', ')}: ${jobs.length} treinos pendentes.`);
  let feitos = 0;
  await pool(jobs.map(([M, s]) => async () => {
    fs.mkdirSync(`results/${M}`, { recursive: true }); log(`   início ${M} semente ${s}`);
    const t = Date.now(); await run(['train.js', M, s, EPIS], `results/${M}/train_${s}.out`);
    feitos++; log(`   fim    ${M} semente ${s} (${((Date.now() - t) / 60000).toFixed(0)} min) — ${feitos}/${jobs.length}`);
  }), JOBS);
  // 3. escolha na validação
  log('3/6 escolhendo as redes na validação…'); await run(['select.js'], 'results/select.out');
  // 4. referências na validação
  if (!fs.existsSync('results/valref.json')) { log('4/6 Esperar e Aleatória na validação…'); await run(['valref.js'], 'results/valref.out'); } else log('4/6 referências da validação já prontas.');
  // 5. teste
  const NP = Math.min(JOBS, 10);
  log(`5/6 testando (100 cenários × 4 orçamentos; ${NP} partes)…`);
  const tasks = [];
  for (let p = 0; p < NP; p++) { tasks.push(() => run(['test.js', p, NP], `results/test_${p}.out`)); tasks.push(() => run(['test.js', p, NP, '--sementes'], `results/test_sementes_${p}.out`)); }
  for (const f of fs.readdirSync('results').filter(f => /^test(_sementes)?_\d+\.json$/.test(f))) fs.unlinkSync(`results/${f}`);
  await pool(tasks, JOBS);
  // 6. tabelas
  log('6/6 gerando tabelas…'); await run(['build.js'], 'results/build.out');
  if (AUDIT) {
    const NA = Math.min(JOBS, 10); log(`+ auditoria offline de temporalidade (${NA} partes)…`);
    for (const f of fs.readdirSync('results').filter(f => /^auditoria_\d+\.json$/.test(f))) fs.unlinkSync(`results/${f}`);
    await pool(Array.from({ length: NA }, (_, p) => () => run(['audit.js', p, NA], `results/auditoria_${p}.out`)), NA);
    await run(['audit_build.js'], 'results/auditoria.out');
  }
  log(`Pronto em ${((Date.now() - T0) / 3600000).toFixed(1)} h. Resultados: simulador_d/RESULTADOS_D.md`);
})().catch(e => { log('ERRO: ' + e.message); process.exit(1); });
