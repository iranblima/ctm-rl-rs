// Cenário C2 — treino: node train.js <M0..M5> <semente> <episódios> [--log N]
// Grava em results/<config>/: ckpt_<semente>.json (checkpoints a cada 300 episódios, com KPI e veículo-hora na validação)
// e train_log_<semente>.jsonl (uma linha a cada N episódios).
process.chdir(__dirname);
'use strict';
const E = require('./env.js'), { Net, makePolicy, rng } = require('./rl.js'), { CONFIGS } = require('./configs.js'), fs = require('fs');
const args = process.argv.slice(2);
const CFG = args[0], seed = +args[1], EPIS = +args[2], cfg = CONFIGS[CFG];
const LOGN = args.includes('--log') ? +args[args.indexOf('--log') + 1] : 50;
if (!cfg || !Number.isFinite(seed) || !Number.isFinite(EPIS)) { console.error('uso: node train.js <M0..M5> <semente> <episódios>'); process.exit(1); }
const CK = +process.env.CTM_CK || 300, KS = [1, 3, 5, 10];
const RD = `results/${CFG}`; fs.mkdirSync(RD, { recursive: true });
const LOG = `${RD}/train_log_${seed}.jsonl`; fs.writeFileSync(LOG, ''); fs.writeFileSync(`${RD}/ckpt_${seed}.json`, '[]');
const TR = Array.from({ length: 300 }, (_, i) => E.scenario(E.SEEDS.treino(i))), VA = Array.from({ length: 40 }, (_, i) => E.scenario(E.SEEDS.validacao(i)));
const r = rng(seed * 31 + 3), net = new Net(seed); let tgt = net.copy();
const buf = [], prio = [], CAP = 20000, T0 = Date.now(), ckpts = [];
const f32 = X => X.map(x => Float32Array.from(x));
function evalVal(pol) { let k = 0, v = 0, c = 0; for (const st of VA) for (const K of KS) { const o = E.runEpisode(st, K, pol, { variavel: cfg.variavel }); k += o.kpi; v += o.vh; c++; } return { kpi: k / c, vh: v / c }; }
let W = { n: 0, ret: 0, kpi: 0, act: 0, loss: 0, nl: 0, ep: 0, tau: 0 };
console.log(`[${CFG}] ${cfg.nome} | semente ${seed}: ${EPIS} episódios`);
for (let epi = 0; epi < EPIS; epi++) {
  const eps = Math.max(0.05, 1 - epi / (0.6 * EPIS));
  const st = TR[Math.floor(r() * TR.length)], K = KS[Math.floor(r() * KS.length)];
  const ep = new E.Ep(st, K, { variavel: cfg.variavel });
  if (ep.done) continue;
  let C = ep.legal(), X = f32(ep.feats(C)), ret = 0, ne = 0, st_ = 0;
  while (true) {
    let a; if (r() < eps) a = Math.floor(r() * C.length); else { const { Q } = net.fwd(X); a = Q.indexOf(Math.max(...Q)); }
    ep.apply(C[a]); const o = ep.advance(C[a].dt || 60, cfg.alpha); ret += o.r; ne++; st_ += o.tau;
    let X2 = null, C2 = null; if (!o.end) { C2 = ep.legal(); X2 = f32(ep.feats(C2)); }
    const tr = { X, a, r: o.r, X2, g: o.g };
    if (buf.length < CAP) { buf.push(tr); prio.push(1); } else { const j = Math.floor(r() * CAP); buf[j] = tr; prio[j] = 1; }
    if (buf.length >= 256) {
      const pr = prio.map(p => p ** 0.6), tot = pr.reduce((a, b) => a + b, 0), batch = [];
      for (let b = 0; b < 32; b++) { let u = r() * tot, j = 0; while (u > pr[j] && j < pr.length - 1) { u -= pr[j]; j++; }
        const t = buf[j]; let y = t.r;
        if (cfg.pol === 'ddqn' && t.X2) { const qo = net.fwd(t.X2).Q, qt = tgt.fwd(t.X2).Q; y += t.g * qt[qo.indexOf(Math.max(...qo))]; }
        prio[j] = Math.abs(net.fwd(t.X).Q[t.a] - y) + 1e-3; batch.push({ X: t.X, a: t.a, y }); }
      W.loss += net.trainBatch(batch); W.nl++;
      if (net.t % 200 === 0) tgt = net.copy();
    }
    if (o.end) break; X = X2; C = C2;
  }
  W.n++; W.ret += ret; W.kpi += ep.kpi == null ? E.H + 1 : ep.kpi; W.act += ep.K - ep.left; W.ep += ne; W.tau += st_ / ne;
  if ((epi + 1) % LOGN === 0) {
    fs.appendFileSync(LOG, JSON.stringify({ ep: epi + 1, eps: +eps.toFixed(4), ret: W.n ? W.ret / W.n : null, kpi: W.n ? W.kpi / W.n : null, acts: W.n ? W.act / W.n : null,
      epocas: W.n ? W.ep / W.n : null, tau_medio: W.n ? W.tau / W.n : null, loss: W.nl ? W.loss / W.nl : null, updates: net.t, min: (Date.now() - T0) / 60000, total: EPIS }) + '\n');
    W = { n: 0, ret: 0, kpi: 0, act: 0, loss: 0, nl: 0, ep: 0, tau: 0 };
  }
  if ((epi + 1) % CK === 0) {
    const v = evalVal(makePolicy(net)); ckpts.push({ cfg: CFG, seed, ep: epi + 1, ...v, net: net.toJSON() });
    console.log(`[${CFG}] semente ${seed} ep ${epi + 1} validação: KPI ${v.kpi.toFixed(3)} h, ${v.vh.toFixed(0)} v·h (${((Date.now() - T0) / 60000).toFixed(1)} min)`);
    fs.writeFileSync(`${RD}/ckpt_${seed}.json`, JSON.stringify(ckpts));
  }
}
console.log(`[${CFG}] semente ${seed}: fim (${((Date.now() - T0) / 60000).toFixed(1)} min)`);
