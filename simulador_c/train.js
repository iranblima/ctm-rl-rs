// Cenário C — treino do Dueling DDQN MLP (22 atributos): node train.js <semente> <episódios> [--log N]
// Observação da rede inteira (630 sentidos de trecho).
// Cenários: 300 de treino e 40 de validação, sorteados e independentes (sementes em env.js, SEEDS).
// Grava:
//   results/ckpt_<semente>.json      checkpoints a cada 300 episódios, com KPI e veículo-hora na validação
//   results/train_log_<semente>.jsonl uma linha a cada N episódios (padrão 50): retorno, KPI, ε, erro da rede…
//   results/.training_<semente>.lock  existe enquanto o treino roda (o monitor e o reset leem)
process.chdir(__dirname);
'use strict';
const E = require('./env.js'), { Net, makePolicy, rng } = require('./rl.js'), fs = require('fs');
const args = process.argv.slice(2);
const seed = +args[0], EPIS = +args[1];
const LOGN = args.includes('--log') ? +args[args.indexOf('--log') + 1] : 50;
if (!Number.isFinite(seed) || !Number.isFinite(EPIS)) { console.error('uso: node train.js <semente> <episódios> [--log N]'); process.exit(1); }
const CK = 300, GAMMA = 0.95, KS = [1, 3, 5, 10];
const TAG = 'total', EPS0 = 1, LR = 1e-3;
const RD = `results/${TAG}`; fs.mkdirSync(RD, { recursive: true });
const LOCK = `${RD}/.training_${seed}.lock`, LOG = `${RD}/train_log_${seed}.jsonl`;
if (fs.existsSync(LOCK)) {
  const pid = +fs.readFileSync(LOCK, 'utf8').split('\n')[0];
  let alive = false; try { process.kill(pid, 0); alive = true; } catch (e) { /* processo antigo já terminou */ }
  if (alive) { console.error(`Já existe um treino da semente ${seed} rodando (processo ${pid}).`); process.exit(1); }
}
fs.writeFileSync(LOCK, `${process.pid}\n${new Date().toISOString()}\n${EPIS}`);
const unlock = () => { try { fs.unlinkSync(LOCK); } catch (e) { } };
process.on('exit', unlock); process.on('SIGINT', () => process.exit(130)); process.on('SIGTERM', () => process.exit(143));
fs.writeFileSync(LOG, '');
fs.writeFileSync(`${RD}/ckpt_${seed}.json`, '[]');   // um treino novo substitui os checkpoints desta semente (o reset traz os de referência de volta)

const NTR = 300, NVA = 40;
console.log('gerando cenários de treino e validação…');
const TR = Array.from({ length: NTR }, (_, i) => E.scenario(E.SEEDS.treino(i))), VA = Array.from({ length: NVA }, (_, i) => E.scenario(E.SEEDS.validacao(i)));
const r = rng(seed * 31 + 3), net = new Net(seed);
let tgt = net.copy();
const buf = [], prio = [], CAP = 20000, T0 = Date.now(), ckpts = [];
function evalVal(pol) { let k = 0, v = 0, c = 0; for (const st of VA) for (const K of KS) { const o = E.runEpisode(st, K, pol); k += o.kpi; v += o.vh; c++; } return { kpi: k / c, vh: v / c }; }
// acumuladores da janela de registro
let W = { n: 0, ret: 0, kpi: 0, act: 0, loss: 0, nl: 0 };
console.log(`[${TAG}] semente ${seed}: ${EPIS} episódios, ${TR.length} cenários de treino, ${VA.length} de validação; registro a cada ${LOGN}`);
for (let epi = 0; epi < EPIS; epi++) {
  const eps = Math.max(0.05, EPS0 - (EPS0 - 0.05) * epi / (0.6 * EPIS));
  const st = TR[Math.floor(r() * TR.length)], K = KS[Math.floor(r() * KS.length)];
  const ep = new E.Ep(st, K);
  if (!ep.done) {
    let C = ep.legal(), X = ep.feats(C), ret = 0;
    for (let h = 0; h < E.H && !ep.done; h++) {
      let a; if (r() < eps) a = Math.floor(r() * C.length); else { const { Q } = net.fwd(X); a = Q.indexOf(Math.max(...Q)); }
      ep.apply(C[a]); const rew = ep.advance(); ret += rew;
      let X2 = null, C2 = null; if (!ep.done && h < E.H - 1) { C2 = ep.legal(); X2 = ep.feats(C2); }
      const tr = { X, a, r: rew, X2 };
      if (buf.length < CAP) { buf.push(tr); prio.push(1); } else { const j = Math.floor(r() * CAP); buf[j] = tr; prio[j] = 1; }
      if (buf.length >= 256) {
        const pr = prio.map(p => p ** 0.6), tot = pr.reduce((a, b) => a + b, 0), batch = [];
        for (let b = 0; b < 32; b++) { let u = r() * tot, j = 0; while (u > pr[j] && j < pr.length - 1) { u -= pr[j]; j++; }
          const t = buf[j]; let y = t.r;
          if (t.X2) { const qo = net.fwd(t.X2).Q, qt = tgt.fwd(t.X2).Q; y += GAMMA * qt[qo.indexOf(Math.max(...qo))]; }
          prio[j] = Math.abs(net.fwd(t.X).Q[t.a] - y) + 1e-3; batch.push({ X: t.X, a: t.a, y }); }
        W.loss += net.trainBatch(batch, LR); W.nl++;
        if (net.t % 200 === 0) tgt = net.copy();
      }
      if (X2) { X = X2; C = C2; }
    }
    W.n++; W.ret += ret; W.kpi += ep.kpi == null ? E.H + 1 : ep.kpi; W.act += ep.K - ep.left;
  }
  if ((epi + 1) % LOGN === 0) {
    const row = { ep: epi + 1, eps: +eps.toFixed(4), ret: W.n ? W.ret / W.n : null, kpi: W.n ? W.kpi / W.n : null, acts: W.n ? W.act / W.n : null,
      loss: W.nl ? W.loss / W.nl : null, buffer: buf.length, updates: net.t, min: (Date.now() - T0) / 60000, total: EPIS };
    fs.appendFileSync(LOG, JSON.stringify(row) + '\n');
    W = { n: 0, ret: 0, kpi: 0, act: 0, loss: 0, nl: 0 };
  }
  if ((epi + 1) % CK === 0) {
    const v = evalVal(makePolicy(net));
    ckpts.push({ seed, ep: epi + 1, ...v, net: net.toJSON() });
    console.log(`semente ${seed} ep ${epi + 1} validação: KPI ${v.kpi.toFixed(3)} h, ${v.vh.toFixed(0)} v·h (${((Date.now() - T0) / 60000).toFixed(1)} min)`);
    fs.writeFileSync(`${RD}/ckpt_${seed}.json`, JSON.stringify(ckpts));
  }
}
console.log(`semente ${seed}: fim. Próximo passo: node select.js`);
