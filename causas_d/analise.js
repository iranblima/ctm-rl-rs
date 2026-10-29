// Análise das causas — junta tudo em causas_d/RESULTADOS_CAUSAS.md: node analise.js
// Lê: testes do D (RL, Esperar, Aleatória, Guloso 60 min), do D2 (Guloso 15 min) e os resultados de regras.js, guloso_h.js e auditoria.js.
process.chdir(__dirname);
'use strict';
const fs = require('fs'), E = require('../simulador_d/env.js');
const ld = (dir, pre) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => new RegExp(`^${pre}_\\d+\\.json$`).test(f)).flatMap(f => JSON.parse(fs.readFileSync(`${dir}/${f}`))) : [];
const key = r => r.i + ':' + r.K, KS = [1, 3, 5, 10];
let x = 12345; const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN, f2 = v => isNaN(v) ? '—' : v.toFixed(2).replace('.', ','), pc = v => isNaN(v) ? '—' : (100 * v).toFixed(1).replace('.', ',') + '%';
const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + f2(Math.abs(v));
function paired(d) { const n = d.length, bs = []; for (let b = 0; b < 5000; b++) { let s = 0; for (let i = 0; i < n; i++) s += d[Math.floor(rnd() * n)]; bs.push(s / n); } bs.sort((a, b) => a - b);
  return { mean: mean(d), lo: bs[124], hi: bs[4874], win: d.filter(v => v < 0).length / n, tie: d.filter(v => v === 0).length / n, loss: d.filter(v => v > 0).length / n }; }
