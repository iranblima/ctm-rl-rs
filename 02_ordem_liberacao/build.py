import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
import json, glob, numpy as np
D = json.load(open(os.path.join('..', 'data', 'derived', 'rsdata.json')))
sel = json.load(open('results/selected.json'))
res = sorted([x for f in glob.glob('results/test_*.json') for x in json.load(open(f))], key=lambda r: r['i'])
M = ['Ninguém libera', 'Aleatória', 'Guloso (Greedy MC)', 'Dueling DDQN (método da Andina)']
import re
def cls(t):
    t = (t or '').lower()
    if re.search('água|agua|aguá|cheia|nível do rio|nivel do rio|alag|inund', t): return 'agua'
    if re.search('cedeu|ruindo|rompimento|galeria|reparo|cratera|erosão|erosao', t): return 'estr'
    if re.search('barreira|desliz|encosta', t): return 'barr'
    return 'nd'
sites = []
for it in D['ints']:
    e = D['edges'][it['e']]
    fa = 1 - it['fr'] if e['o'] == -1 else it['fr']
    sites.append(dict(e=it['e'], fa=round(fa, 3), br=it['br'], km=it['km'], mun=it['mun'], cls=cls(it['txt']), s=it['s'], f=it['f']))
rng = np.random.default_rng(1)
def boot(x, n=5000):
    m = rng.choice(x, (n, len(x))).mean(1); return float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))
X = {m: np.array([r['m'][m]['total'] for r in res]) for m in M}
G = {m: np.array([r['m'][m]['gave'] for r in res]) for m in M}
table = []
for m in M:
    lo, hi = boot(X[m]); x = np.sort(X[m])[::-1]
    table.append(dict(name=m, mean=float(X[m].mean()), lo=lo, hi=hi, cvar=float(x[:max(1, len(x) // 5)].mean()), gave=float(G[m].mean())))
table.sort(key=lambda r: r['mean'])
gap = X['Guloso (Greedy MC)'] - X['Dueling DDQN (método da Andina)']
lo, hi = boot(gap)
paired = dict(mean=float(gap.mean()), lo=lo, hi=hi, win=float((gap > 1e-6).mean()), tie=float((abs(gap) <= 1e-6).mean()))
sims = int(sum(sum(r['m']['Guloso (Greedy MC)']['nc']) for r in res))
for m in M: print(m, round(X[m].mean()), boot(X[m]))
print('paired', paired, 'sims', sims, 'n', len(res))
eps = [dict(t=r['t'], n=r['n'], m={m: dict(total=r['m'][m]['total'], gave=r['m'][m]['gave'], costs=r['m'][m]['costs'], seeds=r['m'][m]['seeds'], times=r['m'][m]['times'], frames=r['m'][m]['frames']) for m in M}) for r in res if r['m'][M[0]].get('frames')]
out = dict(nodes=D['nodes'], edges=[dict(a=e['a'], b=e['b'], sup=e['sup']) for e in D['edges']], sites=sites, methods=M, eps=eps,
           test=dict(n=len(res), first=res[0]['t'], last=res[-1]['t'], table=table, paired=paired, sims=sims), selected=dict(seed=sel['seed'], ep=sel['ep']))
s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open('results/viz.json', 'w').write(s); print('viz bytes', len(s), 'eps', len(eps))
