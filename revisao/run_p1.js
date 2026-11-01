// P1 — roda o teste de feedback (replanejar × plano fixo) e gera revisao/RESULTADOS_P1.md: node revisao/run_p1.js
// Sem treino: usa as redes D1-Q1 e D1-DDQN já escolhidas no cenário D. Pode interromper e rodar de novo (partes prontas são puladas).
process.chdir(__dirname);
'use strict';
const fs = require('fs'), os = require('os'), { spawn } = require('child_process'), S = require('./estat.js');
fs.mkdirSync('results', { recursive: true });
const NP = 8, JOBS = Math.max(2, Math.min(16, os.cpus().length - 2)), fila = [];
for (const cond of ['novas', 'det']) for (const cal of [15, 60]) for (let p = 0; p < NP; p++) if (!fs.existsSync(`results/p1_${cond}_${cal}_${p}.json`)) fila.push([cond, cal, p]);
const t0 = Date.now(), log = s => { const l = `[${new Date().toLocaleTimeString()}] ${s}`; console.log(l); fs.appendFileSync('results/progresso_p1.log', l + '\n'); };
log(`P1: ${fila.length} partes pendentes, ${JOBS} em paralelo.`);
let ativos = 0, feitos = 0; const total = fila.length;
function prox(fim) {
  if (!fila.length) { if (!ativos) fim(); return; }
  const [cond, cal, p] = fila.shift(); ativos++; const t1 = Date.now(), out = fs.openSync(`results/p1_${cond}_${cal}_${p}.out`, 'w');
  spawn(process.execPath, ['p1.js', cond, String(cal), String(p), String(NP)], { stdio: ['ignore', out, out] }).on('exit', c => { ativos--; feitos++;
    log(`  ${cond} ${cal} min parte ${p} ${c === 0 ? 'ok' : 'ERRO ' + c} (${((Date.now() - t1) / 60000).toFixed(1)} min) — ${feitos}/${total}`); prox(fim); });
}
new Promise(r => { for (let j = 0; j < JOBS; j++) prox(r); }).then(() => { tabela(); log(`Pronto em ${((Date.now() - t0) / 60000).toFixed(0)} min. Resultados: revisao/RESULTADOS_P1.md`); });

function tabela() {
  const KS = [1, 3, 5, 10], POL = ['D1-Q1', 'D1-DDQN'];
  let md = `# P1 — feedback sequencial: replanejar × plano fixo (mesma política)\n\nCada política aprendida (D1-Q1 e D1-DDQN do cenário D, sem novo treino) é comparada **com ela mesma**: **replanejar** (a cada decisão recebe a observação nova do tráfego) × **plano fixo** (a observação do tráfego fica congelada no início; só relógio, orçamento e tempo desde o início de cada obstrução são atualizados, então o plano todo é determinado em t0). Calendário fixo de decisões, igual nos dois modos. Só esperar/desobstruir. 100 cenários de teste × K ∈ {1,3,5,10}. IC 95% por bootstrap agrupado por cenário.\n\n**Condições:** *determinística* = cenários do D sem mudança (a política já não conhece o tempo exato de remoção nem as filas). *Novas obstruções* = os mesmos cenários + 1 a 4 obstruções que começam entre 30 min e 6 h depois da primeira decisão, desconhecidas no início.\n\n`;
  for (const cond of ['det', 'novas']) for (const cal of [60, 15]) {
    const R = fs.readdirSync('results').filter(f => new RegExp(`^p1_${cond}_${cal}_\\d+\\.json$`).test(f)).flatMap(f => JSON.parse(fs.readFileSync(`results/${f}`)));
    if (!R.length) continue;
    const g = (k, r) => r.m[k], mean = S.mean;
    md += `## ${cond === 'det' ? 'Determinística' : 'Com novas obstruções'}, decisão a cada ${cal} min\n\n| Política · modo | K=1 | K=3 | K=5 | K=10 | Média | Não estabilizou | Desobstruções/episódio | Planejadas já inviáveis | Novas desobstruídas |\n|---|---|---|---|---|---|---|---|---|---|\n`;
    for (const P of POL) for (const modo of ['replanejar', 'plano fixo']) { const k = `${P} · ${modo}`;
      md += `| ${k} | ${KS.map(K => S.f2(mean(R.filter(r => r.K === K).map(r => g(k, r).kpi)))).join(' | ')} | **${S.f2(mean(R.map(r => g(k, r).kpi)))}** | ${S.pc(mean(R.map(r => +(g(k, r).kpi > 12))))} | ${S.f2(mean(R.map(r => g(k, r).desob)))} | ${S.f2(mean(R.map(r => g(k, r).inviaveis)))} | ${cond === 'novas' ? S.f2(mean(R.map(r => g(k, r).desobNovas))) : '—'} |\n`; }
    md += `\n| Comparação | Diferença | IC 95% | Significativo? | Melhor / empate / pior |\n|---|---|---|---|---|\n`;
    const C = (a, b) => { const c = S.bootCenario(R.map(r => ({ i: r.i, d: g(a, r).kpi - g(b, r).kpi }))); md += `| ${a} − ${b} | ${S.sg(c.mean)} h | ${S.ic(c)} | ${S.sig(c)} | ${Math.round(100 * c.win)}% / ${Math.round(100 * c.tie)}% / ${Math.round(100 * c.loss)}% |\n`; };
    for (const P of POL) C(`${P} · replanejar`, `${P} · plano fixo`);
    C('D1-DDQN · replanejar', 'D1-Q1 · replanejar'); C('D1-DDQN · plano fixo', 'D1-Q1 · plano fixo');
    const di = R.map(r => ({ i: r.i, d: (g('D1-DDQN · plano fixo', r).kpi - g('D1-DDQN · replanejar', r).kpi) - (g('D1-Q1 · plano fixo', r).kpi - g('D1-Q1 · replanejar', r).kpi) })), ci = S.bootCenario(di);
    md += `| Perda do DDQN sem feedback − perda do Q1 sem feedback | ${S.sg(ci.mean)} h | ${S.ic(ci)} | ${S.sig(ci)} | |\n\n`;
  }
  md += `Negativo em "replanejar − plano fixo" = o feedback ajudou. A última linha de cada tabela mede se o DDQN perde menos que o Q1 ao ficar sem feedback (negativo = o retorno futuro protege quando não dá para replanejar). As novas obstruções, o plano fixo e o calendário são escolhas desta análise, declaradas antes de ver os resultados.\n`;
  fs.writeFileSync('RESULTADOS_P1.md', md);
}
