// Confirmação — tabelas: node analise.js → confirmacao/RESULTADOS_CONFIRMACAO.md (teste novo, com o teste antigo ao lado)
process.chdir(__dirname);
'use strict';
const fs = require('fs'), path = require('path'), S = require('../revisao/estat.js');
const ld = (dir, re) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => re.test(f)).flatMap(f => JSON.parse(fs.readFileSync(path.join(dir, f)))) : [];
const key = r => r.i + ':' + r.K, cen = k => +k.split(':')[0];
const AC = { c2: '5 ações', d: 'só desobstruir' }, nomeG = (w, H, c) => `Guloso ${H / 60} h, ${AC[w]}${c === 'realista' ? ', modelo imperfeito' : ''}`;
function carrega(novo) {
  const M = {}, put = (nm, R, f) => { if (R.length) M[nm] = new Map(R.map(r => [key(r), f(r)])); };
  if (novo) { const A = ld('results', /^aprendidas_\d+\.json$/); if (A.length) for (const nm of Object.keys(A[0].m)) put(nm, A, r => r.m[nm].kpi);
    for (const w of ['c2', 'd']) for (const H of [60, 180, 360]) for (const c of ['perfeito', 'realista']) put(nomeG(w, H, c), ld('results', new RegExp(`^g_${w}_${H}_${c}_\\d+\\.json$`)), r => r.kpi); }
  else { const D = ld('../simulador_d/results', /^test_\d+\.json$/); for (const nm of ['Esperar', 'Aleatória', 'D1-Q1', 'D1-DDQN', 'D2P-Q1']) put(nm, D, r => r.m[nm].kpi);
    const RG = ld('../causas_d/results', /^regras_\d+\.json$/); put('Regra: fluxo', RG, r => r.m['Regra: fluxo'].kpi);
    for (const w of ['c2', 'd']) for (const H of [60, 180, 360]) put(nomeG(w, H, 'perfeito'), ld('../causas_d/results', new RegExp(`^guloso_h${H}_${w}_\\d+\\.json$`)), r => r.kpi);
    for (const w of ['c2', 'd']) put(nomeG(w, 360, 'realista'), ld('../revisao/p4/results', new RegExp(`^g_${w}_h360_realista_\\d+\\.json$`)), r => r.kpi); }
  const ks = Object.values(M)[0] ? [...Object.values(M)[0].keys()].filter(k => Object.values(M).every(m => m.has(k))) : [];
  return { M, ks };
}
const N = carrega(true), V = carrega(false);
let md = `# Confirmação num conjunto de teste novo\n\n**Teste novo:** ${N.ks.length / 4} cenários nunca usados (sementes 5.000.000+) × K ∈ {1,3,5,10} = ${N.ks.length} episódios. **Teste antigo:** os 100 cenários usados até aqui (sementes 4.000.000+). Nada foi treinado nem ajustado. Comparações registradas antes da rodada (CONFIRMACAO.md). IC 95% por bootstrap agrupado por cenário.\n\n`;
md += `## Tempo até estabilizar (média, horas)\n\n| Método | Teste novo | Não estabilizou (novo) | Teste antigo |\n|---|---|---|---|\n`;
for (const nm of Object.keys(N.M)) { const v = N.ks.map(k => N.M[nm].get(k)); md += `| ${nm} | ${S.f2(S.mean(v))} | ${S.pc(S.mean(v.map(x => +(x > 12))))} | ${V.M[nm] ? S.f2(S.mean(V.ks.map(k => V.M[nm].get(k)))) : '—'} |\n`; }
const CMP = [['1. Horizonte', [[nomeG('c2', 180), nomeG('c2', 60)], [nomeG('c2', 360), nomeG('c2', 60)], [nomeG('d', 180), nomeG('d', 60)], [nomeG('d', 360), nomeG('d', 60)]]],
  ['2. Planejamento longo × aprendizado', [[nomeG('c2', 360), 'D1-DDQN'], [nomeG('c2', 360), 'D2P-Q1'], [nomeG('d', 360), 'D1-DDQN'], [nomeG('d', 360), 'D2P-Q1']]],
  ['3. Modelo imperfeito', [[nomeG('c2', 360, 'realista'), nomeG('c2', 360)], [nomeG('c2', 360, 'realista'), 'D1-DDQN'], [nomeG('c2', 360, 'realista'), 'D2P-Q1'], [nomeG('d', 360, 'realista'), nomeG('d', 360)], [nomeG('d', 360, 'realista'), 'D1-DDQN'], [nomeG('d', 360, 'realista'), 'D2P-Q1']]],
  ['4. Aprendizado × planejamento curto', [['D1-DDQN', nomeG('c2', 60)], ['D2P-Q1', nomeG('c2', 60)]]],
  ['5. Retorno futuro', [['D1-DDQN', 'D1-Q1']]], ['6. Regra simples', [['Regra: fluxo', 'D1-DDQN'], ['Regra: fluxo', 'D2P-Q1']]], ['7. Aprender ajuda', [['D1-DDQN', 'Esperar']]]];
md += `\n## Comparações registradas (negativo = o primeiro foi mais rápido)\n\n| Comparação | Teste novo | IC 95% (novo) | Signif.? | Teste antigo | IC 95% (antigo) | Mesmo sentido e significância? |\n|---|---|---|---|---|---|---|\n`;
const est = (X, a, b) => (X.M[a] && X.M[b]) ? S.bootCenario(X.ks.map(k => ({ i: cen(k), d: X.M[a].get(k) - X.M[b].get(k) }))) : null;
for (const [g, L] of CMP) { md += `| **${g}** | | | | | | |\n`;
  for (const [a, b] of L) { const n = est(N, a, b), o = est(V, a, b); if (!n) { md += `| ${a} − ${b} | sem resultado | | | | | |\n`; continue; }
    const igual = o ? (S.sig(n) === S.sig(o) && (S.sig(n) === 'não' || Math.sign(n.mean) === Math.sign(o.mean)) ? 'sim' : 'NÃO') : '—';
    md += `| ${a} − ${b} | ${S.sg(n.mean)} h | ${S.ic(n)} | ${S.sig(n)} | ${o ? S.sg(o.mean) + ' h' : '—'} | ${o ? S.ic(o) : '—'} | ${igual} |\n`; } }
md += `\n"Mesmo sentido e significância?" = a conclusão do teste antigo se repete no novo (mesmo sinal quando significativo, ou não significativo nos dois).\n`;
fs.writeFileSync('RESULTADOS_CONFIRMACAO.md', md); console.log('ok RESULTADOS_CONFIRMACAO.md');
