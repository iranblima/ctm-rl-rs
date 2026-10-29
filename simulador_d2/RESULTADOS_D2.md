# Cenário D2 — Guloso decidindo a cada 15 min

Mesmo cenário D (políticas aprendidas já treinadas, sem novo treino), com o Guloso decidindo a cada 15 min, a mesma frequência das políticas aprendidas. A regra de escolha é a do cenário C, sem alteração: testa cada ação no simulador por 1 h e fica com a que deixa mais trechos estáveis (empate: menos veículo-hora; empate total: esperar). Depois de escolher, aplica a ação e decide de novo 15 min depois. Rodado com as 5 ações e só com esperar/desobstruir.

Teste: 100 cenários × K ∈ {1,3,5,10} = 400 episódios (os mesmos do D e do C2). KPI em horas até ≥ 80% dos 630 sentidos estáveis; menor é melhor.

## Tempo até estabilizar (média, horas)

| Método | K=1 | K=3 | K=5 | K=10 | Média | Veículo-hora | Ações usadas |
|---|---|---|---|---|---|---|---|
| Esperar | 4,79 | 4,79 | 4,79 | 4,79 | **4,79** | 13.109 | 0,00 |
| Aleatória | 4,59 | 4,34 | 4,21 | 4,25 | **4,35** | 11.993 | 2,55 |
| D1-Q1 | 4,42 | 4,05 | 3,87 | 3,94 | **4,07** | 11.312 | 3,13 |
| D1-DDQN | 4,46 | 4,11 | 3,88 | 3,76 | **4,05** | 11.155 | 3,31 |
| D2L-Q1 | 4,48 | 3,95 | 3,79 | 3,75 | **3,99** | 10.858 | 3,75 |
| D2L-DDQN | 4,33 | 4,00 | 3,88 | 3,77 | **4,00** | 10.842 | 3,34 |
| D2P-Q1 | 4,40 | 3,94 | 3,73 | 3,80 | **3,97** | 10.757 | 3,17 |
| D2P-DDQN | 4,57 | 4,05 | 3,85 | 3,83 | **4,08** | 11.002 | 3,46 |
| Guloso 60 min, 5 ações | 4,49 | 4,41 | 4,39 | 4,38 | **4,42** | 11.768 | 2,14 |
| Guloso 60 min, só desobstruir | 4,67 | 4,67 | 4,67 | 4,67 | **4,67** | 12.775 | 0,46 |
| Guloso 15 min, 5 ações | 4,49 | 4,40 | 4,35 | 4,32 | **4,39** | 11.731 | 3,42 |
| Guloso 15 min, só desobstruir | 4,67 | 4,67 | 4,67 | 4,67 | **4,67** | 12.772 | 0,49 |

## Contrastes pareados (KPI, horas; negativo = o primeiro foi mais rápido)

