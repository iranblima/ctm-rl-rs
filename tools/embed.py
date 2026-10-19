"""Embute um JSON de dados num modelo HTML (substitui __DATA__) e grava a página final.
Uso: python tools/embed.py <modelo.html> <dados.json> <saida.html>"""
import sys
t = open(sys.argv[1], encoding='utf-8').read()
d = open(sys.argv[2], encoding='utf-8').read().replace('</', '<\\/')
assert '__DATA__' in t, 'o modelo não tem __DATA__'
open(sys.argv[3], 'w', encoding='utf-8').write(t.replace('__DATA__', d))
print('ok', sys.argv[3])
