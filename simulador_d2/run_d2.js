// Cenário D2 — roda o Guloso decidindo a cada 15 min (guloso15.js) e compara com o cenário D nos mesmos 400 episódios de teste.
// node simulador_d2/run_d2.js   → simulador_d2/RESULTADOS_D2.md
// Não treina nada: usa os testes do D (simulador_d/results/test_*.json e guloso_*.json). Pode interromper e rodar de novo.
process.chdir(__dirname);
'use strict';
const fs = require('fs'), os = require('os'), { spawn } = require('child_process');
const NP = 8, JOBS = Math.max(2, Math.min(16, os.cpus().length - 2));
const fila = [];
for (const w of ['c2', 'd']) for (let p = 0; p < NP; p++) if (!fs.existsSync(`results/guloso15_${w}_${p}.json`)) fila.push([w, p]);
const t0 = Date.now(), log = s => { const l = `[${new Date().toLocaleTimeString()}] ${s}`; console.log(l); fs.appendFileSync('results/progresso.log', l + '\n'); };
log(`Cenário D2: Guloso a cada 15 min — ${fila.length} partes pendentes, ${JOBS} em paralelo (${os.cpus().length} núcleos).`);
let ativos = 0, feitos = 0;
function proximo(fim) {
  if (!fila.length) { if (!ativos) fim(); return; }
  const [w, p] = fila.shift(); ativos++; const t1 = Date.now();
  const out = fs.openSync(`results/guloso15_${w}_${p}.out`, 'w');
  const ch = spawn(process.execPath, ['guloso15.js', w, p, NP], { stdio: ['ignore', out, out] });
  ch.on('exit', c => { ativos--; feitos++; log(`  ${w} parte ${p} ${c === 0 ? 'ok' : 'ERRO ' + c} (${((Date.now() - t1) / 60000).toFixed(1)} min) — ${feitos}`); proximo(fim); });
}
new Promise(r => { for (let j = 0; j < JOBS; j++) proximo(r); }).then(tabela);

