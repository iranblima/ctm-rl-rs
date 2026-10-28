# Cenário C2: o problema é genuinamente temporal?

Proposta da reunião de 26/10/2026 (documento "Proposta experimental para verificar se existe um problema genuinamente temporal"). O cenário C atual passa a se chamar **C1**. O código do C2 fica em `simulador_c2/`; `simulador_c/` (C1) não foi alterado.

**Pergunta:** existe ganho de controle que vem do retorno futuro e do momento das decisões, quando todas as políticas usam a mesma informação causal e nenhuma testa ações no simulador antes de decidir?

## O que é igual ao C1

- Malha (308 nós, 315 trechos, 630 sentidos), modelo de tráfego (CTM, passo de 1 min), demanda (VDM do DNIT por sentido).
- Os quatro tipos de obstrução, com os mesmos tempos de remoção (suposições do C1).
- As mesmas 5 ações (esperar, desobstruir, interromper, controle 50%, liberar), orçamento K ∈ {1, 3, 5, 10}, horizonte de 12 h.
- Os mesmos 300 cenários de treino e 40 de validação (mesmas sementes).
- A mesma rede (Dueling MLP 2×32), replay priorizado, Adam, γ = 0,95 por hora, 2.400 episódios por semente, escolha da rede na validação.

## O que muda

| Elemento | C1 | C2 |
|---|---|---|
| Época de decisão | A cada 60 min | 60 min fixo (M0–M3) ou **Δτ ∈ {15, 30, 60} min escolhido pela política** (M4, M5) |
| Gatilhos (só M4, M5) | — | Fim de uma obstrução (remoção concluída ou fim natural) ou dano estrutural virando meia pista antecipam a decisão para a primeira marca de 15 min depois do evento |
| Medida de estabilidade | Fluxo da hora cheia, a cada hora | Fluxo da **última hora (janela móvel), a cada 15 min**, contra a referência sem obstrução na mesma janela |
| KPI | Horas inteiras | Primeira marca de 15 min com ≥ 80% estável (em horas, de 0,25 em 0,25; 13 se não estabiliza) |
| Reward | −1 por hora até estabilizar | Base: −Δτ/60 por época. Progressivo: base + α[γ(Δτ)·Φ(próxima) − Φ(atual)], Φ = fração estável, γ(Δτ) = 0,95^(Δτ/60) |
| Atributos | 22 | 25: os 22 + Δτ da ação (15/30/60) |
| Políticas | Guloso, DDQN | **Q1** (míope aprendida: alvo y = r) e **DDQN** (alvo y = r + γ(Δτ)·Q_alvo); nenhuma testa ações no simulador |
| Referências | Esperar, Guloso | **Esperar** e **Aleatória** |
| Teste | 60 cenários | **100 cenários novos** (sementes a partir de 4.000.000), nunca usados antes |
| Sementes de treino | 2 | **5 por configuração** |

As horas do C2 não se comparam diretamente com as do C1, porque a medida passou a ser feita a cada 15 min. Dentro do C2, todos os métodos usam a mesma medida.

## Configurações

| ID | Política | Época | Reward | Pergunta |
|---|---|---|---|---|
| M0 | Q1 | 60 min | Base | Referência míope |
| M1 | DDQN | 60 min | Base | Há valor de retorno futuro no desenho atual? |
| M2 | Q1 | 60 min | Progressivo | Quanto do ganho vem do reward? |
| M3 | DDQN | 60 min | Progressivo | Reward + longo prazo |
| M4 | Q1-SMDP | Variável | Progressivo | Quanto vale o timing sem longo prazo? |
| M5 | DDQN-SMDP | Variável | Progressivo | Timing + retorno futuro produzem ganho adicional? |

Contrastes principais: M3 − M1 (reward), M3 − M2 (longo prazo), M4 − M2 (timing), M5 − M4 (valor temporal completo), M5 − M3 (timing no DDQN).

## Como rodar (no seu computador)

Na pasta do repositório, num terminal:

```powershell
node simulador_c2/run_c2.js
```

- Roda tudo: sorteia o novo teste, treina M0–M5 × 5 sementes, escolhe as redes, testa e gera as tabelas.
- Usa vários processos em paralelo (núcleos − 2, limitado pela memória). Para escolher: `node simulador_c2/run_c2.js --jobs 12`.
- Se for interrompido (Ctrl+C), rode de novo: as etapas prontas são puladas. Um treino interrompido recomeça do zero.
- Progresso: `simulador_c2/results/progresso.log`. Saída de cada treino: `simulador_c2/results/<M>/train_<semente>.out`.
- Resultado: `simulador_c2/RESULTADOS_C2.md` (tabelas) e `simulador_c2/results/summary.json` (números completos). Os resultados brutos por episódio ficam em `simulador_c2/results/test_*.json`.

