// Cenário C: o número de atributos vem da rede (22 no C, 18 na rede trazida do B).
// Dueling Double DQN (mesma arquitetura da reprodução: MLP compartilhada por candidato, cabeças de valor e vantagem)
'use strict';
const E = require('./env.js');
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const NF = E.NF, B = E.B, HN = 32;
function randn(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
class Net {
  constructor(seed, nf = NF) {
    this.nf = nf;
    const r = rng(seed * 101 + 5), g = (a, b, s = 1) => Float64Array.from({ length: a * b }, () => randn(r) * Math.sqrt(2 / a) * s);
    this.p = { W1: g(nf, HN), b1: new Float64Array(HN), W2: g(HN, HN), b2: new Float64Array(HN), Wa: g(HN, 1, 0.1), ba: new Float64Array(1), Wv: g(HN, 1, 0.1), bv: new Float64Array(1) };
    this.m = {}; this.v = {}; for (const k in this.p) { this.m[k] = new Float64Array(this.p[k].length); this.v[k] = new Float64Array(this.p[k].length); } this.t = 0;
  }
  copy() { const n = Object.create(Net.prototype); n.nf = this.nf; n.p = {}; for (const k in this.p) n.p[k] = this.p[k].slice(); return n; }
  toJSON() { const o = {}; for (const k in this.p) o[k] = Array.from(this.p[k]); return o; }
  static from(o) { const n = Object.create(Net.prototype); n.p = {}; for (const k in o) n.p[k] = Float64Array.from(o[k]); n.nf = n.p.W1.length / HN; return n; }
  // X: lista de candidatos (n x NF). devolve Q e cache
  fwd(X) {
    const p = this.p, n = X.length, h1 = [], h2 = [], z1 = [], z2 = [], A = new Float64Array(n), pooled = new Float64Array(HN);
    for (let j = 0; j < n; j++) {
      const a = new Float64Array(HN), b = new Float64Array(HN);
      for (let o = 0; o < HN; o++) { let s = p.b1[o]; for (let i = 0; i < this.nf; i++) s += X[j][i] * p.W1[i * HN + o]; a[o] = s; }
      const ha = a.map(x => Math.max(0, x));
      for (let o = 0; o < HN; o++) { let s = p.b2[o]; for (let i = 0; i < HN; i++) s += ha[i] * p.W2[i * HN + o]; b[o] = s; }
      const hb = b.map(x => Math.max(0, x));
      let s = p.ba[0]; for (let i = 0; i < HN; i++) { s += hb[i] * p.Wa[i]; pooled[i] += hb[i] / n; }
      A[j] = s; z1.push(a); h1.push(ha); z2.push(b); h2.push(hb);
    }
    let V = p.bv[0]; for (let i = 0; i < HN; i++) V += pooled[i] * p.Wv[i];
    const Am = A.reduce((x, y) => x + y, 0) / n;
    const Q = Array.from(A, a => V + a - Am);
    return { Q, c: { X, z1, h1, z2, h2, pooled, n } };
  }
  grad(c, ai, dQs, g) { // acumula gradiente de dQs * dQ[ai]/dθ
    const p = this.p, n = c.n;
    const dA = new Float64Array(n); for (let j = 0; j < n; j++) dA[j] = (j === ai ? dQs : 0) - dQs / n;
    const dV = dQs;
    for (let i = 0; i < HN; i++) g.Wv[i] += c.pooled[i] * dV; g.bv[0] += dV;
    for (let j = 0; j < n; j++) {
      const h2 = c.h2[j], z2 = c.z2[j], h1 = c.h1[j], z1 = c.z1[j], X = c.X[j];
      const dz2 = new Float64Array(HN);
      for (let i = 0; i < HN; i++) { g.Wa[i] += h2[i] * dA[j]; const dh = dA[j] * p.Wa[i] + dV * p.Wv[i] / n; dz2[i] = z2[i] > 0 ? dh : 0; }
      g.ba[0] += dA[j];
      const dz1 = new Float64Array(HN);
      for (let i = 0; i < HN; i++) { if (h1[i] !== 0) for (let o = 0; o < HN; o++) g.W2[i * HN + o] += h1[i] * dz2[o]; let s = 0; for (let o = 0; o < HN; o++) s += dz2[o] * p.W2[i * HN + o]; dz1[i] = z1[i] > 0 ? s : 0; g.b2[i] += dz2[i]; }
      for (let i = 0; i < this.nf; i++) { const x = X[i]; if (x !== 0) for (let o = 0; o < HN; o++) g.W1[i * HN + o] += x * dz1[o]; }
      for (let o = 0; o < HN; o++) g.b1[o] += dz1[o];
    }
  }
  trainBatch(batch, lr = 1e-3) {
    const g = {}; for (const k in this.p) g[k] = new Float64Array(this.p[k].length);
    let loss = 0;
    for (const { X, a, y } of batch) { const { Q, c } = this.fwd(X); const err = Q[a] - y; loss += err * err; this.grad(c, a, 2 * err / batch.length, g); }
    this.t++;
    for (const k in this.p) {
      const p = this.p[k], m = this.m[k], v = this.v[k], gk = g[k];
      for (let i = 0; i < p.length; i++) {
        const gi = Math.max(-5, Math.min(5, gk[i]));
        m[i] = 0.9 * m[i] + 0.1 * gi; v[i] = 0.999 * v[i] + 0.001 * gi * gi;
        p[i] -= lr * (m[i] / (1 - 0.9 ** this.t)) / (Math.sqrt(v[i] / (1 - 0.999 ** this.t)) + 1e-8);
      }
    }
    return loss / batch.length;
  }
}
function makePolicy(net) { return (ep, C, qs) => { if (C.length === 1 && !qs) return C[0]; const { Q } = net.fwd(ep.feats(C)); /* a rede do cenário B lê só os 18 primeiros atributos */ let b = 0; for (let j = 1; j < Q.length; j++) if (Q[j] > Q[b]) b = j; if (qs) qs.push(Q[b]); return C[b]; }; }
module.exports = { Net, makePolicy, rng };
