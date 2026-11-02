# P1 — feedback sequencial: replanejar × plano fixo (mesma política)

Cada política aprendida (D1-Q1 e D1-DDQN do cenário D, sem novo treino) é comparada **com ela mesma**: **replanejar** (a cada decisão recebe a observação nova do tráfego) × **plano fixo** (a observação do tráfego fica congelada no início; só relógio, orçamento e tempo desde o início de cada obstrução são atualizados, então o plano todo é determinado em t0). Calendário fixo de decisões, igual nos dois modos. Só esperar/desobstruir. 100 cenários de teste × K ∈ {1,3,5,10}. IC 95% por bootstrap agrupado por cenário.

**Condições:** *determinística* = cenários do D sem mudança (a política já não conhece o tempo exato de remoção nem as filas). *Novas obstruções* = os mesmos cenários + 1 a 4 obstruções que começam entre 30 min e 6 h depois da primeira decisão, desconhecidas no início.

## Determinística, decisão a cada 60 min

| Política · modo | K=1 | K=3 | K=5 | K=10 | Média | Não estabilizou | Desobstruções/episódio | Planejadas já inviáveis | Novas desobstruídas |
|---|---|---|---|---|---|---|---|---|---|
| D1-Q1 · replanejar | 4,58 | 4,21 | 4,17 | 4,12 | **4,27** | 0,8% | 2,71 | 0,00 | — |
| D1-Q1 · plano fixo | 4,58 | 4,30 | 4,31 | 4,33 | **4,38** | 0,8% | 2,11 | 0,99 | — |
| D1-DDQN · replanejar | 4,56 | 4,33 | 4,44 | 4,45 | **4,44** | 2,3% | 2,19 | 0,00 | — |
| D1-DDQN · plano fixo | 4,56 | 4,30 | 4,36 | 4,42 | **4,41** | 1,5% | 1,82 | 0,34 | — |

| Comparação | Diferença | IC 95% | Significativo? | Melhor / empate / pior |
|---|---|---|---|---|
| D1-Q1 · replanejar − D1-Q1 · plano fixo | −0,11 h | −0,17 a −0,05 | sim | 13% / 85% / 3% |
| D1-DDQN · replanejar − D1-DDQN · plano fixo | +0,04 h | −0,03 a +0,12 | não | 4% / 91% / 5% |
| D1-DDQN · replanejar − D1-Q1 · replanejar | +0,17 h | +0,01 a +0,37 | sim | 16% / 64% / 21% |
| D1-DDQN · plano fixo − D1-Q1 · plano fixo | +0,03 h | −0,10 a +0,17 | não | 17% / 67% / 16% |
| Perda do DDQN sem feedback − perda do Q1 sem feedback | −0,14 h | −0,24 a −0,06 | sim | |

## Determinística, decisão a cada 15 min

| Política · modo | K=1 | K=3 | K=5 | K=10 | Média | Não estabilizou | Desobstruções/episódio | Planejadas já inviáveis | Novas desobstruídas |
|---|---|---|---|---|---|---|---|---|---|
| D1-Q1 · replanejar | 4,42 | 4,05 | 3,87 | 3,94 | **4,07** | 0,3% | 3,13 | 0,00 | — |
| D1-Q1 · plano fixo | 4,42 | 3,99 | 3,97 | 4,09 | **4,12** | 0,3% | 2,67 | 0,30 | — |
| D1-DDQN · replanejar | 4,40 | 4,13 | 3,84 | 3,76 | **4,03** | 0,5% | 3,38 | 0,00 | — |
| D1-DDQN · plano fixo | 4,40 | 4,09 | 3,97 | 3,88 | **4,08** | 0,5% | 2,88 | 0,28 | — |

| Comparação | Diferença | IC 95% | Significativo? | Melhor / empate / pior |
|---|---|---|---|---|
| D1-Q1 · replanejar − D1-Q1 · plano fixo | −0,05 h | −0,12 a +0,01 | não | 12% / 82% / 6% |
| D1-DDQN · replanejar − D1-DDQN · plano fixo | −0,05 h | −0,15 a +0,05 | não | 11% / 85% / 5% |
| D1-DDQN · replanejar − D1-Q1 · replanejar | −0,03 h | −0,17 a +0,11 | não | 19% / 62% / 19% |
| D1-DDQN · plano fixo − D1-Q1 · plano fixo | −0,03 h | −0,22 a +0,16 | não | 21% / 59% / 20% |
| Perda do DDQN sem feedback − perda do Q1 sem feedback | +0,00 h | −0,11 a +0,11 | não | |

