# P0 — estatística revista (cenário D e derivados)

100 cenários de teste × K ∈ {1, 3, 5, 10} = 400 episódios por método. **IC por cenário:** bootstrap que sorteia cenários (100 grupos; os 4 orçamentos de um cenário entram juntos). **IC por episódio:** o usado até agora (400 linhas tratadas como independentes). 5.000 reamostragens. Nada foi rodado de novo.

## 1. Episódios que não estabilizaram em 12 h

KPI = 13 h quando a rede não chega a 80% estável dentro de 12 h (censura à direita: não é uma recuperação observada em 13 h).

| Método | Média (h) | Não estabilizou | Média só dos que estabilizaram (h) |
|---|---|---|---|
| Esperar | 4,79 | 3,0% | 4,54 |
| Aleatória | 4,35 | 0,5% | 4,31 |
| D1-Q1 | 4,07 | 0,2% | 4,05 |
| D1-DDQN | 4,05 | 0,5% | 4,01 |
| D2L-Q1 | 3,99 | 0,5% | 3,95 |
| D2L-DDQN | 4,00 | 0,5% | 3,95 |
| D2P-Q1 | 3,97 | 0,5% | 3,92 |
| D2P-DDQN | 4,08 | 0,7% | 4,01 |
| Guloso 60 min, 5 ações | 4,42 | 3,0% | 4,15 |
| Guloso 60 min, só desobstruir | 4,67 | 3,0% | 4,41 |
| Guloso 15 min, 5 ações | 4,39 | 3,0% | 4,12 |
| Guloso 15 min, só desobstruir | 4,67 | 3,0% | 4,41 |
| Guloso olhando 1 h, 5 ações | 4,38 | 3,0% | 4,12 |
| Guloso olhando 1 h, só desobstruir | 4,67 | 3,0% | 4,41 |
| Guloso olhando 3 h, 5 ações | 3,98 | 2,0% | 3,79 |
| Guloso olhando 3 h, só desobstruir | 4,27 | 2,0% | 4,09 |
| Guloso olhando 6 h, 5 ações | 3,71 | 0,2% | 3,69 |
| Guloso olhando 6 h, só desobstruir | 3,81 | 0,2% | 3,79 |
| Regra: fluxo | 4,03 | 0,5% | 3,99 |
| Regra: importância | 4,03 | 0,2% | 4,01 |
| Regra: remoção longa primeiro | 4,14 | 0,7% | 4,07 |
| Regra: remoção curta primeiro | 4,24 | 1,2% | 4,13 |

## 2. Comparações pareadas (horas; negativo = o primeiro foi mais rápido)