// ---------- junta os métodos por episódio ----------
const D = ld('../simulador_d/results', 'test'), base = new Map(D.map(r => [key(r), r]));
const M = {};   // nome → Map(key → {kpi, vh, used, acoes?, epochs?})
for (const nm of ['Esperar', 'Aleatória', 'D1-Q1', 'D1-DDQN', 'D2L-DDQN', 'D2P-Q1']) M[nm] = new Map(D.map(r => [key(r), r.m[nm]]));
const add = (nm, R) => { if (R.length) M[nm] = new Map(R.map(r => [key(r), r])); };
add('Guloso 60 min, 5 ações', ld('../simulador_d/results', 'guloso_c2')); add('Guloso 15 min, 5 ações', ld('../simulador_d2/results', 'guloso15_c2'));
add('Guloso 15 min, só desobstruir', ld('../simulador_d2/results', 'guloso15_d'));
for (const H of [60, 180, 360]) { add(`Guloso olhando ${H / 60} h, 5 ações`, ld('results', `guloso_h${H}_c2`)); add(`Guloso olhando ${H / 60} h, só desobstruir`, ld('results', `guloso_h${H}_d`)); }
const RG = ld('results', 'regras'); if (RG.length) for (const nm of Object.keys(RG[0].m)) M[nm] = new Map(RG.map(r => [key(r), r.m[nm]]));
const KEYS = [...base.keys()].filter(k => Object.values(M).every(m => m.has(k)));
const kpi = (nm, k) => M[nm].get(k).kpi;
let md = `# Análise das causas — por que o RL vence o Guloso no cenário D\n\nTudo nos mesmos ${KEYS.length / 4} cenários de teste × K ∈ {1, 3, 5, 10} = ${KEYS.length} episódios. KPI = horas até ≥ 80% dos 630 sentidos estáveis (13 = não estabilizou); menor é melhor. Nada aqui foi treinado: as políticas aprendidas são as do D.\n\n`;
// ---------- 1. tabela geral ----------
md += `## 1. Tempo até estabilizar (média, horas)\n\n| Método | K=1 | K=3 | K=5 | K=10 | Média | Ações usadas |\n|---|---|---|---|---|---|---|\n`;
for (const nm of Object.keys(M)) md += `| ${nm} | ${KS.map(K => f2(mean(KEYS.filter(k => k.endsWith(':' + K)).map(k => kpi(nm, k))))).join(' | ')} | **${f2(mean(KEYS.map(k => kpi(nm, k))))}** | ${f2(mean(KEYS.map(k => M[nm].get(k).used)))} |\n`;
// ---------- 2. contrastes ----------
const C = (a, b) => { const p = paired(KEYS.map(k => kpi(a, k) - kpi(b, k))); return `| ${a} − ${b} | ${sg(p.mean)} h | ${sg(p.lo)} a ${sg(p.hi)} | ${Math.round(100 * p.win)}% / ${Math.round(100 * p.tie)}% / ${Math.round(100 * p.loss)}% |\n`; };
md += `\n## 2. Contrastes pareados (negativo = o primeiro foi mais rápido)\n\n| Contraste | Diferença | IC 95% | Melhor / empate / pior |\n|---|---|---|---|\n`;
const regras = Object.keys(M).filter(n => n.startsWith('Regra'));
md += `| **Regras simples × RL e × Guloso** | | | |\n`;
for (const r of regras) for (const b of ['D1-DDQN', 'D2P-Q1', 'Guloso 15 min, 5 ações']) md += C(r, b);
md += `| **Guloso olhando mais longe** | | | |\n`;
for (const w of ['5 ações', 'só desobstruir']) for (const H of [180, 360]) { const a = `Guloso olhando ${H / 60} h, ${w}`, b0 = `Guloso olhando 1 h, ${w}`; if (M[a] && M[b0]) { md += C(a, b0); md += C(a, 'D1-DDQN'); } }
if (M['Guloso olhando 1 h, 5 ações']) md += C('Guloso olhando 1 h, 5 ações', 'Guloso 60 min, 5 ações');
// ---------- 3. auditoria ----------
const A = ld('results', 'auditoria');
if (A.length) {
  const HZ = [15, 30, 60, 120, 180, 360], lab = a => a.type === 'DESOB' ? `Desobstruir ${a.cls}` : 'Esperar';
  const rows = A.map(s => { const w = s.acts.find(a => a.type === 'WAIT'), g = (a, h) => (a.res[h] && w.res[h]) ? a.res[h].C - w.res[h].C : 0;
    const best = h => s.acts.reduce((p, q) => (g(q, h) > g(p, h) + 1e-12 || (Math.abs(g(q, h) - g(p, h)) <= 1e-12 && (q.res[h] || {}).vh < (p.res[h] || {}).vh)) ? q : p);
    const b = Object.fromEntries(HZ.map(h => [h, best(h)])), reg = h => g(b[h], h) - g(b[60], h);
    return { s, g, b, inv180: b[60] !== b[180] && reg(180) >= 0.01, inv360: b[60] !== b[360] && reg(360) >= 0.01,
      atr180: s.acts.some(a => a.type !== 'WAIT' && g(a, 60) <= 0 && g(a, 180) >= 0.02), atr360: s.acts.some(a => a.type !== 'WAIT' && g(a, 60) <= 0 && g(a, 360) >= 0.02),
      gmax: Object.fromEntries(HZ.map(h => [h, g(b[h], h)])) }; });
  md += `\n## 3. Auditoria no ambiente do D (só esperar ou desobstruir)\n\n${rows.length} estados (início, +60 e +120 min só esperando, quando ainda instáveis). Cada ação é aplicada e depois só se espera. Ganho = fração estável com a ação − fração estável esperando, em pontos percentuais (pp).\n\n`;
  md += `| Indicador | 60 × 180 min | 60 × 360 min |\n|---|---|---|\n| Inversão: a melhor ação no horizonte longo é outra (≥ 1 pp) | ${pc(mean(rows.map(r => +r.inv180)))} | ${pc(mean(rows.map(r => +r.inv360)))} |\n| Benefício atrasado: desobstrução sem ganho em 60 min e ≥ 2 pp depois | ${pc(mean(rows.map(r => +r.atr180)))} | ${pc(mean(rows.map(r => +r.atr360)))} |\n\n`;
  md += `**Ganho médio da melhor ação sobre esperar (pp):** ${HZ.map(h => `${h} min: ${f2(100 * mean(rows.map(r => r.gmax[h])))}`).join(' · ')}\n\n`;
  md += `**Ganho médio de desobstruir, por tipo (pp, média sobre todas as obstruções desobstruíveis):**\n\n| Tipo | ${HZ.map(h => h + ' min').join(' | ')} | Nº |\n|---|${HZ.map(() => '---').join('|')}|---|\n`;
  for (const cls of ['acidente', 'barreira', 'estrutura']) { const L = rows.flatMap(r => r.s.acts.filter(a => a.cls === cls).map(a => r.g.bind(null, a)));
    md += `| ${cls} | ${HZ.map(h => f2(100 * mean(L.map(f => f(h))))).join(' | ')} | ${L.length} |\n`; }
  md += `\n**Melhor ação em cada horizonte (nº de estados):**\n\n| Ação | 60 min | 180 min | 360 min |\n|---|---|---|---|\n`;
  for (const l of ['Esperar', 'Desobstruir acidente', 'Desobstruir barreira', 'Desobstruir estrutura']) md += `| ${l} | ${[60, 180, 360].map(h => rows.filter(r => lab(r.b[h]) === l).length).join(' | ')} |\n`;
}
// ---------- 4. o que cada política desobstrui ----------
md += `\n## 4. O que cada política desobstrui (todos os ${KEYS.length} episódios)\n\n| Política | Desobstruções por episódio | Acidente | Barreira | Estrutura | Na 1ª hora | Hora média da 1ª desobstrução | Fluxo médio (percentil) |\n|---|---|---|---|---|---|---|---|\n`;
for (const nm of ['D1-Q1', 'D1-DDQN', 'D2L-DDQN', 'D2P-Q1', 'Aleatória', ...regras]) {
  const des = [], first = [];
  for (const k of KEYS) { const r = M[nm].get(k), evs = base.get(k).evs, eps = (r.epochs || []).filter(e => e.type === 'DESOB');
    if (eps.length) first.push(eps[0].m * 15 / 60);
    for (const e of eps) { const v = evs.find(z => z.i === e.ev); if (v) des.push({ cls: v.cls, m: e.m, fx: E.importance({ e: v.e, fr: 0.5 }).fluxo }); } }
  const n = des.length, sh = c => n ? des.filter(d => d.cls === c).length / n : NaN;
  md += `| ${nm} | ${f2(n / KEYS.length)} | ${pc(sh('acidente'))} | ${pc(sh('barreira'))} | ${pc(sh('estrutura'))} | ${pc(n ? des.filter(d => d.m < 4).length / n : NaN)} | ${f2(mean(first))} h | ${f2(100 * mean(des.map(d => d.fx)))} |\n`;
}
md += `\nObstruções disponíveis no teste (todas): ${(() => { const all = KEYS.filter(k => k.endsWith(':1')).flatMap(k => base.get(k).evs); const n = all.length; return ['acidente', 'barreira', 'estrutura', 'agua'].map(c => `${c} ${pc(all.filter(v => v.cls === c).length / n)}`).join(', '); })()}.\n`;
// ---------- 5. onde o RL vence ----------
const G = 'Guloso 15 min, 5 ações', R = 'D1-DDQN';
md += `\n## 5. Onde o RL vence: ${R} − ${G}, por tipo de episódio\n\n| Grupo | Episódios | Diferença média | IC 95% | Melhor / empate / pior |\n|---|---|---|---|---|\n`;
const grupo = (nome, f) => { const ks = KEYS.filter(f); if (ks.length < 8) return; const p = paired(ks.map(k => kpi(R, k) - kpi(G, k)));
  md += `| ${nome} | ${ks.length} | ${sg(p.mean)} h | ${sg(p.lo)} a ${sg(p.hi)} | ${Math.round(100 * p.win)}% / ${Math.round(100 * p.tie)}% / ${Math.round(100 * p.loss)}% |\n`; };
