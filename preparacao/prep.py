import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
import sys, json, math, collections
import pandas as pd, numpy as np

U = sys.argv[1] if len(sys.argv) > 1 else '../data/raw'
OUT = sys.argv[2] if len(sys.argv) > 2 else '../data/derived/rsdata.json'
j = json.load(open(U + '/network.json'))

# ---------- nodes / edges ----------
node_ids = list(j['nodes'].keys())
pt = {}
for k, v in j['nodes'].items():
    la, lo = [float(s) for s in v['ponto'].split(',')]
    pt[k] = (la, lo)
touch = collections.defaultdict(set)
for a in j['edges']:
    d = a['data']
    if d['superficie_federal'] != 'PLA':
        touch[a['node1']].add(d['br']); touch[a['node2']].add(d['br'])
E = []
for a in j['edges']:
    d = a['data']
    if d['superficie_federal'] == 'PLA' and not (d['br'] in touch[a['node1']] and d['br'] in touch[a['node2']]):
        continue
    E.append(dict(n1=a['node1'], n2=a['node2'], **d))
used = sorted({e['n1'] for e in E} | {e['n2'] for e in E})
nidx = {k: i for i, k in enumerate(used)}

# orientation: is n1 at km_inicial ?
by_node_br = collections.defaultdict(list)
for i, e in enumerate(E):
    by_node_br[(e['n1'], e['br'])].append(i)
    by_node_br[(e['n2'], e['br'])].append(i)


def orient(i):
    e = E[i]
    votes = 0
    for node, sign in ((e['n1'], 1), (e['n2'], -1)):
        for k in by_node_br[(node, e['br'])]:
            if k == i:
                continue
            o = E[k]
            if abs(o['km_final'] - e['km_inicial']) < 0.6:
                votes += sign      # node is start of e
            if abs(o['km_inicial'] - e['km_final']) < 0.6:
                votes -= sign      # node is end of e
    return 1 if votes > 0 else -1 if votes < 0 else 0


# vdm imputation along same BR neighbours
vdm = [float(e['vdm_medio']) for e in E]
imp = [v <= 0 for v in vdm]
for _ in range(10):
    changed = False
    for i, e in enumerate(E):
        if vdm[i] > 0:
            continue
        nb = [vdm[k] for node in (e['n1'], e['n2']) for k in by_node_br[(node, e['br'])] if k != i and vdm[k] > 0]
        if nb:
            vdm[i] = float(np.mean(nb)); changed = True
    if not changed:
        break
for i, e in enumerate(E):
    if vdm[i] <= 0:
        vdm[i] = 400.0 if e['superficie_federal'] == 'IMP' else 2000.0