| Comparação | Diferença | IC 95% por cenário | Significativo? | IC 95% por episódio (antes) | Melhor / empate / pior |
|---|---|---|---|---|---|
| **RL × Guloso** | | | | | |
| D1-DDQN − Guloso 60 min, 5 ações | −0,36 h | −0,71 a −0,02 | sim | −0,55 a −0,18 | 37% / 37% / 27% |
| D1-Q1 − Guloso 60 min, 5 ações | −0,35 h | −0,72 a −0,02 | sim | −0,54 a −0,17 | 40% / 35% / 25% |
| D2P-Q1 − Guloso 60 min, 5 ações | −0,45 h | −0,81 a −0,13 | sim | −0,64 a −0,27 | 39% / 36% / 26% |
| D1-DDQN − Guloso 15 min, 5 ações | −0,34 h | −0,69 a +0,00 | não | −0,52 a −0,15 | 38% / 33% / 29% |
| D2P-Q1 − Guloso 15 min, 5 ações | −0,42 h | −0,79 a −0,10 | sim | −0,62 a −0,24 | 42% / 30% / 28% |
| D1-DDQN − Guloso 15 min, só desobstruir | −0,62 h | −0,92 a −0,35 | sim | −0,78 a −0,46 | 33% / 57% / 10% |
| D1-DDQN (média das sementes) − Guloso 15 min, 5 ações | −0,27 h | −0,60 a +0,04 | não | −0,44 a −0,10 | 47% / 23% / 30% |
| D2P-Q1 (média das sementes) − Guloso 15 min, 5 ações | −0,31 h | −0,65 a −0,00 | sim | −0,49 a −0,14 | 47% / 23% / 30% |
| **Retorno futuro (DDQN − Q1, mesma recompensa)** | | | | | |
| D1-DDQN − D1-Q1 | −0,01 h | −0,14 a +0,12 | não | −0,11 a +0,08 | 18% / 63% / 19% |
| D2L-DDQN − D2L-Q1 | +0,00 h | −0,09 a +0,09 | não | −0,06 a +0,07 | 16% / 71% / 13% |
| D2P-DDQN − D2P-Q1 | +0,11 h | +0,01 a +0,21 | sim | +0,03 a +0,19 | 11% / 69% / 20% |
| D1-DDQN (média das sementes) − D1-Q1 (média das sementes) | +0,02 h | −0,02 a +0,06 | não | −0,01 a +0,04 | 23% / 47% / 31% |
| D2L-DDQN (média das sementes) − D2L-Q1 (média das sementes) | −0,00 h | −0,05 a +0,05 | não | −0,03 a +0,04 | 24% / 47% / 30% |
| D2P-DDQN (média das sementes) − D2P-Q1 (média das sementes) | +0,06 h | +0,02 a +0,10 | sim | +0,03 a +0,09 | 17% / 47% / 36% |
| **Recompensa com importância** | | | | | |
| D2L-DDQN − D1-DDQN | −0,06 h | −0,17 a +0,04 | não | −0,14 a +0,01 | 16% / 71% / 13% |
| D2P-Q1 − D1-Q1 | −0,10 h | −0,24 a +0,03 | não | −0,19 a −0,01 | 23% / 61% / 16% |
| D2L-DDQN (média das sementes) − D1-DDQN (média das sementes) | −0,09 h | −0,15 a −0,04 | sim | −0,13 a −0,06 | 36% / 45% / 19% |
| D2P-Q1 (média das sementes) − D1-Q1 (média das sementes) | −0,03 h | −0,07 a +0,01 | não | −0,06 a +0,00 | 29% / 45% / 26% |
| **Frequência de decisão do Guloso** | | | | | |
| Guloso 15 min, 5 ações − Guloso 60 min, 5 ações | −0,03 h | −0,09 a +0,03 | não | −0,07 a +0,02 | 12% / 75% / 14% |
| Guloso 15 min, só desobstruir − Guloso 60 min, só desobstruir | 0,00 h | 0,00 a 0,00 | não | 0,00 a 0,00 | 0% / 100% / 0% |
| **Horizonte do Guloso** | | | | | |
| Guloso olhando 3 h, 5 ações − Guloso olhando 1 h, 5 ações | −0,41 h | −0,67 a −0,21 | sim | −0,53 a −0,29 | 36% / 56% / 8% |
| Guloso olhando 6 h, 5 ações − Guloso olhando 1 h, 5 ações | −0,67 h | −1,06 a −0,33 | sim | −0,86 a −0,49 | 41% / 33% / 26% |
| Guloso olhando 3 h, só desobstruir − Guloso olhando 1 h, só desobstruir | −0,40 h | −0,69 a −0,19 | sim | −0,54 a −0,28 | 29% / 69% / 2% |
| Guloso olhando 6 h, só desobstruir − Guloso olhando 1 h, só desobstruir | −0,86 h | −1,26 a −0,52 | sim | −1,07 a −0,68 | 38% / 53% / 9% |
| Guloso olhando 3 h, 5 ações − D1-DDQN | −0,08 h | −0,38 a +0,22 | não | −0,25 a +0,09 | 42% / 33% / 26% |
| Guloso olhando 6 h, 5 ações − D1-DDQN | −0,34 h | −0,54 a −0,18 | sim | −0,46 a −0,24 | 26% / 64% / 10% |
| Guloso olhando 6 h, só desobstruir − D1-DDQN | −0,25 h | −0,40 a −0,11 | sim | −0,35 a −0,16 | 22% / 68% / 11% |
| Guloso olhando 6 h, só desobstruir − D2P-Q1 | −0,16 h | −0,26 a −0,07 | sim | −0,24 a −0,09 | 20% / 67% / 13% |
| **Regra simples** | | | | | |
| Regra: fluxo − D1-DDQN | −0,02 h | −0,14 a +0,08 | não | −0,11 a +0,05 | 17% / 67% / 17% |
| Regra: fluxo − D2P-Q1 | +0,07 h | −0,03 a +0,16 | não | +0,00 a +0,13 | 14% / 64% / 22% |
| Regra: fluxo − Guloso 15 min, 5 ações | −0,36 h | −0,74 a −0,02 | sim | −0,55 a −0,17 | 40% / 32% / 28% |

