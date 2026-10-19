import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
"""Reprodução do experimento do artigo (Lerma et al.) - etapa 1: snapshots diários do RS.
Grafo: network.json completo (395 nós, 426 trechos -> 852 arestas direcionadas, como no slide 3).
Fluxo diário por aresta direcionada: postos PNCT por sentido (C = km crescente).
Imputação em 5 níveis (seção 5.4). Interrupção: fração do dia interditada (planilha PRF)."""
import sys, json, collections
import numpy as np, pandas as pd

U = sys.argv[1] if len(sys.argv) > 1 else '../data/raw'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'results/snap.npz'
j = json.load(open(U + '/network.json'))
nodes = list(j['nodes'].keys())
nid = {k: i for i, k in enumerate(nodes)}
pt = np.array([[float(x) for x in j['nodes'][k]['ponto'].split(',')] for k in nodes])  # lat, lon
E = [dict(a=nid[a['node1']], b=nid[a['node2']], n1=a['node1'], n2=a['node2'], **a['data']) for a in j['edges']]
nE = len(E)

# orientação: n1 no km inicial?
by_node_br = collections.defaultdict(list)
for i, e in enumerate(E):
    by_node_br[(e['n1'], e['br'])].append(i); by_node_br[(e['n2'], e['br'])].append(i)
def orient(i):
    e = E[i]; v = 0
    for node, sg in ((e['n1'], 1), (e['n2'], -1)):
        for k in by_node_br[(node, e['br'])]:
            if k == i: continue
            o = E[k]
            if abs(o['km_final'] - e['km_inicial']) < 0.6: v += sg
            if abs(o['km_inicial'] - e['km_final']) < 0.6: v -= sg
    return 1 if v > 0 else -1 if v < 0 else 0
ori = np.array([orient(i) for i in range(nE)])
# arestas direcionadas: 2i = a->b, 2i+1 = b->a ; crescente?
src = np.array([e['a'] if d == 0 else e['b'] for e in E for d in (0, 1)])
dst = np.array([e['b'] if d == 0 else e['a'] for e in E for d in (0, 1)])
cres = np.array([(ori[i] >= 0) == (d == 0) for i in range(nE) for d in (0, 1)])

# ---------- dias ----------
days = pd.date_range('2021-06-01', '2025-10-31', freq='D')
nD = len(days); dix = {d: i for i, d in enumerate(days)}
flow = np.full((nD, 2 * nE), np.nan)

# ---------- PNCT ----------
p = pd.read_parquet(U + '/pntc_rs_unificado.parquet')
cls = ['onibus_cam_2eixos', 'onibus_cam_3eixos', 'cam_4eixos', 'cam_5eixos', 'cam_6eixos', 'cam_7eixos', 'cam_8eixos', 'cam_9eixos', 'passeio', 'motocicleta', 'indefinido']
for c in cls: p[c] = pd.to_numeric(p[c], errors='coerce').fillna(0)
p['vol'] = p[cls].sum(axis=1)
p['day'] = pd.to_datetime(p['Data'], format='%d/%m/%Y', errors='coerce')
p['kmf'] = pd.to_numeric(p['Km'].str.replace(',', '.'), errors='coerce').round(2)
p['brn'] = pd.to_numeric(p['BR'], errors='coerce').astype(int)
p = p.dropna(subset=['day'])
g = p.groupby(['brn', 'kmf', 'day', 'Sentido']).agg(vol=('vol', 'sum'), nh=('Hora', 'nunique')).reset_index()
g = g[g['nh'] >= 20]
g['vol'] = g['vol'] * 24 / g['nh']
stations = []
for (br, km), q in g.groupby(['brn', 'kmf']):
    cand = [i for i, e in enumerate(E) if e['br'] == br and e['km_inicial'] - 0.5 <= km <= e['km_final'] + 0.5 and e['superficie_federal'] != 'PLA']
    if not cand: continue
    ei = cand[0]
    stations.append((br, km, ei))
    for _, r in q.iterrows():
        if r['day'] not in dix: continue
        de = 2 * ei + (0 if (r['Sentido'] == 'C') == bool(cres[2 * ei]) else 1)
        d = dix[r['day']]
        flow[d, de] = r['vol'] if np.isnan(flow[d, de]) else flow[d, de] + r['vol']
obs = ~np.isnan(flow)
print('stations mapped', len(stations), 'directed edges ever observed', obs.any(0).sum(), 'mean observed per day', obs.sum(1).mean().round(1))

# ---------- divisão cronológica 70/10/20 ----------
ntr = int(nD * 0.7); nva = int(nD * 0.1)
split = np.array(['train'] * ntr + ['val'] * nva + ['test'] * (nD - ntr - nva))