## Com novas obstruções, decisão a cada 60 min

| Política · modo | K=1 | K=3 | K=5 | K=10 | Média | Não estabilizou | Desobstruções/episódio | Planejadas já inviáveis | Novas desobstruídas |
|---|---|---|---|---|---|---|---|---|---|
| D1-Q1 · replanejar | 5,20 | 4,92 | 4,81 | 4,70 | **4,91** | 2,3% | 2,92 | 0,00 | 0,27 |
| D1-Q1 · plano fixo | 5,20 | 4,95 | 4,99 | 5,00 | **5,04** | 2,8% | 2,19 | 1,07 | 0,00 |
| D1-DDQN · replanejar | 5,18 | 4,85 | 4,83 | 4,89 | **4,94** | 3,3% | 2,39 | 0,00 | 0,25 |
| D1-DDQN · plano fixo | 5,18 | 4,91 | 4,86 | 4,97 | **4,98** | 3,3% | 1,85 | 0,39 | 0,00 |

| Comparação | Diferença | IC 95% | Significativo? | Melhor / empate / pior |
|---|---|---|---|---|
| D1-Q1 · replanejar − D1-Q1 · plano fixo | −0,13 h | −0,20 a −0,07 | sim | 16% / 82% / 2% |
| D1-DDQN · replanejar − D1-DDQN · plano fixo | −0,04 h | −0,09 a +0,00 | não | 11% / 84% / 5% |
| D1-DDQN · replanejar − D1-Q1 · replanejar | +0,03 h | −0,12 a +0,20 | não | 20% / 64% / 17% |
| D1-DDQN · plano fixo − D1-Q1 · plano fixo | −0,06 h | −0,19 a +0,10 | não | 22% / 65% / 13% |
| Perda do DDQN sem feedback − perda do Q1 sem feedback | −0,09 h | −0,15 a −0,03 | sim | |

## Com novas obstruções, decisão a cada 15 min

| Política · modo | K=1 | K=3 | K=5 | K=10 | Média | Não estabilizou | Desobstruções/episódio | Planejadas já inviáveis | Novas desobstruídas |
|---|---|---|---|---|---|---|---|---|---|
| D1-Q1 · replanejar | 5,00 | 4,61 | 4,37 | 4,46 | **4,61** | 1,3% | 3,31 | 0,00 | 0,14 |
| D1-Q1 · plano fixo | 5,00 | 4,64 | 4,50 | 4,72 | **4,72** | 2,0% | 2,68 | 0,32 | 0,00 |
| D1-DDQN · replanejar | 5,06 | 4,80 | 4,38 | 4,21 | **4,62** | 2,3% | 3,59 | 0,00 | 0,23 |
| D1-DDQN · plano fixo | 5,06 | 4,84 | 4,61 | 4,46 | **4,74** | 3,5% | 2,90 | 0,30 | 0,00 |

| Comparação | Diferença | IC 95% | Significativo? | Melhor / empate / pior |
|---|---|---|---|---|
| D1-Q1 · replanejar − D1-Q1 · plano fixo | −0,11 h | −0,19 a −0,04 | sim | 13% / 81% / 6% |
| D1-DDQN · replanejar − D1-DDQN · plano fixo | −0,13 h | −0,24 a −0,02 | sim | 16% / 80% / 4% |
| D1-DDQN · replanejar − D1-Q1 · replanejar | +0,01 h | −0,13 a +0,17 | não | 22% / 61% / 17% |
| D1-DDQN · plano fixo − D1-Q1 · plano fixo | +0,03 h | −0,17 a +0,25 | não | 21% / 60% / 19% |
| Perda do DDQN sem feedback − perda do Q1 sem feedback | +0,02 h | −0,10 a +0,13 | não | |

Negativo em "replanejar − plano fixo" = o feedback ajudou. A última linha de cada tabela mede se o DDQN perde menos que o Q1 ao ficar sem feedback (negativo = o retorno futuro protege quando não dá para replanejar). As novas obstruções, o plano fixo e o calendário são escolhas desta análise, declaradas antes de ver os resultados.
