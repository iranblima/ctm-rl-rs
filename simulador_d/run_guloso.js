// Cenário D — roda o Guloso (regra do cenário C, sem alteração) nos 100 cenários de teste e compara com o D.
// node simulador_d/run_guloso.js   → simulador_d/RESULTADOS_GULOSO.md
process.chdir(__dirname);
'use strict';
const fs = require('fs'), os = require('os'), { spawn } = require('child_process');
const NP = 8, JOBS = Math.max(2, Math.min(16, os.cpus().length - 2));
const fila = [];
for (const w of ['c2', 'd']) for (let p = 0; p < NP; p++) if (!fs.existsSync(`results/guloso_${w}_${p}.json`)) fila.push([w, p]);
const t0 = Date.now(), log = s => console.log(`[${new Date().toLocaleTimeString()}] ${s}`);
log(`Guloso: ${fila.length} partes pendentes, ${JOBS} em paralelo.`);
let ativos = 0, feitos = 0;
function proximo(fim) {
  if (!fila.length) { if (!ativos) fim(); return; }
  const [w, p] = fila.shift(); ativos++;
  const out = fs.openSync(`results/guloso_${w}_${p}.out`, 'w');
  const ch = spawn(process.execPath, ['guloso.js', w, p, NP], { stdio: ['ignore', out, out] });
  ch.on('exit', c => { ativos--; feitos++; log(`  ${w} parte ${p} ${c === 0 ? 'ok' : 'ERRO ' + c} (${feitos})`); proximo(fim); });
}
new Promise(r => { for (let j = 0; j < JOBS; j++) proximo(r); }).then(tabela);

function tabela() {
  const ld = pre => fs.readdirSync('results').filter(f => new RegExp(`^${pre}_\\d+\\.json$`).test(f)).flatMap(f => JSON.parse(fs.readFileSync(`results/${f}`))).sort((a, b) => a.i - b.i || a.K - b.K);
  const D = ld('test'), G5 = ld('guloso_c2'), GD = ld('guloso_d');
  const key = r => r.i + ':' + r.K, m5 = new Map(G5.map(r => [key(r), r])), md = new Map(GD.map(r => [key(r), r]));
  const rows = D.filter(r => m5.has(key(r)) && md.has(key(r)));
  for (const r of rows) { r.m['Guloso (5 ações)'] = m5.get(key(r)); r.m['Guloso (esperar/desobstruir)'] = md.get(key(r)); }
  let x = 12345; const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length, f2 = v => v.toFixed(2).replace('.', ','), sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + f2(Math.abs(v));
  function paired(d) { const n = d.length, bs = []; for (let b = 0; b < 5000; b++) { let s = 0; for (let i = 0; i < n; i++) s += d[Math.floor(rnd() * n)]; bs.push(s / n); } bs.sort((a, b) => a - b);
    return { mean: mean(d), lo: bs[124], hi: bs[4874], win: d.filter(v => v < 0).length / n, tie: d.filter(v => v === 0).length / n, loss: d.filter(v => v > 0).length / n }; }
  const M = Object.keys(rows[0].m), KS = [1, 3, 5, 10];
  let md5 = `# Cenário D — comparação com o Guloso\n\nGuloso = mesma regra do cenário C, sem alteração: a cada 60 min testa cada ação válida no simulador por 1 h e fica com a que deixa mais trechos estáveis (empate: menos veículo-hora; empate total: esperar). Rodado de duas formas: com as 5 ações (como no cenário C) e só com esperar/desobstruir (o conjunto do D).\n\nTeste: ${rows.length / 4} cenários × K ∈ {1,3,5,10} = ${rows.length} episódios (os mesmos do D e do C2). KPI em horas; menor é melhor.\n\n`;
  md5 += `## Tempo até estabilizar (média, horas)\n\n| Método | K=1 | K=3 | K=5 | K=10 | Média | Veículo-hora | Ações usadas |\n|---|---|---|---|---|---|---|---|\n`;
  for (const m of M) md5 += `| ${m} | ${KS.map(k => f2(mean(rows.filter(r => r.K === k).map(r => r.m[m].kpi)))).join(' | ')} | **${f2(mean(rows.map(r => r.m[m].kpi)))}** | ${Math.round(mean(rows.map(r => r.m[m].vh))).toLocaleString('pt-BR')} | ${f2(mean(rows.map(r => r.m[m].used)))} |\n`;
  const cmp = [];
  for (const g of ['Guloso (5 ações)', 'Guloso (esperar/desobstruir)']) for (const m of M) if (!m.startsWith('Guloso')) cmp.push([m, g]);
  cmp.push(['Guloso (esperar/desobstruir)', 'Guloso (5 ações)']);
  md5 += `\n## Contrastes pareados (KPI, horas; negativo = o primeiro foi mais rápido)\n\n| Contraste | Diferença | IC 95% | Melhor / empate / pior |\n|---|---|---|---|\n`;
  const sum = {};
  for (const [a, b] of cmp) { const p = paired(rows.map(r => r.m[a].kpi - r.m[b].kpi)); sum[`${a} − ${b}`] = p;
    md5 += `| ${a} − ${b} | ${sg(p.mean)} h | ${sg(p.lo)} a ${sg(p.hi)} | ${Math.round(100 * p.win)}% / ${Math.round(100 * p.tie)}% / ${Math.round(100 * p.loss)}% |\n`; }
  md5 += `\n## Contrastes por orçamento K (melhores do D − Guloso 5 ações)\n\n| Contraste | ${KS.map(k => 'K=' + k).join(' | ')} |\n|---|---|---|---|---|\n`;
  for (const m of ['D1-DDQN', 'D2L-DDQN', 'D2L-Q1', 'D2P-Q1', 'Esperar']) { md5 += `| ${m} − Guloso (5 ações) | ${KS.map(k => { const p = paired(rows.filter(r => r.K === k).map(r => r.m[m].kpi - r.m['Guloso (5 ações)'].kpi)); return `${sg(p.mean)} [${sg(p.lo)}; ${sg(p.hi)}]`; }).join(' | ')} |\n`; }
  md5 += `\n## Ações do Guloso no teste\n\n| Guloso | ${['WAIT', 'DESOB', 'INTERR', 'CTRL50', 'LIBERAR'].join(' | ')} |\n|---|---|---|---|---|---|\n`;
  for (const [g, R] of [['5 ações', G5], ['esperar/desobstruir', GD]]) md5 += `| ${g} | ${['WAIT', 'DESOB', 'INTERR', 'CTRL50', 'LIBERAR'].map(t => R.reduce((s, r) => s + (r.acoes[t] || 0), 0)).join(' | ')} |\n`;
  fs.writeFileSync('RESULTADOS_GULOSO.md', md5); fs.writeFileSync('results/summary_guloso.json', JSON.stringify(sum, null, 1));
  log(`Pronto em ${((Date.now() - t0) / 36e5).toFixed(1)} h. Resultados: simulador_d/RESULTADOS_GULOSO.md`);
}
