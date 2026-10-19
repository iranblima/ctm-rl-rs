import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
import json, glob, re, numpy as np
D = json.load(open(os.path.join('..', 'data', 'derived', 'rsdata.json')))
R = json.load(open(os.path.join('..', '01_reproducao_artigo', 'results', 'viz.json')))
sel = json.load(open('results/selected.json'))
parts = [json.load(open(f)) for f in sorted(glob.glob('results/test_*.json'))]
res = sorted([x for p in parts for x in p['res']], key=lambda r: (r['i'], r['K']))
split = parts[0]['split']
M = ['Esperar', 'Guloso (Greedy MC)', 'Dueling DDQN MLP (método da Andina)']
W, G, A = M
def cls(t):
    t = (t or '').lower()
    if re.search('água|agua|aguá|cheia|nível do rio|nivel do rio|alag|inund', t): return 'agua'
    if re.search('cedeu|ruindo|rompimento|galeria|reparo|cratera|erosão|erosao', t): return 'estr'
    if re.search('barreira|desliz|encosta', t): return 'barr'
    return 'nd'
sites = []
for it in D['ints']:
    e = D['edges'][it['e']]; fa = 1 - it['fr'] if e['o'] == -1 else it['fr']
    sites.append(dict(e=it['e'], fa=round(fa, 3), br=it['br'], km=it['km'], mun=it['mun'], cls=cls(it['txt']), s=it['s'], f=it['f']))
# nomes de nós: vizinho mais próximo no arquivo da reprodução
rn = np.array(R['nodes']); names = []
for la, lo in D['nodes']:
    d = np.hypot(rn[:, 0] - la, rn[:, 1] - lo); j = int(d.argmin()); names.append(R['names'][j] if d[j] < 0.02 else None)
rng = np.random.default_rng(1)
def boot(x, n=5000):
    m = rng.choice(x, (n, len(x))).mean(1); return float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))
def paired(x):
    lo, hi = boot(x); return dict(mean=float(x.mean()), lo=lo, hi=hi, win=float((x < 0).mean()), tie=float((x == 0).mean()), loss=float((x > 0).mean()), n=len(x))
byK = []
for K in (1, 3, 5, 10):
    rr = [r for r in res if r['K'] == K]
    g = lambda m, k: np.array([r['m'][m][k] for r in rr], float)
    d = g(A, 'kpi') - g(G, 'kpi')
    byK.append(dict(K=K, wait=g(W, 'kpi').mean(), greedy=g(G, 'kpi').mean(), agent=g(A, 'kpi').mean(), d=paired(d),
        sus=dict(wait=g(W, 'sustained').mean(), greedy=g(G, 'sustained').mean(), agent=g(A, 'sustained').mean()),
        vh=dict(wait=g(W, 'vh').mean(), greedy=g(G, 'vh').mean(), agent=g(A, 'vh').mean()),
        used=dict(greedy=g(G, 'used').mean(), agent=g(A, 'used').mean()),
        cens=dict(wait=g(W, 'censored').mean(), greedy=g(G, 'censored').mean(), agent=g(A, 'censored').mean()),
        dvh=paired(g(A, 'vh') - g(G, 'vh')), dsus=paired(g(A, 'sustained') - g(G, 'sustained'))))
    print(K, {k: (round(v, 3) if isinstance(v, float) else v) for k, v in byK[-1].items() if k in ('wait', 'greedy', 'agent')}, 'd', {k: round(v, 3) for k, v in byK[-1]['d'].items()}, 'vh', {k: round(v) for k, v in byK[-1]['vh'].items()}, 'sus', {k: round(v, 2) for k, v in byK[-1]['sus'].items()}, 'used', byK[-1]['used'])
allx = np.array([r['m'][A]['kpi'] - r['m'][G]['kpi'] for r in res], float)
pooled = paired(allx)
sims = int(sum(sum(l['n'] for l in r['m'][G]['log'] if l['n'] > 1) for r in res))
# Q inicial prevê estabilização mais rápida?
q = np.array([r['m'][A]['q0'] if r['m'][A]['q0'] is not None else np.nan for r in res]); k = np.array([r['m'][A]['kpi'] for r in res], float)
ok = ~np.isnan(q)
from scipy.stats import spearmanr
rho = spearmanr(q[ok], -k[ok]) if ok.sum() > 3 else None
qinfo = dict(rho=float(rho.correlation), p=float(rho.pvalue), n=int(ok.sum())) if rho is not None else None
acts = {m: {} for m in (G, A)}
for r in res:
    for m in (G, A):
        for l in r['m'][m]['log']:
            acts[m][l['type']] = acts[m].get(l['type'], 0) + 1
print('pooled', pooled, 'sims', sims, 'q', qinfo, 'acts', acts)
starts0 = {}
eps = []
for r in res:
    if r['m'][W].get('frames') is None: continue
    f0 = r['m'][W]['frames'][0]
    eps.append(dict(t=r['t'], K=r['K'], stab0=r['stab0'], nAct=len(f0['on']), m={m: dict(kpi=r['m'][m]['kpi'], sustained=r['m'][m]['sustained'], vh=r['m'][m]['vh'], used=r['m'][m]['used'], log=r['m'][m]['log'], stabs=r['m'][m]['stabs'],
        frames=[dict(s=f['s'], on=f['on'], ctrl=f['ctrl'], stab=f['stab'], st=f['st']) for f in r['m'][m]['frames']]) for m in M}))
out = dict(nodes=D['nodes'], nodeNames=names, edges=[dict(a=e['a'], b=e['b'], sup=e['sup'], br=e['br'], ki=e['ki'], kf=e['kf']) for e in D['edges']], sites=sites,
    stations=[dict(lat=s['lat'], lon=s['lon'], br=s['br'], km=s['km']) for s in D['stations']], methods=M, eps=eps,
    test=dict(n=len(set(r['i'] for r in res)), split=split, byK=byK, pooled=pooled, sims=sims, q=qinfo, acts=acts), selected=dict(seed=sel['seed'], ep=sel['ep'], val=sel['val']),
    docUrl='https://claude.ai/code/artifact/8aa5d0b4-cc9d-45fd-99f5-808e4251d978')
s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open('results/viz.json', 'w').write(s); print('viz bytes', len(s), 'eps', len(eps))
json.dump(dict(byK=byK, pooled=pooled, sims=sims, q=qinfo, acts=acts, split=split, selected=dict(seed=sel['seed'], ep=sel['ep'], val=sel['val'])), open('results/summary.json', 'w'), ensure_ascii=False, indent=1)
