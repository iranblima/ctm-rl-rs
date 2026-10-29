# Análise das causas — por que o RL vence o Guloso no cenário D

Tudo nos mesmos 100 cenários de teste × K ∈ {1, 3, 5, 10} = 400 episódios. KPI = horas até ≥ 80% dos 630 sentidos estáveis (13 = não estabilizou); menor é melhor. Nada aqui foi treinado: as políticas aprendidas são as do D.

## 1. Tempo até estabilizar (média, horas)

| Método | K=1 | K=3 | K=5 | K=10 | Média | Ações usadas |
|---|---|---|---|---|---|---|
| Esperar | 4,79 | 4,79 | 4,79 | 4,79 | **4,79** | 0,00 |
| Aleatória | 4,59 | 4,34 | 4,21 | 4,25 | **4,35** | 2,55 |
| D1-Q1 | 4,42 | 4,05 | 3,87 | 3,94 | **4,07** | 3,13 |
| D1-DDQN | 4,46 | 4,11 | 3,88 | 3,76 | **4,05** | 3,31 |
| D2L-DDQN | 4,33 | 4,00 | 3,88 | 3,77 | **4,00** | 3,34 |
| D2P-Q1 | 4,40 | 3,94 | 3,73 | 3,80 | **3,97** | 3,17 |
| Guloso 60 min, 5 ações | 4,49 | 4,41 | 4,39 | 4,38 | **4,42** | 2,14 |
| Guloso 15 min, 5 ações | 4,49 | 4,40 | 4,35 | 4,32 | **4,39** | 3,42 |
| Guloso 15 min, só desobstruir | 4,67 | 4,67 | 4,67 | 4,67 | **4,67** | 0,49 |
| Guloso olhando 1 h, 5 ações | 4,48 | 4,38 | 4,34 | 4,33 | **4,38** | 2,04 |
| Guloso olhando 1 h, só desobstruir | 4,67 | 4,67 | 4,67 | 4,67 | **4,67** | 0,46 |
| Guloso olhando 3 h, 5 ações | 4,15 | 3,92 | 3,92 | 3,91 | **3,98** | 2,29 |
| Guloso olhando 3 h, só desobstruir | 4,36 | 4,24 | 4,24 | 4,24 | **4,27** | 1,09 |
| Guloso olhando 6 h, 5 ações | 4,00 | 3,62 | 3,62 | 3,62 | **3,71** | 2,48 |
| Guloso olhando 6 h, só desobstruir | 4,00 | 3,75 | 3,75 | 3,75 | **3,81** | 2,10 |
| Regra: fluxo | 4,42 | 4,11 | 3,85 | 3,76 | **4,03** | 3,81 |
| Regra: importância | 4,49 | 4,07 | 3,83 | 3,74 | **4,03** | 3,79 |
| Regra: remoção longa primeiro | 4,64 | 4,23 | 3,90 | 3,77 | **4,14** | 3,61 |
| Regra: remoção curta primeiro | 4,74 | 4,55 | 3,87 | 3,79 | **4,24** | 3,98 |

## 2. Contrastes pareados (negativo = o primeiro foi mais rápido)

