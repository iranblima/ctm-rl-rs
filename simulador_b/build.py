"""Cenário B: tabelas do teste, comparações pareadas com IC bootstrap e dados da página (results/summary.json, results/viz.json)."""
import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
import json, glob
import numpy as np

D = json.load(open(os.path.join('..', 'data', 'derived', 'rsdata.json'), encoding='utf-8'))
names = json.load(open(os.path.join('..', 'data', 'derived', 'node_names.json'), encoding='utf-8'))
res = sorted([x for f in sorted(glob.glob('results/test_*.json')) for x in json.load(open(f, encoding='utf-8'))], key=lambda r: (r['i'], r['K']))
W, G = 'Esperar', 'Guloso (Greedy MC)'
AT, AP = 'Dueling DDQN MLP — rede inteira', 'Dueling DDQN MLP — só postos'
M = [m for m in (W, G, AT, AP) if m in res[0]['m']]
rng = np.random.default_rng(1)

def boot(x, n=5000):
    m = rng.choice(x, (n, len(x))).mean(1)
    return float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))

def paired(x):
    x = np.asarray(x, float); lo, hi = boot(x)
    return dict(mean=float(x.mean()), lo=lo, hi=hi, win=float((x < 0).mean()), tie=float((x == 0).mean()), loss=float((x > 0).mean()), n=len(x))

def col(rr, m, k):
    return np.array([r['m'][m][k] for r in rr], float)

pairs = [(AT, G)] + ([(AP, G), (AT, AP)] if AP in M else [])
byK = []
for K in (1, 3, 5, 10):
    rr = [r for r in res if r['K'] == K]
    row = dict(K=K, kpi={m: float(col(rr, m, 'kpi').mean()) for m in M}, sus={m: float(col(rr, m, 'sustained').mean()) for m in M},
               vh={m: float(col(rr, m, 'vh').mean()) for m in M}, used={m: float(col(rr, m, 'used').mean()) for m in M},
               d={f'{a}|{b}': paired(col(rr, a, 'kpi') - col(rr, b, 'kpi')) for a, b in pairs})
    byK.append(row)
pooled = {f'{a}|{b}': paired(col(res, a, 'kpi') - col(res, b, 'kpi')) for a, b in pairs}
pooled_vh = {f'{a}|{b}': paired(col(res, a, 'vh') - col(res, b, 'vh')) for a, b in pairs}
acts = {m: {} for m in M}
for r in res:
    for m in M:
        for l in r['m'][m]['log']:
            acts[m][l['type']] = acts[m].get(l['type'], 0) + 1
sims = int(sum(sum(l['n'] for l in r['m'][G]['log'] if l['n'] > 1) for r in res))
sel = {}
for mode in ('total', 'postos'):
    f = f'results/{mode}/selected.json'
    if os.path.exists(f):
        s = json.load(open(f)); sel[mode] = dict(seed=s['seed'], ep=s['ep'], kpi=s['kpi'], vh=s['vh'])
valref = json.load(open('results/valref.json')) if os.path.exists('results/valref.json') else None
nte = len(set(r['i'] for r in res))
summary = dict(n_cenarios=nte, metodos=M, byK=byK, pooled=pooled, pooled_vh=pooled_vh, acts=acts, sims_guloso=sims, selecionados=sel, validacao=valref,
               stab0=[float(np.min([r['stab0'] for r in res])), float(np.max([r['stab0'] for r in res]))],
               obstrucoes=[int(np.min([r['n'] for r in res])), int(np.max([r['n'] for r in res]))])
json.dump(summary, open('results/summary.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for row in byK:
    print('K', row['K'], {m.split(' ')[0] + (' T' if m == AT else ' P' if m == AP else ''): round(v, 2) for m, v in row['kpi'].items()})
for k, v in pooled.items():
    print(k, {a: round(b, 3) for a, b in v.items()})
print('acts', acts, 'sims', sims, 'sel', sel)

eps = []
for r in res:
    if r['m'][W].get('frames') is None:
        continue
    eps.append(dict(i=r['i'], t=r['t'], K=r['K'], stab0=r['stab0'], n=r['n'], evs=[dict(i=e['i'], e=e['e'], fa=round((1 - e['fr']) if D['edges'][e['e']]['o'] == -1 else e['fr'], 3), cls=e['cls']) for e in r['evs']],
                    m={m: dict(kpi=r['m'][m]['kpi'], sustained=r['m'][m]['sustained'], vh=r['m'][m]['vh'], used=r['m'][m]['used'], log=r['m'][m]['log'], stabs=r['m'][m]['stabs'], frames=r['m'][m]['frames']) for m in M}))
links = []
for ei, e in enumerate(D['edges']):
    for d in (0, 1):
        links.append([ei, d])
out = dict(nodes=D['nodes'], nodeNames=names, edges=[dict(a=e['a'], b=e['b'], sup=e['sup'], br=e['br'], ki=e['ki'], kf=e['kf'], o=e['o']) for e in D['edges']],
           links=links, methods=M, eps=eps, test=summary)
s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open('results/viz.json', 'w', encoding='utf-8').write(s)
print('viz bytes', len(s), 'eps', len(eps))
