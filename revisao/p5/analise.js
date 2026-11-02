// P5 — tabelas: node analise.js → revisao/p5/RESULTADOS_P5.md
process.chdir(__dirname);
'use strict';
const fs = require('fs'), S = require('../estat.js'), { CONFIGS, SEMENTES } = require('./configs.js');
const ld = (dir, re) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => re.test(f)).flatMap(f => JSON.parse(fs.readFileSync(`${dir}/${f}`))) : [];
const key = r => r.i + ':' + r.K, cen = k => +k.split(':')[0];
let md = `# P5 — o que o agente usa e o que ele precisa\n\nMesmos 100 cenários de teste do D × K ∈ {1,3,5,10} = 400 episódios. IC 95% por bootstrap agrupado por cenário.\n\n`;
// ---------- 1. permutação ----------
md += `## 1. Importância por permutação (redes já treinadas, sem treino novo)\n\nEm cada decisão, um grupo de atributos é embaralhado; a piora no tempo até estabilizar mede quanto a rede **usa** aquela informação.\n\n| Política | Grupo embaralhado | Média (h) | Piora | IC 95% | Significativo? |\n|---|---|---|---|---|---|\n`;
for (const P of ['D1-DDQN', 'D1-Q1', 'D2P-Q1']) { const R = ld('results', new RegExp(`^perm_${P}_\\d+\\.json$`)); if (!R.length) continue;
  const base = 'sem permutação'; md += `| ${P} | (nenhum) | ${S.f2(S.mean(R.map(r => r.m[base].kpi)))} | | | |\n`;
  for (const g of Object.keys(R[0].m).filter(g => g !== base)) { const c = S.bootCenario(R.map(r => ({ i: r.i, d: r.m[g].kpi - r.m[base].kpi })));
    md += `| ${P} | ${g} | ${S.f2(S.mean(R.map(r => r.m[g].kpi)))} | ${S.sg(c.mean)} h | ${S.ic(c)} | ${S.sig(c)} |\n`; } }
// ---------- 2. ablações com treino ----------
const SD = ld('../../simulador_d/results', /^test_sementes_\d+\.json$/), sdMap = new Map(SD.map(r => [key(r), r]));
const best = (dir, seeds) => seeds.map(s => [s, `${dir}/selected_seed_${s}.json`]).filter(([, f]) => fs.existsSync(f)).map(([s, f]) => ({ s, kpi: JSON.parse(fs.readFileSync(f)).kpi })).sort((a, b) => a.kpi - b.kpi)[0];
const REF = {}; for (const ref of ['D1-DDQN', 'D1-Q1']) { const b = best(`../../simulador_d/results/${ref}`, SEMENTES);
  REF[ref] = { media: k => S.mean(SEMENTES.map(s => sdMap.get(k).m[`${ref} s${s}`].kpi)), sel: k => sdMap.get(k).m[`${ref} s${b.s}`].kpi, semente: b.s, val: b.kpi }; }
md += `\n## 2. Ablações com treino novo (5 sementes cada)\n\n**Média das sementes** = média das 5 redes (a melhor de cada semente na validação), por episódio: é a comparação principal. **Rede escolhida** = a melhor das 5 na validação. Referências: D1-DDQN e D1-Q1 do cenário D, sementes 0 a 4 (α = 0,25, todos os atributos).\n\n| Configuração | Média das sementes (h) | Diferença p/ referência | IC 95% | Signif.? | Rede escolhida (h) | Diferença | IC 95% |\n|---|---|---|---|---|---|---|---|\n`;
for (const ref of ['D1-DDQN', 'D1-Q1']) { const ks = [...sdMap.keys()]; md += `| **Referência ${ref}** | ${S.f2(S.mean(ks.map(REF[ref].media)))} | | | | ${S.f2(S.mean(ks.map(REF[ref].sel)))} (semente ${REF[ref].semente}) | | |\n`; }
for (const [M, cfg] of Object.entries(CONFIGS)) {
  const R = ld(`results/${M}`, /^test_\d+\.json$/); if (!R.length) { md += `| ${cfg.nome} | sem resultado | | | | | | |\n`; continue; }
  const sel = fs.existsSync(`results/${M}/selected.json`) ? JSON.parse(fs.readFileSync(`results/${M}/selected.json`)).seed : null, rf = REF[cfg.ref];
  const med = r => S.mean(Object.values(r.m).map(v => v.kpi)), ks = R.filter(r => sdMap.has(key(r)));
  const c1 = S.bootCenario(ks.map(r => ({ i: r.i, d: med(r) - rf.media(key(r)) }))), c2 = sel != null ? S.bootCenario(ks.map(r => ({ i: r.i, d: r.m[`s${sel}`].kpi - rf.sel(key(r)) }))) : null;
  md += `| ${cfg.nome} | ${S.f2(S.mean(ks.map(med)))} | ${S.sg(c1.mean)} h | ${S.ic(c1)} | ${S.sig(c1)} | ${sel != null ? S.f2(S.mean(ks.map(r => r.m['s' + sel].kpi))) + ` (semente ${sel})` : '—'} | ${c2 ? S.sg(c2.mean) + ' h' : '—'} | ${c2 ? S.ic(c2) : '—'} |\n`;
}
md += `\nPositivo = a ablação piorou (a informação ou o termo retirado ajudava). Ablações de atributos: o grupo vira zero no treino e no teste. Grupos, α testados e número de sementes são escolhas desta análise, declaradas antes dos resultados.\n`;
fs.writeFileSync('RESULTADOS_P5.md', md); console.log('ok RESULTADOS_P5.md');