| Contraste | Diferença | IC 95% | Melhor / empate / pior |
|---|---|---|---|
| D1-Q1 − Guloso 15 min, 5 ações | −0,32 h | −0,51 a −0,14 | 40% / 32% / 28% |
| D1-DDQN − Guloso 15 min, 5 ações | −0,34 h | −0,53 a −0,15 | 38% / 33% / 29% |
| D2L-Q1 − Guloso 15 min, 5 ações | −0,40 h | −0,60 a −0,20 | 40% / 31% / 29% |
| D2L-DDQN − Guloso 15 min, 5 ações | −0,40 h | −0,59 a −0,20 | 41% / 32% / 28% |
| D2P-Q1 − Guloso 15 min, 5 ações | −0,42 h | −0,61 a −0,24 | 42% / 30% / 28% |
| D2P-DDQN − Guloso 15 min, 5 ações | −0,31 h | −0,50 a −0,14 | 38% / 34% / 28% |
| D1-Q1 − Guloso 15 min, só desobstruir | −0,60 h | −0,78 a −0,44 | 34% / 57% / 9% |
| D1-DDQN − Guloso 15 min, só desobstruir | −0,62 h | −0,78 a −0,46 | 33% / 57% / 10% |
| D2L-Q1 − Guloso 15 min, só desobstruir | −0,68 h | −0,86 a −0,51 | 34% / 56% / 10% |
| D2L-DDQN − Guloso 15 min, só desobstruir | −0,68 h | −0,84 a −0,50 | 36% / 55% / 9% |
| D2P-Q1 − Guloso 15 min, só desobstruir | −0,70 h | −0,89 a −0,53 | 36% / 54% / 11% |
| D2P-DDQN − Guloso 15 min, só desobstruir | −0,59 h | −0,76 a −0,44 | 31% / 59% / 10% |
| Guloso 15 min, 5 ações − Guloso 60 min, 5 ações | −0,03 h | −0,07 a +0,01 | 12% / 75% / 14% |
| Guloso 15 min, só desobstruir − Guloso 60 min, só desobstruir | 0,00 h | 0,00 a 0,00 | 0% / 100% / 0% |
| Guloso 15 min, só desobstruir − Guloso 15 min, 5 ações | +0,28 h | +0,15 a +0,43 | 20% / 52% / 29% |
| Esperar − Guloso 15 min, 5 ações | +0,40 h | +0,26 a +0,55 | 15% / 48% / 37% |

## Por orçamento K (política aprendida − Guloso 15 min, 5 ações)

| Contraste | K=1 | K=3 | K=5 | K=10 |
|---|---|---|---|---|
| D1-Q1 − Guloso 15 min, 5 ações | −0,07 [−0,43; +0,28] | −0,35 [−0,75; +0,02] | −0,48 [−0,89; −0,10] | −0,39 [−0,78; −0,03] |
| D1-DDQN − Guloso 15 min, 5 ações | −0,03 [−0,33; +0,29] | −0,29 [−0,68; +0,10] | −0,47 [−0,88; −0,07] | −0,56 [−0,99; −0,17] |
| D2L-Q1 − Guloso 15 min, 5 ações | −0,01 [−0,35; +0,36] | −0,45 [−0,87; −0,07] | −0,56 [−1,00; −0,17] | −0,57 [−0,98; −0,19] |
| D2L-DDQN − Guloso 15 min, 5 ações | −0,16 [−0,53; +0,21] | −0,40 [−0,82; +0,01] | −0,47 [−0,89; −0,07] | −0,55 [−0,96; −0,15] |
| D2P-Q1 − Guloso 15 min, 5 ações | −0,09 [−0,40; +0,22] | −0,46 [−0,84; −0,10] | −0,62 [−1,04; −0,23] | −0,52 [−0,93; −0,14] |
| D2P-DDQN − Guloso 15 min, 5 ações | +0,08 [−0,18; +0,39] | −0,35 [−0,76; +0,05] | −0,50 [−0,91; −0,13] | −0,49 [−0,88; −0,16] |
| Esperar − Guloso 15 min, 5 ações | +0,30 [+0,06; +0,61] | +0,39 [+0,15; +0,70] | +0,44 [+0,19; +0,75] | +0,47 [+0,21; +0,79] |

## Ações do Guloso no teste (total de decisões nos 400 episódios)

| Guloso | WAIT | DESOB | INTERR | CTRL50 | LIBERAR | Decisões por episódio |
|---|---|---|---|---|---|---|
| Guloso 60 min, 5 ações | 1017 | 78 | 581 | 27 | 170 | 4,68 |
| Guloso 60 min, só desobstruir | 1820 | 184 | 0 | 0 | 0 | 5,01 |
| Guloso 15 min, 5 ações | 5607 | 107 | 814 | 56 | 393 | 17,44 |
| Guloso 15 min, só desobstruir | 7229 | 196 | 0 | 0 | 0 | 18,56 |
