// P0 — estatística e registro dos resultados que já existem (nada é rodado de novo): node revisao/p0.js
// 1) Refaz os intervalos de confiança das comparações do artigo com bootstrap agrupado por cenário (100 grupos), ao lado do
//    bootstrap por episódio usado até agora. 2) Fração de episódios que não estabilizaram em 12 h (KPI = 13) e média só dos que
//    estabilizaram. 3) Comparações com a média das 10 sementes (rede de cada semente), não só a rede escolhida. 4) Custo
//    computacional: treino, Guloso (CPU por episódio) e tempo de decisão da política aprendida (medido aqui).
process.chdir(__dirname);
'use strict';
const fs = require('fs'), path = require('path'), S = require('./estat.js');
const ld = (dir, pre) => { const d = path.join('..', dir); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => new RegExp(`^${pre}_\\d+\\.json$`).test(f)).flatMap(f => JSON.parse(fs.readFileSync(path.join(d, f)))) : []; };
const key = r => r.i + ':' + r.K;
// ---------- métodos por episódio ----------
const M = {}, put = (nm, rows, get) => { if (rows.length) M[nm] = new Map(rows.map(r => [key(r), get(r)])); };
const D = ld('simulador_d/results', 'test');
for (const nm of Object.keys(D[0].m)) put(nm, D, r => r.m[nm]);
put('Guloso 60 min, 5 ações', ld('simulador_d/results', 'guloso_c2'), r => r); put('Guloso 60 min, só desobstruir', ld('simulador_d/results', 'guloso_d'), r => r);
put('Guloso 15 min, 5 ações', ld('simulador_d2/results', 'guloso15_c2'), r => r); put('Guloso 15 min, só desobstruir', ld('simulador_d2/results', 'guloso15_d'), r => r);
for (const H of [60, 180, 360]) { put(`Guloso olhando ${H / 60} h, 5 ações`, ld('causas_d/results', `guloso_h${H}_c2`), r => r); put(`Guloso olhando ${H / 60} h, só desobstruir`, ld('causas_d/results', `guloso_h${H}_d`), r => r); }
const RG = ld('causas_d/results', 'regras'); if (RG.length) for (const nm of Object.keys(RG[0].m)) put(nm, RG, r => r.m[nm]);
// média das 10 sementes por episódio (D)
const SD = ld('simulador_d/results', 'test_sementes');
if (SD.length) for (const cfg of [...new Set(Object.keys(SD[0].m).map(n => n.split(' ')[0]))]) put(`${cfg} (média das sementes)`, SD, r => { const v = Object.keys(r.m).filter(n => n.startsWith(cfg + ' ')).map(n => r.m[n].kpi); return { kpi: v.reduce((a, b) => a + b, 0) / v.length }; });
const KEYS = [...M['Esperar'].keys()].filter(k => Object.values(M).every(m => m.has(k)));
const kpi = (nm, k) => M[nm].get(k).kpi, cen = k => +k.split(':')[0];
const diff = (a, b, ks = KEYS) => ks.map(k => ({ i: cen(k), d: kpi(a, k) - kpi(b, k) }));
let md = `# P0 — estatística revista (cenário D e derivados)\n\n${KEYS.length / 4} cenários de teste × K ∈ {1, 3, 5, 10} = ${KEYS.length} episódios por método. **IC por cenário:** bootstrap que sorteia cenários (100 grupos; os 4 orçamentos de um cenário entram juntos). **IC por episódio:** o usado até agora (400 linhas tratadas como independentes). 5.000 reamostragens. Nada foi rodado de novo.\n\n`;
// ---------- 1. censura ----------
md += `## 1. Episódios que não estabilizaram em 12 h\n\nKPI = 13 h quando a rede não chega a 80% estável dentro de 12 h (censura à direita: não é uma recuperação observada em 13 h).\n\n| Método | Média (h) | Não estabilizou | Média só dos que estabilizaram (h) |\n|---|---|---|---|\n`;
for (const nm of Object.keys(M)) { if (nm.includes('sementes')) continue; const v = KEYS.map(k => kpi(nm, k)), ok = v.filter(x => x <= 12);
  md += `| ${nm} | ${S.f2(S.mean(v))} | ${S.pc(1 - ok.length / v.length)} | ${S.f2(S.mean(ok))} |\n`; }
