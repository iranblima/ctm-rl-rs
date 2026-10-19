// Etapa 0 do porte: grava a referência do simulador em Node para conferir a versão em Python.
//   node testes/gerar_referencia.js              grava em testes/referencia/
//   node testes/gerar_referencia.js <pasta>      grava em outra pasta
//   node testes/gerar_referencia.js --conferir   gera tudo em memória e compara com testes/referencia/SHA256SUMS
// Só lê o simulador (simulador/env.js, rl.js, sim.js) e os arquivos de entrada; não altera nada fora da pasta de saída.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const E = require(path.join(ROOT, 'simulador', 'env.js'));
const { Net, makePolicy } = require(path.join(ROOT, 'simulador', 'rl.js'));

const CONFERIR = process.argv.includes('--conferir');
const OUT = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(__dirname, 'referencia'));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const SEL_PATH = path.join(ROOT, 'simulador', 'results', 'selected.json');
const INPUTS = {
  'data/derived/rsdata.json': path.join(ROOT, 'data', 'derived', 'rsdata.json'),
  'simulador/results/scan.json': path.join(ROOT, 'simulador', 'results', 'scan.json'),
  'simulador/results/selected.json': SEL_PATH,
};
const sel = JSON.parse(fs.readFileSync(SEL_PATH)); const net = Net.from(sel.net);
const sim = E.sim, Ks = [1, 3, 5, 10];
const files = {};

// ---------- 1. fluxos horários do replay real (mesmo laço de env.js:starts()) ----------
// T0 = 1,5 dia está repetido aqui porque env.js não o exporta (pendência 10 do CLAUDE.md).
const T0 = 1.5 * 1440;
const cand = E.SCAN.info.filter(x => x.stab < E.THR).map(x => x.t);
sim.reset(T0); sim.S.real = true;
sim.setEvents(sim.SITES.map(s => ({ i: s.idx, s: s.s, f: s.f, cells: s.cells })));
const replay = [];
while (sim.S.t < cand[cand.length - 1]) {
  sim.run(60);
  const t = sim.S.t, fl = sim.hourFlows(), ref = E.SCAN.ref[Math.round((t - T0) / 60) - 1];
  let st = 0, n = 0; fl.forEach((v, j) => { if (ref[j] < 5) return; n++; if (Math.abs(v - ref[j]) <= Math.max(0.2 * ref[j], 30)) st++; });
  replay.push({ t, fluxos: fl, ativas: sim.S.ev.filter(e => e.on).map(e => e.i), stab: n ? st / n : 1 });
}
files['replay_fluxos.json'] = { T0, nPostos: sim.STATIONS.length, horas: replay };

// ---------- 2. instantes de início ----------
const ALL = E.starts();
const n = ALL.length, ntr = Math.round(0.6 * n), nva = Math.round(0.2 * n);
const parte = i => i < ntr ? 'treino' : i < ntr + nva ? 'validacao' : 'teste';
// conferência interna: o histórico guardado em cada início tem de bater com o replay acima
for (const st of ALL) {
  const k = replay.findIndex(r => r.t === st.t);
  const esp = replay.slice(Math.max(0, k - 2), k + 1).map(r => r.fluxos);
  if (k < 0 || JSON.stringify(esp) !== JSON.stringify(st.hist)) throw new Error(`replay diverge de starts() em t=${st.t}`);
}
files['inicios.json'] = { n, ntr, nva, nte: n - ntr - nva, inicios: ALL.map((st, i) => ({ i, t: st.t, parte: parte(i), stab0: st.stab0 })) };

