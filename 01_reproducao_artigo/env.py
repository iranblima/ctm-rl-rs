import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
"""Ambiente do artigo: seleção sequencial de K=5 sementes, um snapshot (dia) por passo,
cascata independente com p_uv(t) = clip(flow/p95_treino * (1 - interrupção), 0, 1),
recompensa = nós recém-ativados (slides), lista curta B=32 pela Eq. (2)."""
import numpy as np, networkx as nx
from scipy import sparse

K, B, H = 5, 32, 3


class Env:
    def __init__(self, path):
        z = np.load(path, allow_pickle=True)
        self.P, self.F, self.I, self.conf, self.cap = z['P'], z['F'], z['I'], z['conf'], z['cap']
        self.src, self.dst = z['src'], z['dst']
        self.split, self.days = z['split'], z['days']
        self.nN = int(z['nN']); self.nE = len(self.src); self.nD = len(self.days)
        self.Mdst = sparse.csr_matrix((np.ones(self.nE, np.float32), (np.arange(self.nE), self.dst)), shape=(self.nE, self.nN))
        self.Msrc = sparse.csr_matrix((np.ones(self.nE, np.float32), (self.src, np.arange(self.nE))), shape=(self.nN, self.nE))
        # estruturais
        G = nx.DiGraph(); G.add_nodes_from(range(self.nN))
        km = z['km']
        for e in range(self.nE): G.add_edge(int(self.src[e]), int(self.dst[e]), d=float(max(km[e // 2], 0.1)))
        self.G = G
        self.deg = np.array([G.out_degree(n) for n in range(self.nN)], float)
        self.twohop = np.array([len(nx.single_source_shortest_path_length(G, n, cutoff=2)) - 1 for n in range(self.nN)], float)
        bt = nx.betweenness_centrality(G.to_undirected(), weight='d')
        self.btw = np.array([bt[n] for n in range(self.nN)])
        # por dia: força (soma de p nas saídas), riscos médios nas saídas
        self.strength = (self.Msrc @ self.P.T).T                       # nD x nN
        outdeg = np.maximum(self.deg, 1)
        util = np.clip(self.F / np.maximum(self.cap, 1) - 1, 0, None)
        self.r_cap = (self.Msrc @ util.T).T / outdeg
        self.r_int = (self.Msrc @ self.I.T).T / outdeg
        self.r_conf = (self.Msrc @ (1 - self.conf).T).T / outdeg

    def future(self, d):
        hi = min(self.nD, d + 1 + H)
        return self.strength[d + 1:hi].mean(0) if hi > d + 1 else self.strength[d]

    # ---- cascata por arestas vivas (amostras em paralelo) ----
    def live(self, d, R, rng):
        return rng.random((R, self.nE), dtype=np.float32) < self.P[d]

    def reach(self, seeds_mask, live):
        """seeds_mask: R x nN bool ; live: R x nE bool -> R x nN alcance."""
        act = seeds_mask.copy()
        while True:
            contrib = act[:, self.src] & live
            new = (sparse.csr_matrix(contrib.astype(np.float32)) @ self.Mdst).toarray() > 0
            nxt = act | new
            if (nxt == act).all(): return act
            act = nxt

    def zscores(self, d, cand):
        fut, st = self.future(d)[cand], self.strength[d][cand]
        f = lambda x: (x - x.mean()) / (x.std() + 1e-9)
        return f(fut), f(st), f(self.deg[cand]), f(self.twohop[cand])

    def shortlist(self, d, chosen, actp):
        legal = np.array([n for n in range(self.nN) if n not in chosen and actp[n] < 0.5])
        zf, zs, zd, zt = self.zscores(d, legal)
        score = zf + 0.5 * zs + 0.3 * zd + 0.2 * zt
        order = np.lexsort((legal, -score))
        return legal[order[:B]]


class Episode:
    """Avaliação com amostras comuns (CRN): mesmas arestas vivas para todas as políticas."""
    def __init__(self, env, t0, R=200, seed=0):
        self.env, self.t0, self.R = env, t0, R
        rng = np.random.default_rng(1000003 * seed + t0)
        self.lives = [env.live(t0 + k, R, rng) for k in range(K)]
        self.active = np.zeros((R, env.nN), bool)
        self.k, self.chosen, self.rewards, self.steps = 0, [], [], []

    @property
    def day(self): return self.t0 + self.k
    @property
    def actp(self): return self.active.mean(0)

    def step(self, a):
        s = np.zeros((self.R, self.env.nN), bool); s[:, a] = True
        rch = self.env.reach(s, self.lives[self.k])
        new = rch & ~self.active
        r = new.sum(1).mean()
        self.active |= rch
        self.chosen.append(int(a)); self.rewards.append(float(r)); self.steps.append(self.actp.copy())
        self.k += 1
        return r


# ---------------- políticas ----------------
def legal_all(ep):
    return np.array([n for n in range(ep.env.nN) if n not in ep.chosen and ep.actp[n] < 0.5])


def p_random(ep, rng): L = legal_all(ep); return int(rng.choice(L))
def p_degree(ep, rng): L = legal_all(ep); return int(L[np.argmax(ep.env.deg[L] + 1e-6 * -L)])
def p_btw(ep, rng): L = legal_all(ep); return int(L[np.argmax(ep.env.btw[L])])
def p_strength(ep, rng): L = legal_all(ep); return int(L[np.argmax(ep.env.strength[ep.day][L])])
def p_pagerank(ep, rng):
    env, d = ep.env, ep.day
    G = nx.DiGraph(); G.add_nodes_from(range(env.nN))
    for e in range(env.nE):
        if env.P[d, e] > 0: G.add_edge(int(env.src[e]), int(env.dst[e]), weight=float(env.P[d, e]))
    pr = nx.pagerank(G, weight='weight')
    L = legal_all(ep); return int(L[np.argmax([pr[n] for n in L])])


def p_greedy_mc(ep, rng, R=5):
    env, d = ep.env, ep.day
    C = env.shortlist(d, ep.chosen, ep.actp)
    live = env.live(d, R, rng)                       # números aleatórios comuns entre candidatos
    act = np.tile(ep.actp >= 0.5, (R, 1))
    best, bv = C[0], -1
    for c in C:
        s = np.zeros((R, env.nN), bool); s[:, c] = True
        g = (env.reach(s, live) & ~act).sum(1).mean()
        if g > bv: bv, best = g, c
    return int(best)


def rerank_score(env, d, C, lam):
    f = lambda x: (x - x.mean()) / (x.std() + 1e-9)
    g = f(env.future(d)[C])
    return g - lam[0] * f(env.r_cap[d][C]) - lam[1] * f(env.r_int[d][C]) - lam[2] * f(env.r_conf[d][C])


def make_rerank(lam):
    def p(ep, rng):
        C = ep.env.shortlist(ep.day, ep.chosen, ep.actp)
        return int(C[np.argmax(rerank_score(ep.env, ep.day, C, lam))])
    return p


def run_policy(env, policy, t0, seed=0, R=200, rng_seed=7):
    ep = Episode(env, t0, R=R, seed=seed)
    rng = np.random.default_rng(rng_seed + t0)
    for _ in range(K):
        ep.step(policy(ep, rng))
    return ep
