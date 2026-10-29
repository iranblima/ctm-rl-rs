// Cenário D — tabelas: results/summary.json e RESULTADOS_D.md
// Diferenças pareadas (mesmo cenário e orçamento) com IC 95% por bootstrap (5.000 reamostragens, sorteio fixo).
process.chdir(__dirname);
const fs = require('fs'), { CONFIGS, ALPHA } = require('./configs.js');
const load = pre => fs.readdirSync('results').filter(f => new RegExp(`^${pre}_\\d+\\.json$`).test(f)).flatMap(f => JSON.parse(fs.readFileSync(`results/${f}`))).sort((a, b) => a.i - b.i || a.K - b.K);
const res = load('test'), seedsRes = load('test_sementes');
if (!res.length) { console.error('sem resultados de teste'); process.exit(1); }
const M = Object.keys(res[0].m), KS = [1, 3, 5, 10];
let x = 12345; const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
function paired(d) { const n = d.length, bs = []; for (let b = 0; b < 5000; b++) { let s = 0; for (let i = 0; i < n; i++) s += d[Math.floor(rnd() * n)]; bs.push(s / n); } bs.sort((a, b) => a - b);
  return { mean: mean(d), lo: bs[124], hi: bs[4874], win: d.filter(v => v < 0).length / n, tie: d.filter(v => v === 0).length / n, loss: d.filter(v => v > 0).length / n, n }; }
const col = (rr, m, k) => rr.map(r => r.m[m][k]);
const metodos = {};
for (const m of M) {
  const all = res.map(r => r.m[m]), ep = all.flatMap(o => o.epochs || []);
  const taus = {}; for (const e of ep) taus[e.dt] = (taus[e.dt] || 0) + 1;
  const why = {}; for (const e of ep) why[e.why] = (why[e.why] || 0) + 1;
  const acts = {}; for (const e of ep) acts[e.type] = (acts[e.type] || 0) + 1;
  const desob = {}; res.forEach(r => (r.m[m].epochs || []).filter(e => e.type === 'DESOB').forEach(e => { const c = r.evs.find(v => v.i === e.ev).cls; desob[c] = (desob[c] || 0) + 1; }));
  metodos[m] = { kpi: mean(all.map(o => o.kpi)), vh: mean(all.map(o => o.vh)), usadas: mean(all.map(o => o.used)), naoEstabilizou: all.filter(o => o.censored).length / all.length,
    decisoesPorEpisodio: ep.length / all.length, tauMedio: ep.length ? mean(ep.map(e => e.tau)) : null, escolhaDtau: taus, motivoFimEpoca: why, acoes: acts, desobPorTipo: desob,
    porK: Object.fromEntries(KS.map(K => [K, mean(res.filter(r => r.K === K).map(r => r.m[m].kpi))])) };
}
const C = [['D1-DDQN', 'D1-Q1', 'Retorno futuro com o reward atual (DDQN − Q1)'], ['D2L-DDQN', 'D2L-Q1', 'Retorno futuro com importância somada (DDQN − Q1)'], ['D2P-DDQN', 'D2P-Q1', 'Retorno futuro com importância como potencial (DDQN − Q1)'],
  ['D2L-DDQN', 'D1-DDQN', 'Importância somada × reward atual (DDQN)'], ['D2P-DDQN', 'D1-DDQN', 'Importância como potencial × reward atual (DDQN)'], ['D2P-DDQN', 'D2L-DDQN', 'Potencial × somada (DDQN)'],
  ['D2L-Q1', 'D1-Q1', 'Importância somada × reward atual (Q1)'], ['D2P-Q1', 'D1-Q1', 'Importância como potencial × reward atual (Q1)']];
