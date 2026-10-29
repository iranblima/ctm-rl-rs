# Cenário D — comparação com o Guloso

Guloso = mesma regra do cenário C, sem alteração: a cada 60 min testa cada ação válida no simulador por 1 h e fica com a que deixa mais trechos estáveis (empate: menos veículo-hora; empate total: esperar). Rodado de duas formas: com as 5 ações (como no cenário C) e só com esperar/desobstruir (o conjunto do D).

Teste: 100 cenários × K ∈ {1,3,5,10} = 400 episódios (os mesmos do D e do C2). KPI em horas; menor é melhor.

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
| Guloso (5 ações) | 4,49 | 4,41 | 4,39 | 4,38 | **4,42** | 11.768 | 2,14 |
| Guloso (esperar/desobstruir) | 4,67 | 4,67 | 4,67 | 4,67 | **4,67** | 12.775 | 0,46 |

## Contrastes pareados (KPI, horas; negativo = o primeiro foi mais rápido)

| Contraste | Diferença | IC 95% | Melhor / empate / pior |
|---|---|---|---|
| Esperar − Guloso (5 ações) | +0,37 h | +0,25 a +0,52 | 12% / 53% / 35% |
| Aleatória − Guloso (5 ações) | −0,07 h | −0,23 a +0,09 | 30% / 42% / 28% |
| D1-Q1 − Guloso (5 ações) | −0,35 h | −0,54 a −0,16 | 40% / 35% / 25% |
| D1-DDQN − Guloso (5 ações) | −0,36 h | −0,55 a −0,18 | 37% / 37% / 27% |
| D2L-Q1 − Guloso (5 ações) | −0,42 h | −0,62 a −0,23 | 39% / 34% / 27% |
| D2L-DDQN − Guloso (5 ações) | −0,42 h | −0,63 a −0,23 | 40% / 35% / 26% |
| D2P-Q1 − Guloso (5 ações) | −0,45 h | −0,64 a −0,27 | 39% / 36% / 26% |
| D2P-DDQN − Guloso (5 ações) | −0,34 h | −0,53 a −0,17 | 36% / 38% / 27% |
| Esperar − Guloso (esperar/desobstruir) | +0,12 h | +0,08 a +0,17 | 0% / 87% / 13% |
| Aleatória − Guloso (esperar/desobstruir) | −0,32 h | −0,45 a −0,20 | 24% / 65% / 11% |
| D1-Q1 − Guloso (esperar/desobstruir) | −0,60 h | −0,77 a −0,44 | 34% / 57% / 9% |
| D1-DDQN − Guloso (esperar/desobstruir) | −0,62 h | −0,78 a −0,46 | 33% / 57% / 10% |
| D2L-Q1 − Guloso (esperar/desobstruir) | −0,68 h | −0,86 a −0,50 | 34% / 56% / 10% |
| D2L-DDQN − Guloso (esperar/desobstruir) | −0,68 h | −0,85 a −0,51 | 36% / 55% / 9% |
| D2P-Q1 − Guloso (esperar/desobstruir) | −0,70 h | −0,89 a −0,53 | 36% / 54% / 11% |
| D2P-DDQN − Guloso (esperar/desobstruir) | −0,59 h | −0,76 a −0,44 | 31% / 59% / 10% |
| Guloso (esperar/desobstruir) − Guloso (5 ações) | +0,25 h | +0,12 a +0,40 | 17% / 57% / 26% |

## Contrastes por orçamento K (melhores do D − Guloso 5 ações)

| Contraste | K=1 | K=3 | K=5 | K=10 |
|---|---|---|---|---|
| D1-DDQN − Guloso (5 ações) | −0,03 [−0,32; +0,29] | −0,30 [−0,68; +0,07] | −0,51 [−0,91; −0,11] | −0,62 [−1,04; −0,23] |
| D2L-DDQN − Guloso (5 ações) | −0,15 [−0,54; +0,21] | −0,41 [−0,83; −0,00] | −0,51 [−0,93; −0,12] | −0,61 [−1,02; −0,24] |
| D2L-Q1 − Guloso (5 ações) | −0,01 [−0,35; +0,34] | −0,46 [−0,86; −0,09] | −0,60 [−1,02; −0,20] | −0,63 [−1,04; −0,24] |
| D2P-Q1 − Guloso (5 ações) | −0,09 [−0,40; +0,22] | −0,47 [−0,85; −0,13] | −0,66 [−1,05; −0,28] | −0,58 [−0,99; −0,22] |
| Esperar − Guloso (5 ações) | +0,30 [+0,06; +0,61] | +0,38 [+0,14; +0,69] | +0,40 [+0,17; +0,71] | +0,41 [+0,17; +0,71] |

## Ações do Guloso no teste

| Guloso | WAIT | DESOB | INTERR | CTRL50 | LIBERAR |
|---|---|---|---|---|---|
| 5 ações | 1017 | 78 | 581 | 27 | 170 |
| esperar/desobstruir | 1820 | 184 | 0 | 0 | 0 |