edges_out = []
for i, e in enumerate(E):
    lanes = max(1, int(e['numero_pistas']) // 2)
    edges_out.append(dict(a=nidx[e['n1']], b=nidx[e['n2']], br=int(e['br']), snv=e['codigo_snv'],
                          ki=e['km_inicial'], kf=e['km_final'], km=round(float(e['distancia']), 2),
                          lanes=lanes, sup=e['superficie_federal'], vdm=round(vdm[i]), imp=bool(imp[i]),
                          o=orient(i), sin=int(e['sinistros'])))
print('edges', len(edges_out), 'oriented', sum(1 for e in edges_out if e['o'] != 0), 'imputed', sum(imp))

# ---------- PNCT ----------
p = pd.read_parquet(U + '/pntc_rs_unificado.parquet')
cls = ['onibus_cam_2eixos', 'onibus_cam_3eixos', 'cam_4eixos', 'cam_5eixos', 'cam_6eixos', 'cam_7eixos',
       'cam_8eixos', 'cam_9eixos', 'passeio', 'motocicleta', 'indefinido']
for c in cls:
    p[c] = pd.to_numeric(p[c], errors='coerce').fillna(0)
p['vol'] = p[cls].sum(axis=1)
p['heavy'] = p[cls[:8]].sum(axis=1)
p['dt'] = pd.to_datetime(p['Data'], format='%d/%m/%Y', errors='coerce') + pd.to_timedelta(pd.to_numeric(p['Hora']), unit='h')
p['kmf'] = pd.to_numeric(p['Km'].str.replace(',', '.'), errors='coerce')
p['brn'] = pd.to_numeric(p['BR'], errors='coerce').astype(int)
p['lat'] = pd.to_numeric(p['Latitude'].str.replace(',', '.'), errors='coerce')
p['lon'] = pd.to_numeric(p['Longitude'].str.replace(',', '.'), errors='coerce')
p = p.dropna(subset=['dt'])

# normal profile from 2023: hourly volume / daily volume, by day of week
q = p[p['dt'].dt.year == 2023].copy()
q['day'] = q['dt'].dt.normalize()
tot = q.groupby(['brn', 'kmf', 'dt'])['vol'].sum().reset_index()
tot['day'] = tot['dt'].dt.normalize()
dsum = tot.groupby(['brn', 'kmf', 'day'])['vol'].transform('sum')
cnt = tot.groupby(['brn', 'kmf', 'day'])['vol'].transform('size')
tot = tot[(cnt == 24) & (dsum > 0)]
mean_daily = tot.groupby(['brn', 'kmf'])['vol'].sum() / tot.groupby(['brn', 'kmf'])['day'].nunique()
tot['md'] = tot.set_index(['brn', 'kmf']).index.map(mean_daily)
tot['f'] = tot['vol'] / tot['md']
tot['dow'] = tot['dt'].dt.dayofweek
tot['h'] = tot['dt'].dt.hour
prof = tot.groupby(['dow', 'h'])['f'].mean().unstack().values  # 7x24, mean daily = 1
prof = prof / prof.sum(axis=1).mean()
print('profile day sums', prof.sum(axis=1).round(3))
heavy_share = float(p[p['dt'].dt.year == 2023]['heavy'].sum() / p[p['dt'].dt.year == 2023]['vol'].sum())

# stations -> edges ; observed 2024 window
T0 = pd.Timestamp('2024-04-27 00:00')
T1 = pd.Timestamp('2024-06-24 00:00')
nh = int((T1 - T0) / pd.Timedelta(hours=1))
stations = []
for (br, km), g in p.groupby(['brn', 'kmf']):
    cand = [i for i, e in enumerate(edges_out) if e['br'] == br and e['ki'] - 0.5 <= km <= e['kf'] + 0.5]
    lat, lon = g['lat'].iloc[0], g['lon'].iloc[0]
    w = g[(g['dt'] >= T0) & (g['dt'] < T1)]
    obs = [None] * nh
    obsC = [None] * nh; obsD = [None] * nh
    for (dt, s), v in w.groupby(['dt', 'Sentido'])['vol'].sum().items():
        k = int((dt - T0) / pd.Timedelta(hours=1))
        if s == 'C':
            obsC[k] = int(v)
        else:
            obsD[k] = int(v)
    for k in range(nh):
        if obsC[k] is not None or obsD[k] is not None:
            obs[k] = (obsC[k] or 0) + (obsD[k] or 0)
    # normal reference: 2023 mean by dow/hour, both directions
    g23 = g[g['dt'].dt.year == 2023]
    ref = None
    if len(g23):
        r = g23.groupby('dt')['vol'].sum().reset_index()
        r['dow'] = r['dt'].dt.dayofweek; r['h'] = r['dt'].dt.hour
        rr = r.groupby(['dow', 'h'])['vol'].mean()
        ref = [[int(round(rr.get((d, h), 0))) for h in range(24)] for d in range(7)]
    has = sum(1 for v in obs if v is not None)
    if not cand:
        continue
    key = (br, round(km, 2))
    if any((s['br'], s['km']) == key for s in stations):
        # merge duplicate formats (comma/point) -> fill gaps
        s = [s for s in stations if (s['br'], s['km']) == key][0]
        s['obs'] = [a if a is not None else b for a, b in zip(s['obs'], obs)]
        if s['ref'] is None:
            s['ref'] = ref
        continue
    stations.append(dict(br=br, km=round(km, 2), lat=round(lat, 5), lon=round(lon, 5), e=cand[0], obs=obs, ref=ref))
stations = [s for s in stations if sum(1 for v in s['obs'] if v is not None) > 24]
print('stations with 2024 window data', len(stations))

# ---------- interdictions ----------
nodes_xy = [pt[k] for k in used]
x = pd.read_excel(U + '/ocorrencias-interdicoes_rs_chuvas_2024.xlsx')
ints = []
miss = 0
for _, r in x.iterrows():
    br, km = int(r['br']), float(r['km'])
    cand = [i for i, e in enumerate(edges_out) if e['br'] == br and e['ki'] - 0.3 <= km <= e['kf'] + 0.3]
    ei = None; km_eff = km; fr_geo = None; approx = False
    if cand:
        ei = min(cand, key=lambda i: 0 if edges_out[i]['ki'] <= km <= edges_out[i]['kf'] else 1)
    if ei is None and br == 290 and 92 <= km <= 112.3:
        # BR-290 coincide com a BR-116 entre os km 92 e 112,3 (Porto Alegre - Eldorado do Sul)
        km2 = 270.4 + (km - 92)
        cand = [i for i, e in enumerate(edges_out) if e['br'] == 116 and e['ki'] <= km2 <= e['kf']]
        if cand:
            ei = cand[0]; br_eff, km_eff = 116, km2; approx = 'BR-116'
    if ei is None and pd.notna(r['Latitude']):
        la, lo = float(r['Latitude']), float(r['Longitude'])
        best, bd = None, 1e9
        for i, e in enumerate(edges_out):
            (a1, o1), (a2, o2) = nodes_xy[e['a']], nodes_xy[e['b']]
            X, Y = lo * math.cos(math.radians(la)) * 111, la * 111
            x1, y1, x2, y2 = o1 * math.cos(math.radians(la)) * 111, a1 * 111, o2 * math.cos(math.radians(la)) * 111, a2 * 111
            vx, vy = x2 - x1, y2 - y1
            t = max(0, min(1, ((X - x1) * vx + (Y - y1) * vy) / (vx * vx + vy * vy + 1e-12)))
            dd = math.hypot(X - x1 - vx * t, Y - y1 - vy * t)
            if dd < bd:
                bd, best, bt = dd, i, t
        if bd < 4:
            ei = best; km_eff = None; fr_geo = bt; approx = True
    if ei is None:
        miss += 1
        print('UNMATCHED', br, km, r['Nome do município'])
        continue
    e = edges_out[ei]
    span = max(1e-6, e['kf'] - e['ki'])
    frac = fr_geo if km_eff is None else min(1, max(0, (km_eff - e['ki']) / span))
    if km_eff is None and e['o'] == -1:
        frac = 1 - frac  # fr_geo is measured from node a; convert to km direction below
    if e['o'] == -1 and km_eff is not None:
        pass
    amp = str(r['Amplitude'])
    d = 0 if 'Ambos' in amp else (1 if 'Crescente' in amp else -1)
    txt = str(r['Situação/Pauta de reivindicações']) if pd.notna(r['Situação/Pauta de reivindicações']) else ''
    txt = ' '.join(txt.split())[:220]
    ints.append(dict(s=int((r['data_hora_inicial'] - T0) / pd.Timedelta(minutes=1)),
                     f=int((r['data_hora_final'] - T0) / pd.Timedelta(minutes=1)),
                     br=br, km=km, mun=str(r['Nome do município']).title(), e=ei, fr=round(frac, 3), d=d, txt=txt, ap=approx))
print('interdictions matched', len(ints), 'unmatched', miss)

nodes_out = [[round(pt[k][0], 5), round(pt[k][1], 5)] for k in used]
data = dict(t0='2024-04-27T00:00:00', nh=nh, nodes=nodes_out, edges=edges_out, prof=[[round(v, 5) for v in row] for row in prof],
            heavy=round(heavy_share, 3), stations=stations, ints=ints)
json.dump(data, open(OUT, 'w'), separators=(',', ':'), ensure_ascii=False)
import os
print('json bytes', os.path.getsize(OUT))
