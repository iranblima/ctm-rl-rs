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

## Suposições deste cenário

- α = 0,25, o valor escolhido na validação do cenário A (diagnóstico A3). Não foi reajustado no C2.
- Só o potencial Φ1 = fração estável. A versão contínua Φ2 do documento não foi implementada.
- O gatilho por mudança de fluxo acima de um limiar não foi implementado; só os gatilhos por evento de obstrução.
- Os gatilhos valem só para M4 e M5. Nos modos de 60 min, a decisão espera sempre a hora cheia; a medida de estabilidade, porém, é feita a cada 15 min em todos os métodos.
- Reavaliar não gasta orçamento e não tem custo.
- Aleatória: a cada 60 min, escolhe uma ação válida (incluindo esperar) com a mesma chance; o sorteio é fixo por cenário e K.
- A auditoria offline de temporalidade (seção 13 do documento) ainda não foi feita.
