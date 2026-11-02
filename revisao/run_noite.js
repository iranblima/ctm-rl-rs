// Rodada da noite: P5 (permutação + ablações com treino) e P4 simplificado (Guloso com modelo imperfeito), num comando só.
// node revisao/run_noite.js        → revisao/p5/RESULTADOS_P5.md e revisao/p4/RESULTADOS_P4.md
// Fase 1: treinos do P5 (13 configurações × 5 sementes × 2.400 episódios), Guloso imperfeito (64 partes) e permutação (12 partes),
//         todos na mesma fila, os mais longos primeiro. Fase 2: escolhe as redes na validação e testa. Fase 3: tabelas.
// Pode interromper e rodar de novo: o que terminou é pulado (um treino interrompido recomeça do zero).
process.chdir(__dirname);
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');
const { CONFIGS, SEMENTES } = require('./p5/configs.js');
fs.mkdirSync('results', { recursive: true }); fs.mkdirSync('p4/results', { recursive: true }); fs.mkdirSync('p5/results', { recursive: true });
const JOBS = Math.max(2, Math.min(16, os.cpus().length - 2)), EPIS = 2400, CK = 300;
const LOG = 'results/progresso_noite.log', t0 = Date.now();
const log = s => { const l = `[${new Date().toLocaleTimeString()}] ${s}`; console.log(l); fs.appendFileSync(LOG, l + '\n'); };
const treinoPronto = (M, s) => { const f = `p5/results/${M}/ckpt_${s}.json`; try { return JSON.parse(fs.readFileSync(f)).length >= EPIS / CK; } catch (e) { return false; } };
function fase(nome, jobs) {
  return new Promise(res => {
    const fila = jobs.filter(j => !j.pronto()), total = fila.length; let ativos = 0, feitos = 0;
    log(`${nome}: ${total} tarefas pendentes (${jobs.length - total} já prontas), ${JOBS} em paralelo.`);
    if (!total) return res();
    const prox = () => {
      if (!fila.length) { if (!ativos) res(); return; }
      const j = fila.shift(); ativos++; const t1 = Date.now(), out = fs.openSync(j.out, 'w');
      spawn(process.execPath, j.args, { cwd: j.cwd, stdio: ['ignore', out, out] }).on('exit', c => { ativos--; feitos++;
        log(`  ${j.nome} ${c === 0 ? 'ok' : 'ERRO ' + c} (${((Date.now() - t1) / 60000).toFixed(1)} min) — ${feitos}/${total}, ${((Date.now() - t0) / 3600000).toFixed(1)} h desde o início`); prox(); });
    };
    for (let k = 0; k < JOBS; k++) prox();
  });
}
const NP4 = 8, NPERM = 4, NTEST = 4, A = [];
// fila da fase 1, os mais longos primeiro
for (const c of ['realista', 'tempo']) for (let p = 0; p < NP4; p++) A.push({ nome: `P4 c2 6 h ${c} parte ${p}`, cwd: 'p4', args: ['guloso_imperfeito.js', 'c2', '360', c, String(p), String(NP4)], out: `p4/results/g_c2_h360_${c}_${p}.out`, pronto: () => fs.existsSync(`p4/results/g_c2_h360_${c}_${p}.json`) });
for (const M of Object.keys(CONFIGS)) for (const s of SEMENTES) A.push({ nome: `P5 treino ${M} semente ${s}`, cwd: 'p5', args: ['train.js', M, String(s), String(EPIS)], out: `p5/results/train_${M}_${s}.out`, pronto: () => treinoPronto(M, s) });
for (const P of ['D1-DDQN', 'D1-Q1', 'D2P-Q1']) for (let p = 0; p < NPERM; p++) A.push({ nome: `P5 permutação ${P} parte ${p}`, cwd: 'p5', args: ['permutacao.js', P, String(p), String(NPERM)], out: `p5/results/perm_${P}_${p}.out`, pronto: () => fs.existsSync(`p5/results/perm_${P}_${p}.json`) });
for (const [w, H] of [['d', 360], ['c2', 60], ['d', 60]]) for (const c of ['realista', 'tempo']) for (let p = 0; p < NP4; p++) A.push({ nome: `P4 ${w} ${H / 60} h ${c} parte ${p}`, cwd: 'p4', args: ['guloso_imperfeito.js', w, String(H), c, String(p), String(NP4)], out: `p4/results/g_${w}_h${H}_${c}_${p}.out`, pronto: () => fs.existsSync(`p4/results/g_${w}_h${H}_${c}_${p}.json`) });
(async () => {
  log(`Rodada da noite (${os.cpus().length} núcleos lógicos).`);
  await fase('Fase 1 (treinos P5, Guloso imperfeito, permutação)', A);
  log('Fase 2: escolhendo as redes do P5 na validação…');
  await new Promise(r => spawn(process.execPath, ['select.js'], { cwd: 'p5', stdio: ['ignore', fs.openSync('p5/results/select.out', 'w'), 'inherit'] }).on('exit', r));
  const T = []; for (const M of Object.keys(CONFIGS)) for (let p = 0; p < NTEST; p++) T.push({ nome: `P5 teste ${M} parte ${p}`, cwd: 'p5', args: ['test.js', M, String(p), String(NTEST)], out: `p5/results/${M}/test_${p}.out`, pronto: () => fs.existsSync(`p5/results/${M}/test_${p}.json`) });
  await fase('Fase 2 (teste do P5)', T);
  log('Fase 3: tabelas…');
  for (const [d, s] of [['p4', 'analise.js'], ['p5', 'analise.js']]) await new Promise(r => spawn(process.execPath, [s], { cwd: d, stdio: 'inherit' }).on('exit', r));
  log(`Pronto em ${((Date.now() - t0) / 3600000).toFixed(1)} h. Resultados: revisao/p5/RESULTADOS_P5.md e revisao/p4/RESULTADOS_P4.md`);
})();
