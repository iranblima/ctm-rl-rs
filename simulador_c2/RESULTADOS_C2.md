# Cenário C2 — resultados brutos

Teste: 100 cenários novos × K ∈ {1, 3, 5, 10} = 400 episódios por método. KPI = horas até ≥ 80% dos 630 sentidos estáveis, medido a cada 15 min (13 = não estabilizou em 12 h); menor é melhor. α = 0,25.

## Tempo até estabilizar (média, horas)

| Método | K=1 | K=3 | K=5 | K=10 | Média | Veículo-hora | Ações usadas | Decisões/episódio |
|---|---|---|---|---|---|---|---|---|
| Esperar | 4,79 | 4,79 | 4,79 | 4,79 | **4,79** | 13.109 | 0,00 | 5,13 |
| Aleatória | 4,89 | 4,69 | 4,93 | 5,01 | **4,88** | 13.230 | 3,13 | 5,24 |
| M0 — Q1 míope, 60 min, reward base | 4,74 | 4,51 | 4,51 | 4,78 | **4,64** | 12.870 | 3,13 | 4,99 |
| M1 — DDQN, 60 min, reward base | 4,74 | 4,66 | 4,49 | 4,18 | **4,52** | 12.419 | 2,99 | 4,88 |
| M2 — Q1 míope, 60 min, reward progressivo | 4,72 | 4,56 | 4,54 | 4,54 | **4,59** | 12.671 | 2,98 | 4,93 |
| M3 — DDQN, 60 min, reward progressivo | 4,44 | 4,16 | 4,12 | 4,21 | **4,23** | 11.720 | 2,93 | 4,58 |
| M4 — Q1-SMDP, Δτ variável, reward progressivo | 4,61 | 4,44 | 4,37 | 4,22 | **4,41** | 12.198 | 4,46 | 17,54 |
| M5 — DDQN-SMDP, Δτ variável, reward progressivo | 4,50 | 4,07 | 3,94 | 3,87 | **4,09** | 11.032 | 3,92 | 14,81 |

## Contrastes pareados (KPI, horas; negativo = o primeiro foi mais rápido)

| Contraste | Diferença | IC 95% | Melhor / empate / pior |
|---|---|---|---|
| Retorno futuro com reward base (DDQN − Q1, 60 min) (M1 − M0) | −0,12 h | −0,23 a −0,02 | 24% / 59% / 17% |
| Efeito do reward progressivo no DDQN (60 min) (M3 − M1) | −0,28 h | −0,39 a −0,19 | 28% / 61% / 11% |
| Efeito do reward progressivo no Q1 (60 min) (M2 − M0) | −0,05 h | −0,14 a +0,05 | 22% / 60% / 18% |
| Valor do longo prazo (DDQN − Q1, 60 min, progressivo) (M3 − M2) | −0,36 h | −0,46 a −0,26 | 31% / 62% / 8% |
| Valor do timing sem longo prazo (Q1 variável − Q1 60 min) (M4 − M2) | −0,18 h | −0,30 a −0,06 | 25% / 56% / 19% |
| Valor temporal completo (DDQN-SMDP − Q1-SMDP) (M5 − M4) | −0,32 h | −0,43 a −0,20 | 35% / 54% / 11% |
| Valor do timing no DDQN (variável − 60 min) (M5 − M3) | −0,14 h | −0,22 a −0,06 | 24% / 64% / 12% |
| M0 − Esperar (M0 − Esperar) | −0,15 h | −0,24 a −0,08 | 21% / 66% / 13% |
| M0 − Aleatória (M0 − Aleatória) | −0,24 h | −0,36 a −0,14 | 37% / 50% / 14% |
| M1 − Esperar (M1 − Esperar) | −0,27 h | −0,37 a −0,19 | 22% / 75% / 3% |
| M1 − Aleatória (M1 − Aleatória) | −0,36 h | −0,49 a −0,25 | 39% / 54% / 8% |
| M2 − Esperar (M2 − Esperar) | −0,20 h | −0,29 a −0,11 | 20% / 75% / 5% |
| M2 − Aleatória (M2 − Aleatória) | −0,29 h | −0,41 a −0,18 | 36% / 56% / 8% |
| M3 − Esperar (M3 − Esperar) | −0,56 h | −0,70 a −0,43 | 35% / 62% / 4% |
| M3 − Aleatória (M3 − Aleatória) | −0,65 h | −0,79 a −0,52 | 49% / 45% / 7% |
| M4 − Esperar (M4 − Esperar) | −0,38 h | −0,52 a −0,25 | 27% / 62% / 11% |
| M4 − Aleatória (M4 − Aleatória) | −0,47 h | −0,61 a −0,34 | 40% / 49% / 11% |
| M5 − Esperar (M5 − Esperar) | −0,70 h | −0,85 a −0,55 | 37% / 63% / 0% |
| M5 − Aleatória (M5 − Aleatória) | −0,79 h | −0,95 a −0,64 | 51% / 45% / 4% |
| Aleatória − Esperar (Aleatória − Esperar) | +0,09 h | +0,01 a +0,18 | 10% / 64% / 27% |

## Contrastes principais por orçamento K (KPI, horas)

