"""VDM por sentido do DNIT (VDM_Modelagem_2019_SNV_202001A) para cada trecho do simulador.

Gera data/derived/vdm_dnit.json com, para cada trecho (mesma ordem de rsdata.json):
  C   = volume diário médio no sentido crescente do km (VMDa_C)
  D   = volume diário médio no sentido decrescente (VMDa_D; se ausente, usa C)
  pes = fração de veículos pesados
  cob = fração da extensão do trecho coberta por segmentos da planilha com VDM
  src = 'dnit' (veio da planilha) ou 'snv' (sem dado na planilha: mantém VDM do cadastro ÷ 2 por sentido)
Os segmentos da planilha são casados por BR e sobreposição de km, com média ponderada pela extensão."""
import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
import json, warnings
import numpy as np, pandas as pd
warnings.filterwarnings('ignore')
X = pd.read_excel('../data/raw/VDM_Modelagem_2019_SNV_202001A.xlsx', sheet_name='SNV_202001A', header=1)
rs = X[X['sg_uf'] == 'RS'].copy()
for c in ['VMDa_C', 'VMDa_D', 'vl_km_inic', 'vl_km_fina', '% Veic. Pesados']:
    rs[c] = pd.to_numeric(rs[c], errors='coerce')
D = json.load(open('../data/derived/rsdata.json', encoding='utf-8'))
out, nd = [], 0
for e in D['edges']:
    r = rs[rs.vl_br == e['br']]
    ov = np.clip(np.minimum(r.vl_km_fina, e['kf']) - np.maximum(r.vl_km_inic, e['ki']), 0, None)
    r = r.assign(ov=ov)[ov > 0]
    r = r[r['VMDa_C'].notna()]
    L = max(e['kf'] - e['ki'], 1e-6)
    if len(r):
        w = r.ov / r.ov.sum()
        C = float((r.VMDa_C * w).sum()); Dv = float((r.VMDa_D.fillna(r.VMDa_C) * w).sum())
        pes = float((r['% Veic. Pesados'].fillna(0) * w).sum())
        out.append(dict(C=round(C, 1), D=round(Dv, 1), pes=round(pes, 4), cob=round(min(1, r.ov.sum() / L), 3), src='dnit')); nd += 1
    else:
        h = max(e['vdm'], 1) / 2
        out.append(dict(C=h, D=h, pes=None, cob=0, src='snv'))
json.dump(out, open('../data/derived/vdm_dnit.json', 'w', encoding='utf-8'), ensure_ascii=False)
km = np.array([e['km'] for e in D['edges']]); ok = np.array([o['src'] == 'dnit' for o in out])
print(f'trechos com VDM do DNIT: {nd} de {len(out)} ({km[ok].sum():.0f} de {km.sum():.0f} km)')