# ---------- imputação em 5 níveis ----------
conf = np.where(obs, 1.0, 0.0)
F = flow.copy()
# 2) repetir a observação mais próxima no tempo (mesma aresta), até 14 dias
for e in np.where(obs.any(0))[0]:
    od = np.where(obs[:, e])[0]
    for d in np.where(~obs[:, e])[0]:
        k = np.searchsorted(od, d)
        cands = [od[x] for x in (k - 1, k) if 0 <= x < len(od)]
        best = min(cands, key=lambda x: abs(x - d))
        if abs(best - d) <= 14:
            F[d, e] = flow[best, e]; conf[d, e] = 0.8
# 3) média dos vizinhos (arestas que compartilham um nó) no mesmo dia
adj_e = [[] for _ in range(2 * nE)]
node_e = collections.defaultdict(list)
for e in range(2 * nE): node_e[src[e]].append(e); node_e[dst[e]].append(e)
for e in range(2 * nE):
    adj_e[e] = sorted(set(node_e[src[e]] + node_e[dst[e]]) - {e, e ^ 1})
known = conf >= 0.8
F2 = F.copy()
for e in range(2 * nE):
    nb = adj_e[e]
    if not nb: continue
    miss = conf[:, e] == 0
    if not miss.any(): continue
    vals = np.where(known[:, nb], F[:, nb], np.nan)
    m = np.nanmean(np.where(np.isnan(vals).all(1, keepdims=True), 0, vals), axis=1) if False else None
    with np.errstate(all='ignore'):
        cnt = (~np.isnan(vals)).sum(1)
        mean = np.nansum(vals, 1) / np.maximum(cnt, 1)
    sel = miss & (cnt > 0)
    F2[sel, e] = mean[sel]; conf[sel, e] = 0.6
F = F2
# 4) média de treino da aresta ou VDM estático (DNIT)
for e in range(2 * nE):
    miss = conf[:, e] == 0
    if not miss.any(): continue
    tr = F[:ntr, e][conf[:ntr, e] >= 0.6]
    if len(tr):
        F[miss, e] = tr.mean(); conf[miss, e] = 0.4
    elif E[e // 2]['vdm_medio'] > 0:
        F[miss, e] = E[e // 2]['vdm_medio'] / 2; conf[miss, e] = 0.3
# 5) média global de treino
gm = np.nanmean(F[:ntr][conf[:ntr] > 0])
miss = conf == 0
F[miss] = gm; conf[miss] = 0.2
levels = {1.0: 'observado', 0.8: 'repetição', 0.6: 'vizinhos', 0.4: 'média da aresta', 0.3: 'VDM estático', 0.2: 'média global'}
print('share edge-days by level:', {levels[k]: round(float((conf == k).mean()) * 100, 1) for k in levels})

# ---------- interrupções: fração do dia interditada ----------
I = np.zeros((nD, 2 * nE))
x = pd.read_excel(U + '/ocorrencias-interdicoes_rs_chuvas_2024.xlsx')
matched = 0
for _, r in x.iterrows():
    br, km = int(r['br']), float(r['km'])
    if br == 290 and 92 <= km <= 112.3: br, km = 116, 270.4 + (km - 92)   # trecho coincidente
    cand = [i for i, e in enumerate(E) if e['br'] == br and e['km_inicial'] - 0.3 <= km <= e['km_final'] + 0.3]
    if not cand: continue
    ei = min(cand, key=lambda i: 0 if E[i]['km_inicial'] <= km <= E[i]['km_final'] else 1)
    matched += 1
    amp = str(r['Amplitude'])
    dirs = [2 * ei, 2 * ei + 1] if 'Ambos' in amp else [2 * ei + (0 if ('Crescente' in amp) == bool(cres[2 * ei]) else 1)]
    s0, s1 = r['data_hora_inicial'], r['data_hora_final']
    for d in pd.date_range(s0.normalize(), s1.normalize(), freq='D'):
        if d not in dix: continue
        a, b = max(s0, d), min(s1, d + pd.Timedelta(days=1))
        frac = max(0, (b - a) / pd.Timedelta(days=1))
        for de in dirs: I[dix[d], de] = min(1, I[dix[d], de] + frac)
print('interdictions matched', matched, 'of', len(x))

# ---------- pesos operacionais ----------
p95 = np.percentile(F[:ntr], 95)               # p95 global do treino (slide 3)
cap_e = np.percentile(F[:ntr], 95, axis=0)     # capacidade por aresta (seção 5.1)
w = np.clip(F / p95, 0, 1)
P = np.clip(w * (1 - I), 0, 1)
print('global p95', round(p95), 'mean p', P.mean().round(3), 'median p', np.median(P).round(3))
np.savez_compressed(OUT, F=F, conf=conf, I=I, P=P, cap=cap_e, src=src, dst=dst, split=split,
                    days=np.array([str(d.date()) for d in days]), pt=pt, nN=len(nodes),
                    km=np.array([e['distancia'] for e in E]), br=np.array([e['br'] for e in E]),
                    sup=np.array([e['superficie_federal'] for e in E]), vdm=np.array([e['vdm_medio'] for e in E]),
                    ki=np.array([e['km_inicial'] for e in E]), kf=np.array([e['km_final'] for e in E]),
                    stations=np.array(stations), p95=p95)
print('saved', F.shape)