**Por orçamento K (IC por cenário):** D1-DDQN − Guloso 15 min, 5 ações

| K | Diferença | IC 95% |
|---|---|---|
| 1 | −0,03 h | −0,32 a +0,29 |
| 3 | −0,29 h | −0,68 a +0,10 |
| 5 | −0,47 h | −0,91 a −0,07 |
| 10 | −0,56 h | −1,00 a −0,17 |

**Cenário C2 (5 ações, mesmos cenários de teste), rede escolhida:**

| Comparação | Diferença | IC 95% por cenário | IC 95% por episódio (antes) |
|---|---|---|---|
| M1 − M0 | −0,04 h | −0,22 a +0,21 | −0,17 a +0,10 |
| M3 − M2 | −0,36 h | −0,51 a −0,22 | −0,46 a −0,26 |
| M5 − M4 | −0,32 h | −0,50 a −0,15 | −0,44 a −0,21 |
| M4 − M2 | −0,18 h | −0,33 a −0,05 | −0,30 a −0,07 |
| M5 − M3 | −0,14 h | −0,25 a −0,04 | −0,22 a −0,06 |

## 3. Custo computacional (i9-10900K, 1 núcleo por processo)

- **Treino (cenário D):** 60 treinos de 2.400 episódios; 42 a 60 min cada (média 52,37 min).
- **Guloso a cada 15 min, 5 ações:** 288,50 min de CPU para 400 episódios = 43,27 s por episódio.
- **Guloso a cada 15 min, só desobstruir:** 218,00 min de CPU para 400 episódios = 32,70 s por episódio.
- **Guloso olhando 6 h, só desobstruir (decide a cada 60 min):** 160,50 min de CPU para 400 episódios = 24,07 s por episódio.
- **Guloso olhando 3 h, 5 ações (decide a cada 60 min):** 415,50 min de CPU para 400 episódios = 62,33 s por episódio.
- **Guloso olhando 3 h, só desobstruir (decide a cada 60 min):** 93,90 min de CPU para 400 episódios = 14,08 s por episódio.
- **Guloso olhando 6 h, 5 ações (decide a cada 60 min):** 681,40 min de CPU para 400 episódios = 102,21 s por episódio.
- **Guloso olhando 1 h, 5 ações (decide a cada 60 min):** 112,20 min de CPU para 400 episódios = 16,83 s por episódio.
- **Guloso olhando 1 h, só desobstruir (decide a cada 60 min):** 51,00 min de CPU para 400 episódios = 7,65 s por episódio.
- **Decisão da política aprendida (medido agora, no computador desta análise):** 0,22 ms para calcular os atributos e a rede sobre 30 candidatos, mais 0,03 ms para montar os candidatos. Não consulta o simulador.

Observação: os tempos do Guloso são de CPU somados entre processos; o tempo de relógio depende de quantos rodam em paralelo.