// ---------- 2. contrastes ----------
const CMP = [
  ['RL × Guloso', [['D1-DDQN', 'Guloso 60 min, 5 ações'], ['D1-Q1', 'Guloso 60 min, 5 ações'], ['D2P-Q1', 'Guloso 60 min, 5 ações'], ['D1-DDQN', 'Guloso 15 min, 5 ações'], ['D2P-Q1', 'Guloso 15 min, 5 ações'], ['D1-DDQN', 'Guloso 15 min, só desobstruir'], ['D1-DDQN (média das sementes)', 'Guloso 15 min, 5 ações'], ['D2P-Q1 (média das sementes)', 'Guloso 15 min, 5 ações']]],
  ['Retorno futuro (DDQN − Q1, mesma recompensa)', [['D1-DDQN', 'D1-Q1'], ['D2L-DDQN', 'D2L-Q1'], ['D2P-DDQN', 'D2P-Q1'], ['D1-DDQN (média das sementes)', 'D1-Q1 (média das sementes)'], ['D2L-DDQN (média das sementes)', 'D2L-Q1 (média das sementes)'], ['D2P-DDQN (média das sementes)', 'D2P-Q1 (média das sementes)']]],
  ['Recompensa com importância', [['D2L-DDQN', 'D1-DDQN'], ['D2P-Q1', 'D1-Q1'], ['D2L-DDQN (média das sementes)', 'D1-DDQN (média das sementes)'], ['D2P-Q1 (média das sementes)', 'D1-Q1 (média das sementes)']]],
  ['Frequência de decisão do Guloso', [['Guloso 15 min, 5 ações', 'Guloso 60 min, 5 ações'], ['Guloso 15 min, só desobstruir', 'Guloso 60 min, só desobstruir']]],
  ['Horizonte do Guloso', [['Guloso olhando 3 h, 5 ações', 'Guloso olhando 1 h, 5 ações'], ['Guloso olhando 6 h, 5 ações', 'Guloso olhando 1 h, 5 ações'], ['Guloso olhando 3 h, só desobstruir', 'Guloso olhando 1 h, só desobstruir'], ['Guloso olhando 6 h, só desobstruir', 'Guloso olhando 1 h, só desobstruir'], ['Guloso olhando 3 h, 5 ações', 'D1-DDQN'], ['Guloso olhando 6 h, 5 ações', 'D1-DDQN'], ['Guloso olhando 6 h, só desobstruir', 'D1-DDQN'], ['Guloso olhando 6 h, só desobstruir', 'D2P-Q1']]],
  ['Regra simples', [['Regra: fluxo', 'D1-DDQN'], ['Regra: fluxo', 'D2P-Q1'], ['Regra: fluxo', 'Guloso 15 min, 5 ações']]],
];
md += `\n## 2. Comparações pareadas (horas; negativo = o primeiro foi mais rápido)\n\n| Comparação | Diferença | IC 95% por cenário | Significativo? | IC 95% por episódio (antes) | Melhor / empate / pior |\n|---|---|---|---|---|---|\n`;
const resumo = {};
for (const [grupo, lista] of CMP) { md += `| **${grupo}** | | | | | |\n`;
  for (const [a, b] of lista) { if (!M[a] || !M[b]) continue; const pr = diff(a, b), c = S.bootCenario(pr), e = S.bootEpisodio(pr); resumo[`${a} − ${b}`] = { ...c, loEp: e.lo, hiEp: e.hi };
    md += `| ${a} − ${b} | ${S.sg(c.mean)} h | ${S.ic(c)} | ${S.sig(c)} | ${S.ic(e)} | ${Math.round(100 * c.win)}% / ${Math.round(100 * c.tie)}% / ${Math.round(100 * c.loss)}% |\n`; } }
md += `\n**Por orçamento K (IC por cenário):** D1-DDQN − Guloso 15 min, 5 ações\n\n| K | Diferença | IC 95% |\n|---|---|---|\n`;
for (const K of [1, 3, 5, 10]) { const ks = KEYS.filter(k => k.endsWith(':' + K)); const c = S.bootCenario(diff('D1-DDQN', 'Guloso 15 min, 5 ações', ks)); md += `| ${K} | ${S.sg(c.mean)} h | ${S.ic(c)} |\n`; }
// ---------- C2 ----------
const C2 = ld('simulador_c2/results', 'test');
if (C2.length) { const CK = C2.map(key), g = (nm, k) => C2.find(r => key(r) === k).m[nm].kpi, mapa = new Map(C2.map(r => [key(r), r]));
  md += `\n**Cenário C2 (5 ações, mesmos cenários de teste), rede escolhida:**\n\n| Comparação | Diferença | IC 95% por cenário | IC 95% por episódio (antes) |\n|---|---|---|---|\n`;
  for (const [a, b] of [['M1', 'M0'], ['M3', 'M2'], ['M5', 'M4'], ['M4', 'M2'], ['M5', 'M3']]) { const pr = CK.map(k => ({ i: cen(k), d: mapa.get(k).m[a].kpi - mapa.get(k).m[b].kpi })), c = S.bootCenario(pr), e = S.bootEpisodio(pr);
    md += `| ${a} − ${b} | ${S.sg(c.mean)} h | ${S.ic(c)} | ${S.ic(e)} |\n`; } }
