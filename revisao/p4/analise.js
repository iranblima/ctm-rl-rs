// P4 simplificado — tabelas: node analise.js → revisao/p4/RESULTADOS_P4.md
process.chdir(__dirname);
'use strict';
const fs = require('fs'), S = require('../estat.js');
const ld = (dir, re) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => re.test(f)).flatMap(f => JSON.parse(fs.readFileSync(`${dir}/${f}`))) : [];
const key = r => r.i + ':' + r.K, M = {}, put = (nm, R) => { if (R.length) M[nm] = new Map(R.map(r => [key(r), r.kpi])); };
const D = ld('../../simulador_d/results', /^test_\d+\.json$/); for (const nm of ['D1-DDQN', 'D1-Q1', 'D2P-Q1', 'Esperar']) M[nm] = new Map(D.map(r => [key(r), r.m[nm].kpi]));
const AC = { c2: '5 ações', d: 'só desobstruir' }, CO = { perfeito: 'modelo perfeito', tempo: 'sem saber tempos de remoção e fins', realista: 'tempos + demanda ±20% + filas ±20%' };
for (const w of ['c2', 'd']) for (const H of [60, 360]) {
  put(`Guloso ${H / 60} h, ${AC[w]}, ${CO.perfeito}`, ld('../../causas_d/results', new RegExp(`^guloso_h${H}_${w}_\\d+\\.json$`)));
  for (const c of ['tempo', 'realista']) put(`Guloso ${H / 60} h, ${AC[w]}, ${CO[c]}`, ld('results', new RegExp(`^g_${w}_h${H}_${c}_\\d+\\.json$`)));
}
const KEYS = [...M['D1-DDQN'].keys()].filter(k => Object.values(M).every(m => m.has(k))), cen = k => +k.split(':')[0];
let md = `# P4 simplificado — o Guloso com modelo imperfeito\n\nO episódio real usa o simulador verdadeiro; só as simulações de teste do Guloso usam o modelo imperfeito. Decide a cada 60 min. ${KEYS.length / 4} cenários × K ∈ {1,3,5,10} = ${KEYS.length} episódios. IC 95% por bootstrap agrupado por cenário.\n\n| Método | Média (h) | Não estabilizou |\n|---|---|---|\n`;
for (const nm of Object.keys(M)) { const v = KEYS.map(k => M[nm].get(k)); md += `| ${nm} | ${S.f2(S.mean(v))} | ${S.pc(S.mean(v.map(x => +(x > 12))))} |\n`; }
md += `\n| Comparação | Diferença | IC 95% | Significativo? |\n|---|---|---|---|\n`;
const C = (a, b) => { if (!M[a] || !M[b]) return; const c = S.bootCenario(KEYS.map(k => ({ i: cen(k), d: M[a].get(k) - M[b].get(k) }))); md += `| ${a} − ${b} | ${S.sg(c.mean)} h | ${S.ic(c)} | ${S.sig(c)} |\n`; };
for (const w of ['c2', 'd']) for (const H of [60, 360]) { const p = `Guloso ${H / 60} h, ${AC[w]}, `;
  C(p + CO.tempo, p + CO.perfeito); C(p + CO.realista, p + CO.perfeito); C(p + CO.realista, 'D1-DDQN'); C(p + CO.realista, 'D2P-Q1'); }
md += `\nEscolhas desta análise (declaradas antes dos resultados): tempo de remoção = o típico do tipo; fim natural desconhecido = dura até o fim do teste; demanda com fator fixo por cenário entre 0,8 e 1,2; filas com fator por sentido entre 0,8 e 1,2 a cada decisão.\n`;
fs.writeFileSync('RESULTADOS_P4.md', md); console.log('ok RESULTADOS_P4.md');