| Contraste | Diferença | IC 95% | Melhor / empate / pior |
|---|---|---|---|
| **Regras simples × RL e × Guloso** | | | |
| Regra: fluxo − D1-DDQN | −0,02 h | −0,11 a +0,05 | 17% / 67% / 17% |
| Regra: fluxo − D2P-Q1 | +0,07 h | +0,00 a +0,13 | 14% / 64% / 22% |
| Regra: fluxo − Guloso 15 min, 5 ações | −0,36 h | −0,55 a −0,16 | 40% / 32% / 28% |
| Regra: importância − D1-DDQN | −0,02 h | −0,10 a +0,05 | 17% / 67% / 16% |
| Regra: importância − D2P-Q1 | +0,07 h | 0,00 a +0,14 | 15% / 66% / 19% |
| Regra: importância − Guloso 15 min, 5 ações | −0,36 h | −0,55 a −0,17 | 41% / 31% / 29% |
| Regra: remoção longa primeiro − D1-DDQN | +0,08 h | +0,02 a +0,15 | 11% / 73% / 16% |
| Regra: remoção longa primeiro − D2P-Q1 | +0,17 h | +0,09 a +0,26 | 9% / 66% / 25% |
| Regra: remoção longa primeiro − Guloso 15 min, 5 ações | −0,26 h | −0,45 a −0,07 | 37% / 34% / 29% |
| Regra: remoção curta primeiro − D1-DDQN | +0,18 h | +0,10 a +0,28 | 14% / 62% / 25% |
| Regra: remoção curta primeiro − D2P-Q1 | +0,27 h | +0,16 a +0,39 | 12% / 59% / 29% |
| Regra: remoção curta primeiro − Guloso 15 min, 5 ações | −0,15 h | −0,32 a +0,02 | 35% / 37% / 28% |
| **Guloso olhando mais longe** | | | |
| Guloso olhando 3 h, 5 ações − Guloso olhando 1 h, 5 ações | −0,41 h | −0,53 a −0,29 | 36% / 56% / 8% |
| Guloso olhando 3 h, 5 ações − D1-DDQN | −0,08 h | −0,25 a +0,09 | 42% / 33% / 26% |
| Guloso olhando 6 h, 5 ações − Guloso olhando 1 h, 5 ações | −0,67 h | −0,86 a −0,49 | 41% / 33% / 26% |
| Guloso olhando 6 h, 5 ações − D1-DDQN | −0,34 h | −0,46 a −0,24 | 26% / 64% / 10% |
| Guloso olhando 3 h, só desobstruir − Guloso olhando 1 h, só desobstruir | −0,40 h | −0,54 a −0,28 | 29% / 69% / 2% |
| Guloso olhando 3 h, só desobstruir − D1-DDQN | +0,22 h | +0,07 a +0,36 | 24% / 52% / 25% |
| Guloso olhando 6 h, só desobstruir − Guloso olhando 1 h, só desobstruir | −0,86 h | −1,06 a −0,69 | 38% / 53% / 9% |
| Guloso olhando 6 h, só desobstruir − D1-DDQN | −0,25 h | −0,35 a −0,15 | 22% / 68% / 11% |
| Guloso olhando 1 h, 5 ações − Guloso 60 min, 5 ações | −0,03 h | −0,04 a −0,03 | 13% / 87% / 0% |

## 3. Auditoria no ambiente do D (só esperar ou desobstruir)

271 estados (início, +60 e +120 min só esperando, quando ainda instáveis). Cada ação é aplicada e depois só se espera. Ganho = fração estável com a ação − fração estável esperando, em pontos percentuais (pp).

| Indicador | 60 × 180 min | 60 × 360 min |
|---|---|---|
| Inversão: a melhor ação no horizonte longo é outra (≥ 1 pp) | 10,7% | 77,9% |
| Benefício atrasado: desobstrução sem ganho em 60 min e ≥ 2 pp depois | 5,2% | 56,8% |

**Ganho médio da melhor ação sobre esperar (pp):** 15 min: 0,00 · 30 min: 0,00 · 60 min: 0,05 · 120 min: 0,29 · 180 min: 0,56 · 360 min: 2,64

**Ganho médio de desobstruir, por tipo (pp, média sobre todas as obstruções desobstruíveis):**

| Tipo | 15 min | 30 min | 60 min | 120 min | 180 min | 360 min | Nº |
|---|---|---|---|---|---|---|---|
| acidente | 0,00 | 0,00 | 0,02 | 0,15 | 0,17 | 0,03 | 553 |
| barreira | 0,00 | 0,00 | 0,00 | 0,00 | 0,10 | 1,50 | 777 |
| estrutura | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 482 |