function tabela() {
  const ld = (dir, pre) => fs.readdirSync(dir).filter(f => new RegExp(`^${pre}_\\d+\\.json$`).test(f)).flatMap(f => JSON.parse(fs.readFileSync(`${dir}/${f}`)));
  const DR = '../simulador_d/results', key = r => r.i + ':' + r.K;
  const D = ld(DR, 'test').sort((a, b) => a.i - b.i || a.K - b.K);
  const extra = { 'Guloso 60 min, 5 ações': ld(DR, 'guloso_c2'), 'Guloso 60 min, só desobstruir': ld(DR, 'guloso_d'), 'Guloso 15 min, 5 ações': ld('results', 'guloso15_c2'), 'Guloso 15 min, só desobstruir': ld('results', 'guloso15_d') };
  const maps = Object.fromEntries(Object.entries(extra).map(([k, R]) => [k, new Map(R.map(r => [key(r), r]))]));
  const rows = D.filter(r => Object.values(maps).every(m => m.has(key(r))));
  for (const r of rows) for (const [k, m] of Object.entries(maps)) r.m[k] = m.get(key(r));
  let x = 12345; const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length, f2 = v => v.toFixed(2).replace('.', ','), sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + f2(Math.abs(v));
  function paired(d) { const n = d.length, bs = []; for (let b = 0; b < 5000; b++) { let s = 0; for (let i = 0; i < n; i++) s += d[Math.floor(rnd() * n)]; bs.push(s / n); } bs.sort((a, b) => a - b);
    return { mean: mean(d), lo: bs[124], hi: bs[4874], win: d.filter(v => v < 0).length / n, tie: d.filter(v => v === 0).length / n, loss: d.filter(v => v > 0).length / n }; }
  const M = Object.keys(rows[0].m), KS = [1, 3, 5, 10], RL = M.filter(m => /^D\d/.test(m)), G15 = 'Guloso 15 min, 5 ações', G15D = 'Guloso 15 min, só desobstruir';
  let md = `# Cenário D2 — Guloso decidindo a cada 15 min\n\nMesmo cenário D (políticas aprendidas já treinadas, sem novo treino), com o Guloso decidindo a cada 15 min, a mesma frequência das políticas aprendidas. A regra de escolha é a do cenário C, sem alteração: testa cada ação no simulador por 1 h e fica com a que deixa mais trechos estáveis (empate: menos veículo-hora; empate total: esperar). Depois de escolher, aplica a ação e decide de novo 15 min depois. Rodado com as 5 ações e só com esperar/desobstruir.\n\nTeste: ${rows.length / 4} cenários × K ∈ {1,3,5,10} = ${rows.length} episódios (os mesmos do D e do C2). KPI em horas até ≥ 80% dos 630 sentidos estáveis; menor é melhor.\n\n`;
  md += `## Tempo até estabilizar (média, horas)\n\n| Método | K=1 | K=3 | K=5 | K=10 | Média | Veículo-hora | Ações usadas |\n|---|---|---|---|---|---|---|---|\n`;
  for (const m of M) md += `| ${m} | ${KS.map(k => f2(mean(rows.filter(r => r.K === k).map(r => r.m[m].kpi)))).join(' | ')} | **${f2(mean(rows.map(r => r.m[m].kpi)))}** | ${Math.round(mean(rows.map(r => r.m[m].vh))).toLocaleString('pt-BR')} | ${f2(mean(rows.map(r => r.m[m].used)))} |\n`;
  const cmp = [...RL.map(m => [m, G15]), ...RL.map(m => [m, G15D]), [G15, 'Guloso 60 min, 5 ações'], [G15D, 'Guloso 60 min, só desobstruir'], [G15D, G15], ['Esperar', G15]];
  const sum = {};
  md += `\n## Contrastes pareados (KPI, horas; negativo = o primeiro foi mais rápido)\n\n| Contraste | Diferença | IC 95% | Melhor / empate / pior |\n|---|---|---|---|\n`;
  for (const [a, b] of cmp) { const p = paired(rows.map(r => r.m[a].kpi - r.m[b].kpi)); sum[`${a} − ${b}`] = p;
    md += `| ${a} − ${b} | ${sg(p.mean)} h | ${sg(p.lo)} a ${sg(p.hi)} | ${Math.round(100 * p.win)}% / ${Math.round(100 * p.tie)}% / ${Math.round(100 * p.loss)}% |\n`; }
  md += `\n## Por orçamento K (política aprendida − Guloso 15 min, 5 ações)\n\n| Contraste | ${KS.map(k => 'K=' + k).join(' | ')} |\n|---|---|---|---|---|\n`;
  for (const m of [...RL, 'Esperar']) md += `| ${m} − ${G15} | ${KS.map(k => { const p = paired(rows.filter(r => r.K === k).map(r => r.m[m].kpi - r.m[G15].kpi)); return `${sg(p.mean)} [${sg(p.lo)}; ${sg(p.hi)}]`; }).join(' | ')} |\n`;
  const TY = ['WAIT', 'DESOB', 'INTERR', 'CTRL50', 'LIBERAR'];
  md += `\n## Ações do Guloso no teste (total de decisões nos ${rows.length} episódios)\n\n| Guloso | ${TY.join(' | ')} | Decisões por episódio |\n|---|---|---|---|---|---|---|\n`;
  for (const k of Object.keys(extra)) { const R = extra[k]; md += `| ${k} | ${TY.map(t => R.reduce((s, r) => s + ((r.acoes || {})[t] || 0), 0)).join(' | ')} | ${f2(mean(R.map(r => r.decisoes || Object.values(r.acoes).reduce((a, b) => a + b, 0))))} |\n`; }
  fs.writeFileSync('RESULTADOS_D2.md', md); fs.writeFileSync('results/summary_d2.json', JSON.stringify(sum, null, 1));
  log(`Pronto em ${((Date.now() - t0) / 60000).toFixed(0)} min. Resultados: simulador_d2/RESULTADOS_D2.md`);
}
