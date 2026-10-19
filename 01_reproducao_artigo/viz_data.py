import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
import json, numpy as np
z = np.load('results/snap.npz', allow_pickle=True)
R = json.load(open('results/results.json'))
pt = z['pt']; src, dst = z['src'], z['dst']; nE2 = len(src); nE = nE2 // 2
CIT = [('Porto Alegre',-30.03,-51.23),('Caxias do Sul',-29.17,-51.18),('Pelotas',-31.77,-52.34),('Santa Maria',-29.69,-53.81),('Passo Fundo',-28.26,-52.41),('Uruguaiana',-29.75,-57.09),('Lajeado',-29.47,-51.96),('Osório',-29.89,-50.27),('Santa Cruz do Sul',-29.72,-52.43),('Rio Grande',-32.03,-52.10),('Bagé',-31.33,-54.10),('Erechim',-27.63,-52.27),('Santo Ângelo',-28.30,-54.26),('Torres',-29.33,-49.73),('Vacaria',-28.51,-50.93),('Alegrete',-29.78,-55.79),('Santana do Livramento',-30.89,-55.53),('Cruz Alta',-28.64,-53.61),('Camaquã',-30.85,-51.81),('Novo Hamburgo',-29.68,-51.13),('Canoas',-29.92,-51.18),('Eldorado do Sul',-30.08,-51.62),('Bento Gonçalves',-29.17,-51.52),('Cachoeira do Sul',-30.04,-52.89),('Montenegro',-29.69,-51.46),('Estrela',-29.50,-51.96),('Soledade',-28.83,-52.51),('Ijuí',-28.39,-53.91),('São Borja',-28.66,-56.00),('Carazinho',-28.28,-52.79),('Frederico Westphalen',-27.36,-53.39),('Jaguarão',-32.56,-53.38),('São Gabriel',-30.34,-54.32),('Palmeira das Missões',-27.90,-53.31),('Lagoa Vermelha',-28.21,-51.53),('Guaíba',-30.11,-51.33),('Rio Pardo',-29.99,-52.38),('Itaqui',-29.13,-56.55),('Rosário do Sul',-30.25,-54.92),('Santa Vitória do Palmar',-33.52,-53.37)]
br = z['br']
names = []
for n in range(int(z['nN'])):
    brs = sorted({int(br[e // 2]) for e in range(nE2) if src[e] == n or dst[e] == n})
    la, lo = pt[n]
    c = min(CIT, key=lambda c: (c[1]-la)**2 + ((c[2]-lo)*0.87)**2)
    dkm = (((c[1]-la)*111)**2 + ((c[2]-lo)*111*0.87)**2) ** .5
    names.append(('Entroncamento ' if len(brs) > 1 else 'Ponto da ') + ' × '.join('BR-%d' % b for b in brs) + (' em ' if dkm < 8 else ' a %d km de ' % round(dkm)) + c[0])
eps = []
for it in R['episodes']:
    t0 = it['t0']
    P = [[round(float(v), 2) for v in z['P'][t0 + k]] for k in range(5)]
    I = [[1 if v > 0 else 0 for v in z['I'][t0 + k]] for k in range(5)]
    eps.append(dict(day=it['day'], split=it['split'], P=P, I=I, shortlist=it['shortlist0'], methods=it['methods']))
out = dict(nodes=[[round(float(a), 5), round(float(b), 5)] for a, b in pt], names=names,
           edges=[[int(src[2 * i]), int(dst[2 * i]), str(z['sup'][i]), int(br[i])] for i in range(nE)],
           days=[str(d) for d in z['days'][[it['t0'] for it in R['episodes']]]],
           eps=eps, table=R['table'], paired=R['paired'], paired_greedy=R['paired_greedy'], lambdas=R['lambdas'],
           selected=R['selected'], val=R['val'], split_dates=R['split_dates'], ntest=len(R['test_days']),
           conf_share={'observado': 6.7, 'repetição': 0.4, 'vizinhos': 17.9, 'média da aresta': 4.0, 'VDM estático': 43.8, 'média global': 27.1})
s = json.dumps(out, separators=(',', ':'), ensure_ascii=False)
open('results/viz.json', 'w').write(s); print(len(s))
print(names[:5])
