# P4 simplificado — o Guloso com modelo imperfeito

O episódio real usa o simulador verdadeiro; só as simulações de teste do Guloso usam o modelo imperfeito. Decide a cada 60 min. 100 cenários × K ∈ {1,3,5,10} = 400 episódios. IC 95% por bootstrap agrupado por cenário.

| Método | Média (h) | Não estabilizou |
|---|---|---|
| D1-DDQN | 4,05 | 0,5% |
| D1-Q1 | 4,07 | 0,3% |
| D2P-Q1 | 3,97 | 0,5% |
| Esperar | 4,79 | 3,0% |
| Guloso 1 h, 5 ações, modelo perfeito | 4,38 | 3,0% |
| Guloso 1 h, 5 ações, sem saber tempos de remoção e fins | 4,45 | 3,0% |
| Guloso 1 h, 5 ações, tempos + demanda ±20% + filas ±20% | 4,49 | 4,0% |
| Guloso 6 h, 5 ações, modelo perfeito | 3,71 | 0,3% |
| Guloso 6 h, 5 ações, sem saber tempos de remoção e fins | 3,75 | 0,3% |
| Guloso 6 h, 5 ações, tempos + demanda ±20% + filas ±20% | 3,79 | 0,3% |
| Guloso 1 h, só desobstruir, modelo perfeito | 4,67 | 3,0% |
| Guloso 1 h, só desobstruir, sem saber tempos de remoção e fins | 4,79 | 3,0% |
| Guloso 1 h, só desobstruir, tempos + demanda ±20% + filas ±20% | 4,79 | 3,0% |
| Guloso 6 h, só desobstruir, modelo perfeito | 3,81 | 0,3% |
| Guloso 6 h, só desobstruir, sem saber tempos de remoção e fins | 3,84 | 0,3% |
| Guloso 6 h, só desobstruir, tempos + demanda ±20% + filas ±20% | 3,89 | 0,3% |

| Comparação | Diferença | IC 95% | Significativo? |
|---|---|---|---|
| Guloso 1 h, 5 ações, sem saber tempos de remoção e fins − Guloso 1 h, 5 ações, modelo perfeito | +0,07 h | +0,01 a +0,13 | sim |
| Guloso 1 h, 5 ações, tempos + demanda ±20% + filas ±20% − Guloso 1 h, 5 ações, modelo perfeito | +0,11 h | +0,03 a +0,21 | sim |
| Guloso 1 h, 5 ações, tempos + demanda ±20% + filas ±20% − D1-DDQN | +0,44 h | +0,08 a +0,79 | sim |
| Guloso 1 h, 5 ações, tempos + demanda ±20% + filas ±20% − D2P-Q1 | +0,52 h | +0,19 a +0,89 | sim |
| Guloso 6 h, 5 ações, sem saber tempos de remoção e fins − Guloso 6 h, 5 ações, modelo perfeito | +0,04 h | −0,05 a +0,14 | não |
| Guloso 6 h, 5 ações, tempos + demanda ±20% + filas ±20% − Guloso 6 h, 5 ações, modelo perfeito | +0,08 h | −0,04 a +0,23 | não |
| Guloso 6 h, 5 ações, tempos + demanda ±20% + filas ±20% − D1-DDQN | −0,26 h | −0,41 a −0,14 | sim |
| Guloso 6 h, 5 ações, tempos + demanda ±20% + filas ±20% − D2P-Q1 | −0,17 h | −0,30 a −0,05 | sim |
| Guloso 1 h, só desobstruir, sem saber tempos de remoção e fins − Guloso 1 h, só desobstruir, modelo perfeito | +0,12 h | +0,04 a +0,21 | sim |
| Guloso 1 h, só desobstruir, tempos + demanda ±20% + filas ±20% − Guloso 1 h, só desobstruir, modelo perfeito | +0,12 h | +0,04 a +0,21 | sim |
| Guloso 1 h, só desobstruir, tempos + demanda ±20% + filas ±20% − D1-DDQN | +0,74 h | +0,49 a +1,03 | sim |
| Guloso 1 h, só desobstruir, tempos + demanda ±20% + filas ±20% − D2P-Q1 | +0,82 h | +0,53 a +1,16 | sim |
| Guloso 6 h, só desobstruir, sem saber tempos de remoção e fins − Guloso 6 h, só desobstruir, modelo perfeito | +0,03 h | −0,03 a +0,10 | não |
| Guloso 6 h, só desobstruir, tempos + demanda ±20% + filas ±20% − Guloso 6 h, só desobstruir, modelo perfeito | +0,08 h | −0,01 a +0,20 | não |
| Guloso 6 h, só desobstruir, tempos + demanda ±20% + filas ±20% − D1-DDQN | −0,16 h | −0,28 a −0,05 | sim |
| Guloso 6 h, só desobstruir, tempos + demanda ±20% + filas ±20% − D2P-Q1 | −0,07 h | −0,17 a +0,02 | não |

Escolhas desta análise (declaradas antes dos resultados): tempo de remoção = o típico do tipo; fim natural desconhecido = dura até o fim do teste; demanda com fator fixo por cenário entre 0,8 e 1,2; filas com fator por sentido entre 0,8 e 1,2 a cada decisão.
