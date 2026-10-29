# Cenário D: só desobstruir

Decidido na reunião de 28/10/2026: o espaço com 5 ações deixava o treino lento e complexo, e desobstruir é a ação de maior relevância operacional para a PRF. O cenário D repete o cenário C2, mas **a política só pode esperar ou desobstruir**, e compara a recompensa atual com uma recompensa que usa fluxo, distância da fonte e grau da fonte. O código fica em `simulador_d/`; `simulador_c2/` não foi alterado.

## O que é igual ao C2

- Malha, CTM (passo de 1 min), demanda, os quatro tipos de obstrução com remoção demorada.
- Os mesmos cenários: 300 de treino e 40 de validação (os do C1/C2) e os **mesmos 100 cenários de teste novos do C2** (sementes a partir de 4.000.000). Por isso dá para comparar episódio a episódio com o C2.
- Épocas de decisão Δτ ∈ {15, 30, 60} min, com antecipação quando uma obstrução termina (como M4 e M5).
- Estabilidade a cada 15 min (janela móvel de 1 h); KPI = horas até ≥ 80% dos 630 sentidos estáveis.
- Rede, treino e carga: 10 sementes × 2.400 episódios por configuração; rede escolhida na validação; Esperar e Aleatória como referências (a Aleatória sorteia só entre esperar e desobstruir).

## Configurações

| ID | Política | Recompensa |
|---|---|---|
| D1-Q1, D1-DDQN | Q1 míope, DDQN | **D1 — atual:** base + α[γ(Δτ)·Φ' − Φ], Φ = fração de trechos estáveis (a do M5) |
| D2L-Q1, D2L-DDQN | Q1 míope, DDQN | **D2 literal:** base + λ·importância da obstrução, somada quando a ação é desobstruir |
| D2P-Q1, D2P-DDQN | Q1 míope, DDQN | **D2 potencial:** base + α[γ(Δτ)·Ψ' − Ψ], Ψ = fração da importância das obstruções já liberada |

Base = −Δτ/60 por época até estabilizar. α = 0,25; λ = 0,25; γ(Δτ) = 0,95^(Δτ/60).

### Importância de uma obstrução (combinação linear, pesos iguais)

importância = (fluxo + proximidade + grau) / 3, cada fator entre 0 e 1:

- **fluxo:** posição (percentil) do VDM do trecho entre os 315 trechos da malha.
- **fonte:** o entroncamento (nó com 3 ou mais trechos) mais próximo da obstrução, pela malha.
- **proximidade:** 1 − min(distância até a fonte, 50 km) / 50 km.
- **grau:** (número de trechos da fonte − 3) ÷ (maior grau da malha − 3). Na malha, os entroncamentos têm 3 ou 4 trechos, então o fator vale 0 ou 1.

No D2 potencial, Ψ soma a importância das obstruções já liberadas (liberada = 1, meia pista = 0,5, bloqueada = 0) e divide pela importância total do cenário.

## Como rodar (no seu computador)

```powershell
node simulador_d/run_d.js
```

- 6 configurações × 10 sementes = 60 treinos em paralelo; depois escolhe as redes, roda Esperar e Aleatória na validação, testa e gera `simulador_d/RESULTADOS_D.md`.
- Se `simulador_c2/results/test_*.json` existir, as tabelas trazem também a comparação com o C2 (M5 e M4, as 5 ações) nos mesmos cenários.
- Pode interromper e rodar de novo: o que terminou é pulado.

## Suposições deste cenário (decididas sem confirmação da Andina)

- "Recompensa atual" do D1 = a progressiva do M5 (Φ = fração estável).
- O D2 foi rodado nas duas leituras possíveis (somada direto e como potencial), para a escolha ser feita com os resultados.
- "Fonte" = entroncamento mais próximo da obstrução.
- Pesos iguais; fluxo normalizado por percentil; proximidade com teto de 50 km; λ = α = 0,25.
- Só as políticas com Δτ variável (equivalentes a M4 e M5), as melhores do C2.