**Melhor ação em cada horizonte (nº de estados):**

| Ação | 60 min | 180 min | 360 min |
|---|---|---|---|
| Esperar | 205 | 89 | 4 |
| Desobstruir acidente | 66 | 71 | 9 |
| Desobstruir barreira | 0 | 111 | 258 |
| Desobstruir estrutura | 0 | 0 | 0 |

## 4. O que cada política desobstrui (todos os 400 episódios)

| Política | Desobstruções por episódio | Acidente | Barreira | Estrutura | Na 1ª hora | Hora média da 1ª desobstrução | Fluxo médio (percentil) |
|---|---|---|---|---|---|---|---|
| D1-Q1 | 3,13 | 27,7% | 45,3% | 26,9% | 85,5% | 0,01 h | 74,98 |
| D1-DDQN | 3,31 | 23,6% | 48,8% | 27,6% | 78,2% | 0,00 h | 74,83 |
| D2L-DDQN | 3,34 | 22,9% | 49,6% | 27,5% | 82,1% | 0,00 h | 80,53 |
| D2P-Q1 | 3,17 | 19,3% | 57,9% | 22,8% | 82,6% | 0,00 h | 77,41 |
| Aleatória | 2,55 | 24,1% | 46,8% | 29,0% | 35,2% | 0,11 h | 74,40 |
| Regra: fluxo | 3,81 | 35,8% | 40,2% | 24,0% | 77,7% | 0,00 h | 85,33 |
| Regra: importância | 3,79 | 35,2% | 40,5% | 24,2% | 78,1% | 0,00 h | 78,14 |
| Regra: remoção longa primeiro | 3,61 | 13,5% | 46,6% | 39,9% | 82,0% | 0,00 h | 76,91 |
| Regra: remoção curta primeiro | 3,98 | 59,6% | 29,6% | 10,9% | 74,5% | 0,00 h | 78,68 |

Obstruções disponíveis no teste (todas): acidente 33,5%, barreira 27,6%, estrutura 16,2%, agua 22,6%.

## 5. Onde o RL vence: D1-DDQN − Guloso 15 min, 5 ações, por tipo de episódio

| Grupo | Episódios | Diferença média | IC 95% | Melhor / empate / pior |
|---|---|---|---|---|
| K = 1 | 100 | −0,03 h | −0,31 a +0,29 | 27% / 45% / 28% |
| K = 3 | 100 | −0,29 h | −0,66 a +0,10 | 38% / 31% / 31% |
| K = 5 | 100 | −0,47 h | −0,90 a −0,08 | 41% / 29% / 30% |
| K = 10 | 100 | −0,56 h | −0,97 a −0,17 | 46% / 27% / 27% |
| 7 a 9 obstruções | 64 | +0,02 h | −0,51 a +0,55 | 25% / 34% / 41% |
| 10 a 12 obstruções | 332 | −0,41 h | −0,62 a −0,21 | 41% / 33% / 26% |
| 0 ou 1 obstrução de remoção longa (barreira/estrutura) | 12 | +0,04 h | −0,06 a +0,13 | 17% / 50% / 33% |
| 2 ou 3 de remoção longa | 76 | 0,00 h | −0,14 a +0,13 | 25% / 47% / 28% |
| 4 ou mais de remoção longa | 312 | −0,43 h | −0,67 a −0,19 | 42% / 29% / 29% |
| Estabilidade inicial < 70% | 12 | −0,23 h | −0,42 a −0,04 | 42% / 50% / 8% |
| Estabilidade inicial 70% a 75% | 80 | −0,47 h | −0,84 a −0,17 | 51% / 25% / 24% |
| Estabilidade inicial ≥ 75% | 308 | −0,31 h | −0,53 a −0,07 | 34% / 34% / 31% |

Regras e limiares (1 pp, 2 pp, horizontes, faixas dos grupos) são escolhas desta análise, não ajustadas aos resultados.