| Contraste | K=1 | K=3 | K=5 | K=10 |
|---|---|---|---|---|
| M1 − M0 | +0,01 [−0,12; +0,12] | +0,14 [−0,04; +0,33] | −0,03 [−0,25; +0,18] | −0,60 [−0,88; −0,36] |
| M3 − M1 | −0,30 [−0,52; −0,13] | −0,50 [−0,77; −0,27] | −0,36 [−0,57; −0,19] | +0,03 [−0,08; +0,14] |
| M2 − M0 | −0,01 [−0,11; +0,09] | +0,04 [−0,12; +0,22] | +0,03 [−0,19; +0,24] | −0,24 [−0,49; −0,02] |
| M3 − M2 | −0,28 [−0,48; −0,11] | −0,41 [−0,62; −0,23] | −0,42 [−0,65; −0,22] | −0,33 [−0,54; −0,13] |
| M4 − M2 | −0,12 [−0,27; +0,01] | −0,12 [−0,28; +0,03] | −0,17 [−0,39; +0,05] | −0,32 [−0,67; +0,03] |
| M5 − M4 | −0,11 [−0,28; +0,06] | −0,38 [−0,63; −0,14] | −0,43 [−0,68; −0,20] | −0,35 [−0,60; −0,14] |
| M5 − M3 | +0,06 [−0,08; +0,22] | −0,09 [−0,23; +0,04] | −0,18 [−0,32; −0,07] | −0,34 [−0,56; −0,15] |

## Timing (modos variáveis)

| Método | Δτ escolhido (15/30/60 min) | Épocas encerradas por evento | Duração média da época (min) |
|---|---|---|---|
| Esperar | 0 / 0 / 2052 | 0 | 55,67 |
| Aleatória | 0 / 0 / 2097 | 0 | 55,49 |
| M0 — Q1 míope, 60 min, reward base | 0 / 0 / 1994 | 0 | 55,57 |
| M1 — DDQN, 60 min, reward base | 0 / 0 / 1952 | 0 | 55,36 |
| M2 — Q1 míope, 60 min, reward progressivo | 0 / 0 / 1971 | 0 | 55,65 |
| M3 — DDQN, 60 min, reward progressivo | 0 / 0 / 1833 | 0 | 55,35 |
| M4 — Q1-SMDP, Δτ variável, reward progressivo | 6996 / 20 / 0 | 1363 | 15,03 |
| M5 — DDQN-SMDP, Δτ variável, reward progressivo | 5468 / 124 / 331 | 1398 | 16,56 |

## Ações no teste

| Método | Esperar | Desobstruir (acidente/barreira/estrutura) | Interromper | Controle 50% | Liberar |
|---|---|---|---|---|---|
| Esperar | 2052 | 0 (0/0/0) | 0 | 0 | 0 |
| Aleatória | 846 | 246 (60/107/79) | 484 | 460 | 61 |
| M0 — Q1 míope, 60 min, reward base | 742 | 651 (194/287/170) | 285 | 238 | 78 |
| M1 — DDQN, 60 min, reward base | 755 | 656 (126/330/200) | 166 | 302 | 73 |
| M2 — Q1 míope, 60 min, reward progressivo | 781 | 665 (149/229/287) | 213 | 238 | 74 |
| M3 — DDQN, 60 min, reward progressivo | 662 | 756 (70/507/179) | 190 | 194 | 31 |
| M4 — Q1-SMDP, Δτ variável, reward progressivo | 5231 | 774 (172/527/75) | 246 | 598 | 167 |
| M5 — DDQN-SMDP, Δτ variável, reward progressivo | 4357 | 1064 (114/651/299) | 82 | 288 | 132 |

## Variabilidade entre sementes (teste da melhor rede de cada semente)

| Config. | KPI por semente | Média | Desvio-padrão |
|---|---|---|---|
| M0 | s0: 4,57, s1: 4,71, s2: 4,64, s3: 4,48, s4: 4,82 | 4,64 | 0,12 |
| M1 | s0: 4,56, s1: 4,70, s2: 4,69, s3: 4,52, s4: 4,61 | 4,62 | 0,07 |
| M2 | s0: 4,83, s1: 4,61, s2: 4,78, s3: 4,59, s4: 4,71 | 4,70 | 0,09 |
| M3 | s0: 4,55, s1: 4,50, s2: 4,63, s3: 4,52, s4: 4,66, s5: 4,67, s6: 4,37, s7: 4,38, s8: 4,58, s9: 4,23 | 4,51 | 0,14 |
| M4 | s0: 4,33, s1: 4,61, s2: 4,62, s3: 4,70, s4: 4,57, s5: 4,69, s6: 4,65, s7: 4,84, s8: 4,72, s9: 4,41 | 4,61 | 0,14 |
| M5 | s0: 4,48, s1: 4,68, s2: 4,57, s3: 4,09, s4: 4,63, s5: 4,42, s6: 4,54, s7: 4,68, s8: 4,44, s9: 4,62 | 4,52 | 0,16 |

## Redes escolhidas na validação

| Config. | Semente | Episódio | KPI validação |
|---|---|---|---|
| M0 | 2 | 1500 | 3,92 |
| M1 | 3 | 1800 | 3,88 |
| M2 | 3 | 900 | 3,81 |
| M3 | 9 | 1200 | 3,71 |
| M4 | 9 | 900 | 3,67 |
| M5 | 3 | 1800 | 3,51 |

Validação das referências: Esperar 4,28 h, Aleatória 4,35 h.
