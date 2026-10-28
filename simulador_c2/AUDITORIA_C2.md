# Cenário C2 — auditoria offline de temporalidade

271 estados (100 cenários de teste novos, no início e depois de 60 e 120 min só esperando, quando ainda instáveis); em média 32,7 ações por estado. Cada ação é aplicada e depois só se espera; o CTM não é usado por nenhuma política.

## Ganho da melhor ação sobre esperar (pontos percentuais de trechos estáveis)

| Horizonte | 15 min | 30 min | 60 min | 120 min | 180 min |
|---|---|---|---|---|---|
| Ganho médio da melhor ação | 0,0 | 0,2 | 0,4 | 0,8 | 1,0 |

## Indicadores de temporalidade

| Indicador | Valor |
|---|---|
| Inversão: melhor ação em 180 min ≠ melhor em 60 min (diferença ≥ 1 pp) | 17,0% dos estados |
| Inversão: melhor ação em 180 min ≠ melhor em 15 min (diferença ≥ 1 pp) | 38,7% dos estados |
| Benefício atrasado: ação sem ganho em 60 min e com ≥ 2 pp em 180 min | 6,3% dos estados |
| Arrependimento míope médio (escolher a melhor de 60 min), em 180 min | 0,5 pp |
| Arrependimento míope no 90º percentil | 1,6 pp |

## Por momento do estado auditado

| Momento | Estados | Inversão | Benefício atrasado | Arrependimento médio |
|---|---|---|---|---|
| 0 min | 100 | 22,0% | 9,0% | 0,7 pp |
| 60 min | 95 | 15,8% | 5,3% | 0,5 pp |
| 120 min | 76 | 11,8% | 3,9% | 0,4 pp |

## Que ações têm benefício atrasado

| Ação | Estados |
|---|---|
| DESOB acidente | 8 |
| DESOB barreira | 6 |
| INTERR | 4 |

## Melhor ação em 60 min × em 180 min

| Ação | Melhor em 60 min | Melhor em 180 min |
|---|---|---|
| INTERR | 186 | 144 |
| WAIT | 53 | 16 |
| DESOB acidente | 25 | 40 |
| CTRL50 | 7 | 7 |
| DESOB barreira | 0 | 64 |

Limiares (1 pp para inversão, 2 pp para benefício atrasado) e a continuação "só esperar" são suposições desta auditoria. A estabilidade usa a janela móvel de 1 h, então em 15 e 30 min o efeito de uma ação aparece só em parte; a comparação mais justa é 60 × 180 min.