for (const m of M.filter(m => /^D/.test(m))) C.push([m, 'Esperar', `${m} − Esperar`], [m, 'Aleatória', `${m} − Aleatória`]);
C.push(['Aleatória', 'Esperar', 'Aleatória − Esperar']);
const contrastes = C.filter(([a, b]) => M.includes(a) && M.includes(b)).map(([a, b, nome]) => ({ a, b, nome, kpi: paired(res.map(r => r.m[a].kpi - r.m[b].kpi)), vh: paired(res.map(r => r.m[a].vh - r.m[b].vh)),
  porK: Object.fromEntries(KS.map(K => [K, paired(res.filter(r => r.K === K).map(r => r.m[a].kpi - r.m[b].kpi))])) }));
const sementes = {};
if (seedsRes.length) for (const nm of Object.keys(seedsRes[0].m)) { const [cfg, s] = nm.split(' '); (sementes[cfg] = sementes[cfg] || []).push({ semente: s.replace(/^s/, ""), kpi: mean(seedsRes.map(r => r.m[nm].kpi)) }); }
for (const k in sementes) { const v = sementes[k].map(o => o.kpi), m = mean(v); sementes[k] = { porSemente: sementes[k], media: m, dp: Math.sqrt(mean(v.map(y => (y - m) ** 2))) }; }
const sel = {}; for (const m of Object.keys(CONFIGS)) { const f = `results/${m}/selected.json`; if (fs.existsSync(f)) { const s = JSON.parse(fs.readFileSync(f)); sel[m] = { semente: s.seed, episodio: s.ep, kpiValidacao: s.kpi, vhValidacao: s.vh }; } }
// referência do cenário C2 (mesmos 100 cenários de teste e mesma medida): M5 (DDQN, Δτ variável, 5 ações) e M4 (Q1)
const c2f = fs.existsSync('../simulador_c2/results') ? fs.readdirSync('../simulador_c2/results').filter(f => /^test_\d+\.json$/.test(f)) : [];
let comparaC2 = null;
if (c2f.length) {
  const c2 = new Map(c2f.flatMap(f => JSON.parse(fs.readFileSync(`../simulador_c2/results/${f}`))).map(r => [r.i + ':' + r.K, r]));
  if (res.every(r => c2.has(r.i + ':' + r.K))) {
    comparaC2 = {};
    for (const [a, b] of [['D1-DDQN', 'M5'], ['D2L-DDQN', 'M5'], ['D2P-DDQN', 'M5'], ['D1-Q1', 'M4']]) if (M.includes(a)) comparaC2[`${a}|C2 ${b}`] = { c2: mean(res.map(r => c2.get(r.i + ':' + r.K).m[b].kpi)), ...paired(res.map(r => r.m[a].kpi - c2.get(r.i + ':' + r.K).m[b].kpi)) };
  }
}
const valref = fs.existsSync('results/valref.json') ? JSON.parse(fs.readFileSync('results/valref.json')) : null;
const summary = { comparaC2, alpha: ALPHA, nCenarios: new Set(res.map(r => r.i)).size, episodios: res.length, metodos, contrastes, sementes, selecionados: sel, validacao: valref };
fs.writeFileSync('results/summary.json', JSON.stringify(summary, null, 1));
const extraC2 = comparaC2 ? `\n## Comparação com o cenário C2 (mesmos cenários; C2 com as 5 ações)\n\n| Contraste | Média C2 | Diferença | IC 95% |\n|---|---|---|---|\n` + Object.entries(comparaC2).map(([k, v]) => `| ${k.replace('|', ' − ')} | ${v.c2.toFixed(2).replace('.', ',')} | ${(v.mean > 0 ? '+' : v.mean < 0 ? '−' : '') + Math.abs(v.mean).toFixed(2).replace('.', ',')} h | ${v.lo.toFixed(2).replace('.', ',')} a ${v.hi.toFixed(2).replace('.', ',')} |`).join('\n') + '\n' : '';
// Markdown
const f2 = v => v == null ? '—' : v.toFixed(2).replace('.', ','), sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + f2(Math.abs(v)), pc = v => Math.round(100 * v) + '%';
const nome = m => CONFIGS[m] ? CONFIGS[m].nome : m;
let md = `# Cenário D — resultados brutos (só esperar ou desobstruir)\n\nTeste: ${summary.nCenarios} cenários novos × K ∈ {1, 3, 5, 10} = ${res.length} episódios por método. KPI = horas até ≥ 80% dos 630 sentidos estáveis, medido a cada 15 min (13 = não estabilizou em 12 h); menor é melhor. α = ${String(ALPHA).replace('.', ',')}.\n\n`;
md += `## Tempo até estabilizar (média, horas)\n\n| Método | K=1 | K=3 | K=5 | K=10 | Média | Veículo-hora | Ações usadas | Decisões/episódio |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const m of M) { const o = metodos[m]; md += `| ${nome(m)} | ${KS.map(K => f2(o.porK[K])).join(' | ')} | **${f2(o.kpi)}** | ${Math.round(o.vh).toLocaleString('pt-BR')} | ${f2(o.usadas)} | ${f2(o.decisoesPorEpisodio)} |\n`; }
md += `\n## Contrastes pareados (KPI, horas; negativo = o primeiro foi mais rápido)\n\n| Contraste | Diferença | IC 95% | Melhor / empate / pior |\n|---|---|---|---|\n`;
for (const c of contrastes) md += `| ${c.nome} (${c.a} − ${c.b}) | ${sg(c.kpi.mean)} h | ${sg(c.kpi.lo)} a ${sg(c.kpi.hi)} | ${pc(c.kpi.win)} / ${pc(c.kpi.tie)} / ${pc(c.kpi.loss)} |\n`;
md += `\n## Contrastes principais por orçamento K (KPI, horas)\n\n| Contraste | K=1 | K=3 | K=5 | K=10 |\n|---|---|---|---|---|\n`;
for (const c of contrastes.filter(c => /^D/.test(c.b))) md += `| ${c.a} − ${c.b} | ${KS.map(K => `${sg(c.porK[K].mean)} [${sg(c.porK[K].lo)}; ${sg(c.porK[K].hi)}]`).join(' | ')} |\n`;
md += `\n## Timing (modos variáveis)\n\n| Método | Δτ escolhido (15/30/60 min) | Épocas encerradas por evento | Duração média da época (min) |\n|---|---|---|---|\n`;
for (const m of M) { const o = metodos[m]; md += `| ${nome(m)} | ${[15, 30, 60].map(d => o.escolhaDtau[d] || 0).join(' / ')} | ${o.motivoFimEpoca.evento || 0} | ${f2(o.tauMedio)} |\n`; }
md += `\n## Ações no teste\n\n| Método | Esperar | Desobstruir (acidente/barreira/estrutura) | Interromper | Controle 50% | Liberar |\n|---|---|---|---|---|---|\n`;
for (const m of M) { const a = metodos[m].acoes, d = metodos[m].desobPorTipo; md += `| ${nome(m)} | ${a.WAIT || 0} | ${a.DESOB || 0} (${d.acidente || 0}/${d.barreira || 0}/${d.estrutura || 0}) | ${a.INTERR || 0} | ${a.CTRL50 || 0} | ${a.LIBERAR || 0} |\n`; }
if (Object.keys(sementes).length) { md += `\n## Variabilidade entre sementes (teste da melhor rede de cada semente)\n\n| Config. | KPI por semente | Média | Desvio-padrão |\n|---|---|---|---|\n`;
  for (const [k, v] of Object.entries(sementes)) md += `| ${k} | ${v.porSemente.map(o => `s${o.semente}: ${f2(o.kpi)}`).join(', ')} | ${f2(v.media)} | ${f2(v.dp)} |\n`; }
md += `\n## Redes escolhidas na validação\n\n| Config. | Semente | Episódio | KPI validação |\n|---|---|---|---|\n`;
for (const [k, v] of Object.entries(sel)) md += `| ${k} | ${v.semente} | ${v.episodio} | ${f2(v.kpiValidacao)} |\n`;
if (valref) md += `\nValidação das referências: ${Object.entries(valref).map(([k, v]) => `${k} ${f2(v.kpi)} h`).join(', ')}.\n`;
md += extraC2; fs.writeFileSync('RESULTADOS_D.md', md); console.log(md);
