# Confirmação num conjunto de teste novo

**Teste novo:** 100 cenários nunca usados (sementes 5.000.000+) × K ∈ {1,3,5,10} = 400 episódios. **Teste antigo:** os 100 cenários usados até aqui (sementes 4.000.000+). Nada foi treinado nem ajustado. Comparações registradas antes da rodada (CONFIRMACAO.md). IC 95% por bootstrap agrupado por cenário.

## Tempo até estabilizar (média, horas)

| Método | Teste novo | Não estabilizou (novo) | Teste antigo |
|---|---|---|---|
| Esperar | 4,99 | 4,0% | 4,79 |
| Aleatória | 4,39 | 2,0% | 4,35 |
| Regra: fluxo | 4,09 | 1,0% | 4,03 |
| D1-Q1 | 4,20 | 0,8% | 4,07 |
| D1-DDQN | 4,20 | 1,5% | 4,05 |
| D2P-Q1 | 4,10 | 2,0% | 3,97 |
| Guloso 1 h, 5 ações | 4,72 | 4,0% | 4,38 |
| Guloso 3 h, 5 ações | 4,15 | 2,3% | 3,98 |
| Guloso 6 h, 5 ações | 3,81 | 0,5% | 3,71 |
| Guloso 6 h, 5 ações, modelo imperfeito | 4,01 | 0,5% | 3,79 |
| Guloso 1 h, só desobstruir | 4,91 | 4,0% | 4,67 |
| Guloso 3 h, só desobstruir | 4,29 | 2,3% | 4,27 |
| Guloso 6 h, só desobstruir | 3,85 | 0,5% | 3,81 |
| Guloso 6 h, só desobstruir, modelo imperfeito | 3,99 | 0,5% | 3,89 |

## Comparações registradas (negativo = o primeiro foi mais rápido)

| Comparação | Teste novo | IC 95% (novo) | Signif.? | Teste antigo | IC 95% (antigo) | Mesmo sentido e significância? |
|---|---|---|---|---|---|---|
| **1. Horizonte** | | | | | | |
| Guloso 3 h, 5 ações − Guloso 1 h, 5 ações | −0,57 h | −0,87 a −0,32 | sim | −0,41 h | −0,67 a −0,21 | sim |
| Guloso 6 h, 5 ações − Guloso 1 h, 5 ações | −0,91 h | −1,35 a −0,53 | sim | −0,67 h | −1,06 a −0,33 | sim |
| Guloso 3 h, só desobstruir − Guloso 1 h, só desobstruir | −0,62 h | −0,97 a −0,33 | sim | −0,40 h | −0,69 a −0,19 | sim |
| Guloso 6 h, só desobstruir − Guloso 1 h, só desobstruir | −1,07 h | −1,51 a −0,68 | sim | −0,86 h | −1,26 a −0,52 | sim |
| **2. Planejamento longo × aprendizado** | | | | | | |
| Guloso 6 h, 5 ações − D1-DDQN | −0,39 h | −0,60 a −0,21 | sim | −0,34 h | −0,54 a −0,18 | sim |
| Guloso 6 h, 5 ações − D2P-Q1 | −0,29 h | −0,48 a −0,12 | sim | −0,26 h | −0,40 a −0,13 | sim |
| Guloso 6 h, só desobstruir − D1-DDQN | −0,36 h | −0,56 a −0,18 | sim | −0,25 h | −0,40 a −0,11 | sim |
| Guloso 6 h, só desobstruir − D2P-Q1 | −0,26 h | −0,42 a −0,11 | sim | −0,16 h | −0,26 a −0,07 | sim |
| **3. Modelo imperfeito** | | | | | | |
| Guloso 6 h, 5 ações, modelo imperfeito − Guloso 6 h, 5 ações | +0,19 h | +0,03 a +0,39 | sim | +0,08 h | −0,04 a +0,23 | NÃO |
| Guloso 6 h, 5 ações, modelo imperfeito − D1-DDQN | −0,19 h | −0,37 a −0,04 | sim | −0,26 h | −0,41 a −0,14 | sim |
| Guloso 6 h, 5 ações, modelo imperfeito − D2P-Q1 | −0,09 h | −0,32 a +0,14 | não | −0,17 h | −0,30 a −0,05 | NÃO |
| Guloso 6 h, só desobstruir, modelo imperfeito − Guloso 6 h, só desobstruir | +0,15 h | −0,02 a +0,35 | não | +0,08 h | −0,01 a +0,20 | sim |
| Guloso 6 h, só desobstruir, modelo imperfeito − D1-DDQN | −0,21 h | −0,39 a −0,06 | sim | −0,16 h | −0,28 a −0,05 | sim |
| Guloso 6 h, só desobstruir, modelo imperfeito − D2P-Q1 | −0,11 h | −0,34 a +0,12 | não | −0,07 h | −0,17 a +0,02 | sim |
| **4. Aprendizado × planejamento curto** | | | | | | |
| D1-DDQN − Guloso 1 h, 5 ações | −0,52 h | −0,84 a −0,24 | sim | −0,33 h | −0,68 a +0,01 | NÃO |
| D2P-Q1 − Guloso 1 h, 5 ações | −0,62 h | −1,01 a −0,29 | sim | −0,42 h | −0,79 a −0,09 | sim |
| **5. Retorno futuro** | | | | | | |
| D1-DDQN − D1-Q1 | −0,00 h | −0,18 a +0,20 | não | −0,01 h | −0,14 a +0,12 | sim |
| **6. Regra simples** | | | | | | |
| Regra: fluxo − D1-DDQN | −0,11 h | −0,27 a +0,03 | não | −0,02 h | −0,14 a +0,08 | sim |
| Regra: fluxo − D2P-Q1 | −0,01 h | −0,13 a +0,11 | não | +0,07 h | −0,03 a +0,16 | sim |
| **7. Aprender ajuda** | | | | | | |
| D1-DDQN − Esperar | −0,79 h | −1,08 a −0,55 | sim | −0,74 h | −1,03 a −0,49 | sim |

"Mesmo sentido e significância?" = a conclusão do teste antigo se repete no novo (mesmo sinal quando significativo, ou não significativo nos dois).
