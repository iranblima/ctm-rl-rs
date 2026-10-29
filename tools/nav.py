"""Insere (ou atualiza) a barra de troca de cenário nas páginas do simulador e nos modelos.
Uso: python tools/nav.py   (idempotente: substitui o bloco entre <!--NAV--> e <!--/NAV-->)"""
import re, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CEN = [('A', 'desobstrucao-rs.html', 'Enchentes 2024 (real)', ['simulador/viewer.html']),
       ('B', 'desobstrucao-rs-b.html', 'Rede inteira observável', ['simulador_b/viewer.html']),
       ('C', 'desobstrucao-rs-c.html', 'Quatro tipos de obstrução', ['simulador_c/viewer.html']),
       ('C2', 'desobstrucao-rs-c2.html', 'Épocas de decisão', ['simulador_c2/viewer.html']),
       ('D', 'desobstrucao-rs-d.html', 'Só desobstruir', ['simulador_d/viewer.html']),
       ('D2', 'desobstrucao-rs-d2.html', 'Guloso a cada 15 min', ['simulador_d2/viewer.html'])]
CSS = ('<style>.scn-nav{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin:0 0 14px;font:500 13px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif}'
       '.scn-nav .lb{color:inherit;opacity:.7;margin-right:2px}'
       '.scn-nav a{display:inline-flex;gap:6px;align-items:baseline;padding:5px 11px;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:999px;color:inherit;text-decoration:none}'
       '.scn-nav a:hover{border-color:currentColor}.scn-nav a b{font-weight:700}.scn-nav a span{opacity:.75}'
       '.scn-nav a[aria-current="page"]{background:currentColor}.scn-nav a[aria-current="page"] b,.scn-nav a[aria-current="page"] span{color:Canvas;opacity:1}'
       '@media (max-width:620px){.scn-nav a span{display:none}}</style>')
def bloco(atual):
    AC = ' aria-current="page"'
    links = ''.join('<a href="%s"%s><b>%s</b><span>%s</span></a>' % (f, AC if c == atual else '', c, d) for c, f, d, _ in CEN)
    return f'<!--NAV-->{CSS}<nav class="scn-nav" aria-label="Cenários"><span class="lb">Cenário:</span>{links}</nav><!--/NAV-->'
def aplica(path, atual):
    p = os.path.join(R, path)
    if not os.path.exists(p): print('não existe', path); return
    s = open(p, encoding='utf-8').read()
    s = re.sub(r'<!--NAV-->.*?<!--/NAV-->', '', s, count=1, flags=re.S)
    assert '<div class="wrap">' in s, path
    s = s.replace('<div class="wrap">', '<div class="wrap">\n  ' + bloco(atual), 1)
    open(p, 'w', encoding='utf-8').write(s); print('ok', path)
for c, f, d, modelos in CEN:
    for m in ['paginas/' + f] + modelos: aplica(m, c)
