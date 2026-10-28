// Cenário C2 — resume a auditoria offline: results/auditoria.json e AUDITORIA_C2.md
// Definições (limiares são suposições, declaradas aqui):
//   ganho(a, h) = fração estável com a ação a − fração estável esperando, h minutos depois.
//   melhor imediata = ação de maior ganho em 60 min (empate: menos veículo-hora); melhor de longo prazo = maior ganho em 180 min.
//   inversão = a melhor de longo prazo é outra ação e supera a melhor imediata em ≥ 1 ponto percentual (pp) em 180 min.
//   benefício atrasado = existe ação com ganho ≤ 0 em 60 min e ≥ 2 pp em 180 min.
//   arrependimento míope = ganho(melhor de longo prazo, 180) − ganho(melhor imediata, 180).
process.chdir(__dirname);
const fs = require('fs');
const S = fs.readdirSync('results').filter(f => /^auditoria_\d+\.json$/.test(f)).flatMap(f => JSON.parse(fs.readFileSync(`results/${f}`)));
const H = [15, 30, 60, 120, 180], mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN, f2 = v => (v * 100).toFixed(1).replace('.', ',');
const lab = a => a.type === 'DESOB' ? `DESOB ${a.cls}` : a.type;
const rows = S.map(s => {
  const w = s.acts.find(a => a.type === 'WAIT');
  const g = (a, h) => a.res[h].C - w.res[h].C;
  const best = h => s.acts.reduce((x, y) => (g(y, h) > g(x, h) + 1e-12 || (Math.abs(g(y, h) - g(x, h)) <= 1e-12 && y.res[h].vh < x.res[h].vh)) ? y : x);
  const b60 = best(60), b180 = best(180), b15 = best(15);
  const regret = g(b180, 180) - g(b60, 180), regret15 = g(b180, 180) - g(b15, 180);
  const delayed = s.acts.filter(a => a.type !== 'WAIT' && g(a, 60) <= 0 && g(a, 180) >= 0.02);
  return { i: s.i, pre: s.pre, C0: s.C0, n: s.acts.length, ganhoMax: Object.fromEntries(H.map(h => [h, g(best(h), h)])), b60: lab(b60), b180: lab(b180), b15: lab(b15),
    inversao: b60 !== b180 && regret >= 0.01, inversao15: b15 !== b180 && regret15 >= 0.01, regret, regret15, atrasado: delayed.length > 0, atrasadoTipos: delayed.map(lab) };
});
const n = rows.length, cnt = (arr, k) => { const o = {}; arr.forEach(r => { o[r[k]] = (o[r[k]] || 0) + 1; }); return o; };
const tipos = {}; rows.forEach(r => r.atrasadoTipos.forEach(t => { tipos[t] = (tipos[t] || 0) + 1; }));
const byPre = [0, 60, 120].map(p => { const rr = rows.filter(r => r.pre === p); return { pre: p, n: rr.length, inversao: mean(rr.map(r => +r.inversao)), atrasado: mean(rr.map(r => +r.atrasado)), regret: mean(rr.map(r => r.regret)) }; });
const sum = { estados: n, acoesPorEstado: mean(rows.map(r => r.n)), ganhoMaxMedio: Object.fromEntries(H.map(h => [h, mean(rows.map(r => r.ganhoMax[h]))])),
  taxaInversao60: mean(rows.map(r => +r.inversao)), taxaInversao15: mean(rows.map(r => +r.inversao15)), arrependimentoMedio60: mean(rows.map(r => r.regret)), arrependimentoMedio15: mean(rows.map(r => r.regret15)),
  arrependimentoP90: rows.map(r => r.regret).sort((a, b) => a - b)[Math.floor(0.9 * n)], taxaBeneficioAtrasado: mean(rows.map(r => +r.atrasado)), acoesComBeneficioAtrasado: tipos,
  melhorImediata: cnt(rows, 'b60'), melhorLongoPrazo: cnt(rows, 'b180'), porMomento: byPre };
fs.writeFileSync('results/auditoria.json', JSON.stringify({ resumo: sum, estados: rows }, null, 1));
let md = `# Cenário C2 — auditoria offline de temporalidade\n\n${n} estados (100 cenários de teste novos, no início e depois de 60 e 120 min só esperando, quando ainda instáveis); em média ${sum.acoesPorEstado.toFixed(1).replace('.', ',')} ações por estado. Cada ação é aplicada e depois só se espera; o CTM não é usado por nenhuma política.\n\n`;
md += `## Ganho da melhor ação sobre esperar (pontos percentuais de trechos estáveis)\n\n| Horizonte | 15 min | 30 min | 60 min | 120 min | 180 min |\n|---|---|---|---|---|---|\n| Ganho médio da melhor ação | ${H.map(h => f2(sum.ganhoMaxMedio[h])).join(' | ')} |\n\n`;
md += `## Indicadores de temporalidade\n\n| Indicador | Valor |\n|---|---|\n| Inversão: melhor ação em 180 min ≠ melhor em 60 min (diferença ≥ 1 pp) | ${f2(sum.taxaInversao60)}% dos estados |\n| Inversão: melhor ação em 180 min ≠ melhor em 15 min (diferença ≥ 1 pp) | ${f2(sum.taxaInversao15)}% dos estados |\n| Benefício atrasado: ação sem ganho em 60 min e com ≥ 2 pp em 180 min | ${f2(sum.taxaBeneficioAtrasado)}% dos estados |\n| Arrependimento míope médio (escolher a melhor de 60 min), em 180 min | ${f2(sum.arrependimentoMedio60)} pp |\n| Arrependimento míope no 90º percentil | ${f2(sum.arrependimentoP90)} pp |\n\n`;
md += `## Por momento do estado auditado\n\n| Momento | Estados | Inversão | Benefício atrasado | Arrependimento médio |\n|---|---|---|---|---|\n`;
for (const b of byPre) md += `| ${b.pre} min | ${b.n} | ${f2(b.inversao)}% | ${f2(b.atrasado)}% | ${f2(b.regret)} pp |\n`;
md += `\n## Que ações têm benefício atrasado\n\n| Ação | Estados |\n|---|---|\n${Object.entries(tipos).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\n`;
md += `## Melhor ação em 60 min × em 180 min\n\n| Ação | Melhor em 60 min | Melhor em 180 min |\n|---|---|---|\n`;
for (const k of [...new Set([...Object.keys(sum.melhorImediata), ...Object.keys(sum.melhorLongoPrazo)])]) md += `| ${k} | ${sum.melhorImediata[k] || 0} | ${sum.melhorLongoPrazo[k] || 0} |\n`;
md += `\nLimiares (1 pp para inversão, 2 pp para benefício atrasado) e a continuação "só esperar" são suposições desta auditoria. A estabilidade usa a janela móvel de 1 h, então em 15 e 30 min o efeito de uma ação aparece só em parte; a comparação mais justa é 60 × 180 min.\n`;
fs.writeFileSync('AUDITORIA_C2.md', md); console.log(md);