// ---------- 3. custo computacional ----------
md += `\n## 3. Custo computacional (i9-10900K, 1 núcleo por processo)\n\n`;
const tempos = (arq, re) => { const p = path.join('..', arq); if (!fs.existsSync(p)) return []; const o = []; for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = l.match(re); if (m) o.push([m[1], +m[2]]); } return o; };
const tr = tempos('simulador_d/results/progresso.log', /fim\s+(\S+) semente \d+ \((\d+) min\)/);
if (tr.length) { const v = tr.map(x => x[1]); md += `- **Treino (cenário D):** ${tr.length} treinos de 2.400 episódios; ${Math.min(...v)} a ${Math.max(...v)} min cada (média ${S.f2(S.mean(v))} min).\n`; }
const g15 = tempos('simulador_d2/results/progresso.log', /(c2|d) parte \d+ ok \(([\d.]+) min\)/);
for (const [w, nm] of [['c2', '5 ações'], ['d', 'só desobstruir']]) { const v = g15.filter(x => x[0] === w).map(x => x[1]); if (v.length) md += `- **Guloso a cada 15 min, ${nm}:** ${S.f2(v.reduce((a, b) => a + b, 0))} min de CPU para 400 episódios = ${S.f2(60 * v.reduce((a, b) => a + b, 0) / 400)} s por episódio.\n`; }
const gh = tempos('causas_d/results/progresso.log', /(guloso_h\d+_\w+?)_\d+ ok \(([\d.]+) min\)/);
for (const nm of [...new Set(gh.map(x => x[0]))]) { const v = gh.filter(x => x[0] === nm).map(x => x[1]), s = v.reduce((a, b) => a + b, 0), [, H, w] = nm.match(/h(\d+)_(\w+)/);
  md += `- **Guloso olhando ${+H / 60} h, ${w === 'c2' ? '5 ações' : 'só desobstruir'} (decide a cada 60 min):** ${S.f2(s)} min de CPU para 400 episódios = ${S.f2(60 * s / 400)} s por episódio.\n`; }
// tempo de decisão da política aprendida: medido agora (só a rede, sem o simulador)
try {
  const E = require('../simulador_d/env.js'), { Net } = require('../simulador_d/rl.js');
  const net = Net.from(JSON.parse(fs.readFileSync('../simulador_d/results/D1-DDQN/selected.json')).net);
  const sc = E.scenario(E.SEEDS.teste2(0)), ep = new E.Ep(sc, 10, { variavel: true }), C = ep.legal();
  let t0 = process.hrtime.bigint(); const N = 2000; for (let k = 0; k < N; k++) net.fwd(ep.feats(C)); const tRede = Number(process.hrtime.bigint() - t0) / 1e6 / N;
  t0 = process.hrtime.bigint(); for (let k = 0; k < 200; k++) ep.legal(); const tLeg = Number(process.hrtime.bigint() - t0) / 1e6 / 200;
  md += `- **Decisão da política aprendida (medido agora, no computador desta análise):** ${S.f2(tRede)} ms para calcular os atributos e a rede sobre ${C.length} candidatos, mais ${S.f2(tLeg)} ms para montar os candidatos. Não consulta o simulador.\n`;
} catch (e) { md += `- Tempo de decisão da política aprendida: não medido (${e.message}).\n`; }
md += `\nObservação: os tempos do Guloso são de CPU somados entre processos; o tempo de relógio depende de quantos rodam em paralelo.\n`;
fs.writeFileSync('P0_ESTATISTICA.md', md); fs.writeFileSync('results/p0_resumo.json', JSON.stringify(resumo, null, 1)); console.log('ok revisao/P0_ESTATISTICA.md');
