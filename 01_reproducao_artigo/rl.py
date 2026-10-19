import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
"""Dueling Double DQN com MLP compartilhada sobre a lista curta (Eq. 3 do artigo), em numpy."""
import numpy as np
from env import Env, Episode, K, B, legal_all

NF = 12


def features(ep):
    env, d = ep.env, ep.day
    actp = ep.actp
    C = env.shortlist(d, ep.chosen, actp)
    zf, zs, zd, zt = env.zscores(d, C)
    f = lambda x: (x - x.mean()) / (x.std() + 1e-9)
    succ_act = np.array([np.mean([actp[v] >= 0.5 for v in env.G.successors(int(n))]) if env.deg[n] else 0 for n in C])
    st = env.strength[d][C]
    X = np.stack([zf, zs, zd, zt, f(env.r_cap[d][C]), env.r_int[d][C], env.r_conf[d][C], succ_act, actp[C],
                  np.full(len(C), ep.k / K), np.full(len(C), actp.mean()), st / (st.max() + 1e-9)], 1)
    Xp = np.zeros((B, NF), np.float32); M = np.zeros(B, np.float32)
    Xp[:len(C)] = X; M[:len(C)] = 1
    return Xp, M, C


class Net:
    def __init__(self, seed, H=32):
        r = np.random.default_rng(seed)
        g = lambda a, b: (r.standard_normal((a, b)) * np.sqrt(2 / a)).astype(np.float32)
        self.p = dict(W1=g(NF, H), b1=np.zeros(H, np.float32), W2=g(H, H), b2=np.zeros(H, np.float32),
                      Wa=g(H, 1)[:, 0] * 0.1, ba=np.zeros(1, np.float32), Wv=g(H, 1)[:, 0] * 0.1, bv=np.zeros(1, np.float32))
        self.m = {k: np.zeros_like(v) for k, v in self.p.items()}; self.v = {k: np.zeros_like(v) for k, v in self.p.items()}; self.t = 0

    def copy(self):
        n = Net.__new__(Net); n.p = {k: v.copy() for k, v in self.p.items()}; return n

    def forward(self, X, M):
        p = self.p
        z1 = X @ p['W1'] + p['b1']; h1 = np.maximum(z1, 0)
        z2 = h1 @ p['W2'] + p['b2']; h2 = np.maximum(z2, 0)
        A = h2 @ p['Wa'] + p['ba'][0]
        cnt = M.sum(1, keepdims=True)
        pooled = (h2 * M[..., None]).sum(1) / cnt
        V = pooled @ p['Wv'] + p['bv'][0]
        Q = V[:, None] + A - ((A * M).sum(1, keepdims=True) / cnt)
        Q = np.where(M > 0, Q, -1e9)
        return Q, (X, M, z1, h1, z2, h2, pooled, cnt)

    def train_step(self, X, M, a, y, lr=1e-3):
        Q, (X, M, z1, h1, z2, h2, pooled, cnt) = self.forward(X, M)
        n = len(a); idx = np.arange(n)
        err = Q[idx, a] - y
        dQs = 2 * err / n
        dQ = np.zeros_like(Q); dQ[idx, a] = dQs
        dV = dQs
        dA = dQ - (dQs[:, None] * M / cnt)
        p = self.p
        g = {}
        g['Wv'] = pooled.T @ dV; g['bv'] = np.array([dV.sum()], np.float32)
        g['Wa'] = np.einsum('nbh,nb->h', h2, dA); g['ba'] = np.array([dA.sum()], np.float32)
        dh2 = dA[..., None] * p['Wa'] + (dV[:, None] * p['Wv'][None, :])[:, None, :] * M[..., None] / cnt[..., None]
        dz2 = dh2 * (z2 > 0)
        g['W2'] = np.einsum('nbi,nbj->ij', h1, dz2); g['b2'] = dz2.sum((0, 1))
        dh1 = dz2 @ p['W2'].T; dz1 = dh1 * (z1 > 0)
        g['W1'] = np.einsum('nbi,nbj->ij', X, dz1); g['b1'] = dz1.sum((0, 1))
        self.t += 1
        for k in p:
            gk = np.clip(g[k], -5, 5).astype(np.float32)
            self.m[k] = 0.9 * self.m[k] + 0.1 * gk; self.v[k] = 0.999 * self.v[k] + 0.001 * gk * gk
            mh = self.m[k] / (1 - 0.9 ** self.t); vh = self.v[k] / (1 - 0.999 ** self.t)
            p[k] -= lr * mh / (np.sqrt(vh) + 1e-8)
        return float((err ** 2).mean())


def make_policy(net):
    def pol(ep, rng):
        X, M, C = features(ep)
        Q, _ = net.forward(X[None], M[None])
        return int(C[int(np.argmax(Q[0]))])
    return pol


def train(env, starts, seed, episodes, gamma=0.9, R=16, log=None, ckpt_every=250):
    rng = np.random.default_rng(seed)
    net = Net(seed); tgt = net.copy()
    buf = []; cap = 20000; prio = []
    ckpts = []
    for epi in range(episodes):
        eps = max(0.05, 1 - epi / (0.6 * episodes))
        t0 = int(rng.choice(starts))
        ep = Episode(env, t0, R=R, seed=10_000 + epi + 100_000 * seed)
        X, M, C = features(ep)
        for k in range(K):
            nC = int(M.sum())
            if rng.random() < eps: ai = int(rng.integers(nC))
            else: ai = int(np.argmax(net.forward(X[None], M[None])[0][0]))
            r = ep.step(int(C[ai])) / 10.0
            if k < K - 1: X2, M2, C2 = features(ep)
            else: X2, M2, C2 = None, None, None
            tr = (X, M, ai, r, X2, M2)
            if len(buf) < cap: buf.append(tr); prio.append(1.0)
            else: j = int(rng.integers(cap)); buf[j] = tr; prio[j] = 1.0
            if len(buf) >= 256:
                pr = np.array(prio) ** 0.6; pr /= pr.sum()
                bi = rng.choice(len(buf), 32, p=pr)
                Xb = np.stack([buf[i][0] for i in bi]); Mb = np.stack([buf[i][1] for i in bi])
                ab = np.array([buf[i][2] for i in bi]); rb = np.array([buf[i][3] for i in bi], np.float32)
                y = rb.copy()
                nt = [i for i, b in enumerate(bi) if buf[b][4] is not None]
                if nt:
                    X2b = np.stack([buf[bi[i]][4] for i in nt]); M2b = np.stack([buf[bi[i]][5] for i in nt])
                    qo, _ = net.forward(X2b, M2b); qt, _ = tgt.forward(X2b, M2b)
                    astar = qo.argmax(1)
                    y[nt] += gamma * qt[np.arange(len(nt)), astar]
                qcur, _ = net.forward(Xb, Mb)
                td = np.abs(qcur[np.arange(32), ab] - y)
                for i, b in enumerate(bi): prio[b] = float(td[i]) + 1e-3
                net.train_step(Xb, Mb, ab, y)
                if net.t % 200 == 0: tgt = net.copy()
            if X2 is not None: X, M, C = X2, M2, C2
        if (epi + 1) % ckpt_every == 0:
            ckpts.append((epi + 1, net.copy()))
            if log: log(f'seed {seed} episode {epi + 1}')
    return ckpts