## Resultado (rodada de 27/10/2026, 5 sementes × 6 configurações, 1,9 h no i9)

Tabelas completas em `simulador_c2/RESULTADOS_C2.md`; números por episódio em `simulador_c2/results/test_*.json`.

Teste: 100 cenários novos × 4 orçamentos = 400 episódios por método. Horas até ≥ 80% estável (medido a cada 15 min); menor é melhor.

| Método | Rede escolhida na validação | Média das 5 sementes |
|---|---|---|
| Esperar | 4,79 | — |
| Aleatória | 4,88 | — |
| M0 Q1, 60 min, base | 4,64 | 4,64 |
| M1 DDQN, 60 min, base | 4,52 | 4,62 |
| M2 Q1, 60 min, progressivo | 4,59 | 4,70 |
| M3 DDQN, 60 min, progressivo | 4,52 | 4,57 |
| M4 Q1-SMDP, variável, progressivo | 4,61 | 4,57 |
| M5 DDQN-SMDP, variável, progressivo | **4,09** | **4,49** |

| Contraste (pareado, horas) | Rede escolhida | Média das 5 sementes |
|---|---|---|
| M5 − M4 (valor temporal completo) | −0,51 [−0,66; −0,37] | −0,08 [−0,13; −0,02] |
| M5 − M3 (timing no DDQN) | −0,43 [−0,55; −0,31] | −0,08 [−0,12; −0,04] |
| M3 − M2 (longo prazo, 60 min) | −0,07 [−0,16; +0,02] | −0,13 [−0,18; −0,09] |
| M4 − M2 (timing sem longo prazo) | +0,02 [−0,11; +0,14] | −0,14 [−0,21; −0,07] |
| M3 − M1 (reward progressivo no DDQN) | +0,00 [−0,07; +0,08] | −0,04 [−0,09; −0,00] |
| M1 − M0 (DDQN − Q1, reward base) | −0,12 [−0,23; −0,02] | −0,03 [−0,08; +0,03] |

**Leitura:**
1. A rede M5 escolhida na validação foi a melhor de todas (4,09 h; 0,70 h mais rápida que Esperar, sem nenhum episódio pior) e teve a menor perda no trânsito.
2. Mas o ganho grande vem de uma única semente (semente 3: 4,09 h). As outras quatro sementes de M5 ficaram entre 4,48 e 4,68 h, perto de M3 e M4. Na média das sementes, M5 ainda é o melhor, mas por pouco (−0,08 h).
3. O ganho de M5 sobre M4 cresce com o orçamento (K=1: +0,02; K=3: −0,55; K=5: −0,70; K=10: −0,83 h), o contrário do que a hipótese H5 esperava.
4. As políticas com Δτ variável escolhem quase sempre 15 min (Q1-SMDP: 99%; DDQN-SMDP: 92%); o DDQN-SMDP usa 30 ou 60 min em 8% das decisões.
5. O reward progressivo quase não mudou o DDQN de 60 min (M3 − M1 ≈ 0), diferente do que aconteceu no cenário A.
6. Todas as políticas aprendidas foram mais rápidas que Esperar e que Aleatória; Aleatória foi um pouco pior que Esperar.

**Critérios do documento (seção 12):** M5 supera M4 e M3 com a rede escolhida, mas o efeito não aparece de forma consistente nas sementes; Δτ não colapsa em 60 min, mas colapsa em 15 min; o ganho é maior com K grande, não pequeno; a frequência de benefício atrasado não foi medida (auditoria offline não feita). Conclusão provisória: há um indício de valor temporal no DDQN-SMDP, ainda não robusto.

## Suposições deste cenário

- α = 0,25, o valor escolhido na validação do cenário A (diagnóstico A3). Não foi reajustado no C2.
- Só o potencial Φ1 = fração estável. A versão contínua Φ2 do documento não foi implementada.
- O gatilho por mudança de fluxo acima de um limiar não foi implementado; só os gatilhos por evento de obstrução.
- Os gatilhos valem só para M4 e M5. Nos modos de 60 min, a decisão espera sempre a hora cheia; a medida de estabilidade, porém, é feita a cada 15 min em todos os métodos.
- Reavaliar não gasta orçamento e não tem custo.
- Aleatória: a cada 60 min, escolhe uma ação válida (incluindo esperar) com a mesma chance; o sorteio é fixo por cenário e K.
- A auditoria offline de temporalidade (seção 13 do documento) ainda não foi feita.