const longas = k => base.get(k).evs.filter(v => v.cls === 'barreira' || v.cls === 'estrutura').length;
for (const K of KS) grupo(`K = ${K}`, k => k.endsWith(':' + K));
grupo('4 a 6 obstruções', k => base.get(k).n <= 6); grupo('7 a 9 obstruções', k => base.get(k).n >= 7 && base.get(k).n <= 9); grupo('10 a 12 obstruções', k => base.get(k).n >= 10);
grupo('0 ou 1 obstrução de remoção longa (barreira/estrutura)', k => longas(k) <= 1); grupo('2 ou 3 de remoção longa', k => longas(k) >= 2 && longas(k) <= 3); grupo('4 ou mais de remoção longa', k => longas(k) >= 4);
grupo('Estabilidade inicial < 70%', k => base.get(k).stab0 < 0.70); grupo('Estabilidade inicial 70% a 75%', k => base.get(k).stab0 >= 0.70 && base.get(k).stab0 < 0.75); grupo('Estabilidade inicial ≥ 75%', k => base.get(k).stab0 >= 0.75);
md += `\nRegras e limiares (1 pp, 2 pp, horizontes, faixas dos grupos) são escolhas desta análise, não ajustadas aos resultados.\n`;
fs.writeFileSync('RESULTADOS_CAUSAS.md', md); console.log('ok RESULTADOS_CAUSAS.md');