// ---------- 3. episódios passo a passo ----------
// Grava, a cada hora: candidatos legais, 18 atributos, Q da rede escolhida (para os três métodos), decisão e recompensa.
// Para Esperar e Guloso, o Q é só diagnóstico (a rede não decide); serve para conferir a rede portada em mais estados.
function gravar(st, K, metodo) {
  const base = metodo === 'wait' ? E.P.wait : metodo === 'greedy' ? E.P.greedy : makePolicy(net);
  const passos = []; let dentro = false, atual = null;
  const pol = (ep, C, qs) => {
    if (!ep.__gravando) { // embrulha advance() desta instância; ignora as simulações de olhar à frente do Guloso
      const adv = ep.advance.bind(ep); ep.__gravando = true;
      ep.advance = () => { const r = adv(); if (!dentro && atual) { Object.assign(atual, { recompensa: r, stab: ep.stab, vh: ep.vh, fluxos: ep.hist[ep.hist.length - 1].slice(), feito: ep.done }); atual = null; } return r; };
    }
    const X = ep.feats(C), { Q } = net.fwd(X);
    atual = { h: ep.h, t: sim.S.t, orcamento: ep.left, candidatos: C.map(c => ({ ...ep.desc(c), score: c.score ?? null })), atributos: X, Q };
    dentro = true; const c = metodo === 'ddqn' ? base(ep, C, qs) : base(ep, C); dentro = false;
    atual.decisao = C.indexOf(c); if (atual.decisao < 0) throw new Error('decisão fora da lista de candidatos');
    passos.push(atual); return c;
  };
  const qs = [];
  const o = E.runEpisode(st, K, metodo === 'ddqn' ? (ep, C) => pol(ep, C, qs) : pol);
  return { kpi: o.kpi, censored: o.censored, sustained: o.sustained, unstable: o.unstable, vh: o.vh, used: o.used, stabs: o.stabs, log: o.log, passos };
}
// 5 instantes de validação espaçados por igual (escolha desta etapa: primeiro, último e três intermediários)
const VA = ALL.slice(ntr, ntr + nva);
const vaIdx = [0, 1, 2, 3, 4].map(k => Math.round(k * (nva - 1) / 4));
const eps = [];
for (const vi of vaIdx) for (const K of Ks) for (const m of ['wait', 'greedy', 'ddqn']) {
  const r = gravar(VA[vi], K, m);
  eps.push({ inicio: ntr + vi, validacao: vi, t: VA[vi].t, K, metodo: m, ...r });
  console.log(`validação ${vi} t=${VA[vi].t} K=${K} ${m}: ${r.kpi} h, ${Math.round(r.vh)} v·h, ${r.used} ações`);
}
files['episodios_validacao.json'] = { modelo: { seed: sel.seed, ep: sel.ep }, metodos: { wait: 'Esperar', greedy: 'Guloso (Greedy MC)', ddqn: 'Dueling DDQN MLP (método proposto)' }, episodios: eps };

// ---------- 4. verificação rápida do CLAUDE.md: momento de teste 0, K = 3 ----------
const TE0 = ALL[ntr + nva];
const ESP = { wait: [8, 9223], greedy: [4, 8048], ddqn: [7, 8800] };
const vr = {}; let ok = true;
for (const m of ['wait', 'greedy', 'ddqn']) {
  const o = E.runEpisode(TE0, 3, m === 'wait' ? E.P.wait : m === 'greedy' ? E.P.greedy : makePolicy(net));
  vr[m] = { kpi: o.kpi, vh: o.vh, log: o.log };
  const bate = o.kpi === ESP[m][0] && Math.round(o.vh) === ESP[m][1]; ok = ok && bate;
  console.log(`verificação rápida ${m}: ${o.kpi} h, ${Math.round(o.vh)} v·h (esperado ${ESP[m][0]} h, ${ESP[m][1]} v·h) ${bate ? 'OK' : 'DIFERENTE'}`);
}
files['verificacao_rapida.json'] = { inicio: ntr + nva, t: TE0.t, K: 3, ...vr };
if (!ok) { console.error('A verificação rápida não bate com o CLAUDE.md.'); process.exitCode = 1; }

// ---------- entradas usadas (para saber de onde veio uma diferença) ----------
files['entradas.json'] = Object.fromEntries(Object.entries(INPUTS).map(([k, p]) => [k, sha(fs.readFileSync(p))]));

// ---------- gravar ou conferir ----------
const txt = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, JSON.stringify(v)]));
const sums = Object.keys(txt).sort().map(k => `${sha(txt[k])}  ${k}`).join('\n') + '\n';
if (CONFERIR) {
  const ref = fs.readFileSync(path.join(__dirname, 'referencia', 'SHA256SUMS'), 'utf8');
  const ler = s => new Map(s.split(/\r?\n/).filter(l => l.trim()).map(l => l.trim().split(/\s+/).reverse()));   // aceita quebra de linha do Windows
  const a = ler(ref), b = ler(sums);
  let iguais = true;
  for (const k of new Set([...a.keys(), ...b.keys()])) { const eq = a.get(k) === b.get(k); iguais = iguais && eq; console.log(`${eq ? 'igual    ' : 'DIFERENTE'} ${k}`); }
  console.log(iguais ? 'Referência reproduzida.' : 'A referência NÃO foi reproduzida.');
  if (!iguais) process.exitCode = 1;
} else {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [k, v] of Object.entries(txt)) fs.writeFileSync(path.join(OUT, k), v);
  fs.writeFileSync(path.join(OUT, 'SHA256SUMS'), sums);
  process.stdout.write(`\nGravado em ${OUT}\n${sums}`);
}
