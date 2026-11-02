# P5 — o que o agente usa e o que ele precisa

Mesmos 100 cenários de teste do D × K ∈ {1,3,5,10} = 400 episódios. IC 95% por bootstrap agrupado por cenário.

## 1. Importância por permutação (redes já treinadas, sem treino novo)

Em cada decisão, um grupo de atributos é embaralhado; a piora no tempo até estabilizar mede quanto a rede **usa** aquela informação.

| Política | Grupo embaralhado | Média (h) | Piora | IC 95% | Significativo? |
|---|---|---|---|---|---|
| D1-DDQN | (nenhum) | 4,05 | | | |
| D1-DDQN | tipo_acao | 4,07 | +0,01 h | −0,02 a +0,05 | não |
| D1-DDQN | obstrucao | 4,15 | +0,10 h | +0,03 a +0,17 | sim |
| D1-DDQN | fluxo_previsto | 4,04 | −0,01 h | −0,06 a +0,04 | não |
| D1-DDQN | estrutura | 4,05 | +0,00 h | −0,07 a +0,07 | não |
| D1-DDQN | fluxo_observado | 4,01 | −0,04 h | −0,12 a +0,03 | não |
| D1-DDQN | tempo_obstrucao | 4,02 | −0,04 h | −0,07 a −0,01 | sim |
| D1-DDQN | contexto | 4,10 | +0,04 h | −0,00 a +0,09 | não |
| D1-DDQN | dtau | 4,08 | +0,03 h | −0,03 a +0,08 | não |
| D1-Q1 | (nenhum) | 4,07 | | | |
| D1-Q1 | tipo_acao | 4,04 | −0,03 h | −0,08 a +0,03 | não |
| D1-Q1 | obstrucao | 4,17 | +0,10 h | 0,00 a +0,20 | não |
| D1-Q1 | fluxo_previsto | 4,14 | +0,07 h | −0,06 a +0,23 | não |
| D1-Q1 | estrutura | 4,20 | +0,13 h | +0,01 a +0,27 | sim |
| D1-Q1 | fluxo_observado | 4,38 | +0,31 h | +0,15 a +0,50 | sim |
| D1-Q1 | tempo_obstrucao | 4,22 | +0,15 h | +0,09 a +0,22 | sim |
| D1-Q1 | contexto | 4,12 | +0,05 h | +0,01 a +0,09 | sim |
| D1-Q1 | dtau | 4,11 | +0,04 h | −0,02 a +0,11 | não |
| D2P-Q1 | (nenhum) | 3,97 | | | |
| D2P-Q1 | tipo_acao | 4,00 | +0,03 h | −0,02 a +0,11 | não |
| D2P-Q1 | obstrucao | 4,12 | +0,15 h | +0,06 a +0,27 | sim |
| D2P-Q1 | fluxo_previsto | 3,98 | +0,01 h | −0,04 a +0,06 | não |
| D2P-Q1 | estrutura | 3,93 | −0,04 h | −0,12 a +0,04 | não |
| D2P-Q1 | fluxo_observado | 3,98 | +0,01 h | −0,06 a +0,09 | não |
| D2P-Q1 | tempo_obstrucao | 3,96 | −0,01 h | −0,05 a +0,03 | não |
| D2P-Q1 | contexto | 3,99 | +0,02 h | −0,03 a +0,09 | não |
| D2P-Q1 | dtau | 3,99 | +0,02 h | −0,02 a +0,06 | não |

## 2. Ablações com treino novo (5 sementes cada)

**Média das sementes** = média das 5 redes (a melhor de cada semente na validação), por episódio: é a comparação principal. **Rede escolhida** = a melhor das 5 na validação. Referências: D1-DDQN e D1-Q1 do cenário D, sementes 0 a 4 (α = 0,25, todos os atributos).

| Configuração | Média das sementes (h) | Diferença p/ referência | IC 95% | Signif.? | Rede escolhida (h) | Diferença | IC 95% |
|---|---|---|---|---|---|---|---|
| **Referência D1-DDQN** | 4,11 | | | | 4,09 (semente 3) | | |
| **Referência D1-Q1** | 4,13 | | | | 4,07 (semente 0) | | |
| DDQN sem tipo e tempo de remoção da obstrução | 4,14 | +0,03 h | −0,02 a +0,09 | não | 4,18 (semente 0) | +0,09 h | −0,02 a +0,22 |
| DDQN sem fluxo previsto do trecho | 4,14 | +0,03 h | −0,02 a +0,09 | não | 4,05 (semente 4) | −0,04 h | −0,13 a +0,03 |
| DDQN sem grau do entroncamento e pista dupla | 4,13 | +0,02 h | −0,05 a +0,10 | não | 4,10 (semente 2) | +0,02 h | −0,08 a +0,10 |
| DDQN sem fluxo observado no trecho e vizinhos | 4,15 | +0,04 h | −0,01 a +0,09 | não | 3,99 (semente 0) | −0,09 h | −0,24 a +0,03 |
| DDQN sem tempo desde o início da obstrução | 4,16 | +0,05 h | −0,02 a +0,14 | não | 4,05 (semente 4) | −0,03 h | −0,17 a +0,11 |
| DDQN sem contexto (orçamento, hora, nº de obstruções, fração estável) | 4,12 | +0,01 h | −0,04 a +0,06 | não | 4,10 (semente 4) | +0,01 h | −0,10 a +0,12 |
| DDQN sem intervalo da decisão (Δτ) | 4,16 | +0,05 h | −0,01 a +0,12 | não | 4,15 (semente 2) | +0,06 h | −0,07 a +0,23 |
| Q1, α = 0 (só recompensa base) | 4,07 | −0,06 h | −0,12 a −0,00 | sim | 4,06 (semente 0) | −0,01 h | −0,13 a +0,12 |
| DDQN, α = 0 (só recompensa base) | 4,13 | +0,02 h | −0,01 a +0,06 | não | 4,10 (semente 2) | +0,02 h | −0,08 a +0,11 |
| Q1, α = 0,1 | 4,08 | −0,05 h | −0,11 a −0,01 | sim | 4,08 (semente 0) | +0,02 h | −0,09 a +0,13 |
| DDQN, α = 0,1 | 4,12 | +0,01 h | −0,05 a +0,08 | não | 4,15 (semente 1) | +0,06 h | −0,05 a +0,17 |
| Q1, α = 0,5 | 4,13 | +0,00 h | −0,07 a +0,06 | não | 4,05 (semente 4) | −0,02 h | −0,13 a +0,09 |
| DDQN, α = 0,5 | 4,19 | +0,08 h | +0,04 a +0,12 | sim | 4,15 (semente 4) | +0,06 h | −0,03 a +0,15 |

Positivo = a ablação piorou (a informação ou o termo retirado ajudava). Ablações de atributos: o grupo vira zero no treino e no teste. Grupos, α testados e número de sementes são escolhas desta análise, declaradas antes dos resultados.
