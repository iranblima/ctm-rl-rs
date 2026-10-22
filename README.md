# ctm-rl-rs

Simulador e experimento da **proposta CTM–RL**, extensão do artigo *Sequential Spatial-Temporal Influence Maximization under Flow, Coverage, and Capacity Constraints* (Lerma, Taveira, Menezes e Buarque).

**Pergunta:** com a malha federal do Rio Grande do Sul já obstruída, onde, quando e como intervir para que a rede observável volte a se estabilizar o mais cedo possível?

Compara três métodos nas mesmas situações:

- **Esperar**, sem intervir;
- **Guloso** (Greedy MC);
- **Dueling DDQN MLP**, o método proposto.

## Alterações combinadas em relação ao artigo inicial

| Elemento | Artigo inicial | Esta versão |
|---|---|---|
| Propagação | Cascata independente, por sorteio | Modelo de transmissão por células (CTM): fila, recepção limitada, espalhamento para trás |
| Ponto de partida | Rede sem obstrução | Instante real das enchentes de 2024, com as interdições ativas naquela hora |
| Semente / ação | Ativar um nó | **Desobstruir** uma interdição real, além de Esperar, Interromper, Controle 50% e Liberar controle |
| Passo de decisão | Um dia | 1 hora, durante 12 horas |
| Orçamento | K = 5 | K ∈ {1, 3, 5, 10}; esperar não gasta |
| Medida principal | Nós alcançados | Horas até ≥ 80% dos postos de contagem estarem estáveis; recompensa −1 por hora até estabilizar |
| O que o agente vê | Fluxo futuro e atributos | Só observação causal: postos em t, t−1 e t−2, interdições, controles, orçamento e progresso |

## Estrutura

| Pasta / arquivo | Conteúdo |
|---|---|
| `simulador/sim.js` | Modelo de tráfego CTM (M3): células de ~2 km, passo de 1 min, capacidade de envio e recepção, nós com FIFO em pista simples |
| `simulador/env.js` | Ambiente (M1, M2, M4, M5): instantes de início, ações e lista curta, observação causal, KPI, Guloso |
| `simulador/rl.js`, `train.js` | Dueling DDQN MLP (M6) e treino |
| `simulador/select.js`, `test.js`, `build.py` | Escolha do checkpoint na validação, teste e tabelas com IC bootstrap |
| `simulador/scan.js`, `valref.js` | Fluxos de referência dos postos; Esperar e Guloso na validação |
| `simulador/monitor.js`, `reset.js` | Monitor do treino ao vivo; volta ao treino de referência |
| `simulador/viewer.html` | Modelo da página do simulador |
| `simulador/results/` | Resultados atuais: checkpoints, rede escolhida, testes, resumo |
| `simulador_c/`, `CENARIO_C.md` | **Cenário C**: interdições sintéticas de quatro tipos (acidente, barreira, estrutura, água), com remoção demorada (branch `cenario-c-interdicoes-sinteticas`) |
| `simulador/baseline/` | Cópia protegida do treino de referência (não alterar) |
| `preparacao/prep.py` | Gera `data/derived/rsdata.json` a partir dos dados brutos |
| `data/raw/` | Malha SNV/DNIT, contagens PNCT e interdições da PRF (chuvas de 2024) |
| `data/derived/` | `rsdata.json` (malha + postos + interdições) e `node_names.json` (nomes dos nós) |
| `paginas/desobstrucao-rs-c.html` | Página do cenário C |
| `paginas/desobstrucao-rs.html` | O simulador pronto para abrir no navegador |
| `tools/embed.py` | Junta o modelo HTML com os dados e gera a página |

## Cenário C (interdições sintéticas de quatro tipos)

Treina o Dueling DDQN MLP do zero com obstruções sintéticas (acidente, barreira, estrutura, água) e remoção demorada, e compara com o cenário A. Resultado (DDQN − Guloso, em horas até estabilizar): +0,48 h no cenário C, contra +2,88 h no cenário A. O Guloso continua melhor, mas a diferença caiu. Detalhes em [`CENARIO_C.md`](CENARIO_C.md).

## Requisitos

- **Node.js 18 ou mais novo.** O simulador e o treino não usam pacotes externos.
- **Python 3.10 ou mais novo:** `pip install -r requirements.txt`. É usado só na preparação dos dados e nas tabelas.

## Uso rápido

- **Ver o simulador:** abra `paginas/desobstrucao-rs.html`.
- **Treinar, acompanhar e voltar ao estado de referência:** veja [TREINO.md](TREINO.md).
- **Regerar os dados derivados (opcional):** `python preparacao/prep.py`. Leva cerca de 1 minuto e produz um arquivo idêntico ao incluído.

## Resultado de referência

O teste usa 39 instantes reais (13/05 18h a 17/05 0h), cada um com 4 orçamentos, num total de 156 episódios. Os valores são horas até ≥ 80% dos postos estáveis; menor é melhor.

| K | Esperar | Guloso | Dueling DDQN MLP | DDQN − Guloso (IC 95%) |
|---|---|---|---|---|
| 1 | 4,97 h | 2,54 h | 4,90 h | +2,36 (+1,41 a +3,44) |
| 3 | 4,97 h | 1,69 h | 4,90 h | +3,21 (+2,33 a +4,18) |
| 5 | 4,97 h | 1,69 h | 4,46 h | +2,77 (+2,08 a +3,54) |
| 10 | 4,97 h | 1,69 h | 4,90 h | +3,21 (+2,33 a +4,15) |

No conjunto, o DDQN levou **+2,88 h** a mais que o Guloso (IC 95% +2,44 a +3,33). Ele perdeu em 78% dos episódios, empatou em 22% e não venceu nenhum.

## Suposições e cuidados

- **Não vêm dos dados:**
  - quem fica parado desiste a 3%/min;
  - a desobstrução é imediata;
  - não há escolha de rota;
  - estável = ±20% ou ±30 veículos/h da simulação sem interdições.
- **Correção feita depois do treino de referência.** As ações legais passaram a excluir interdições que terminam no próprio minuto da decisão, e o Guloso passou a restaurar o histórico de estabilidade depois de olhar à frente. O teste já usa a versão corrigida; os checkpoints de referência foram treinados com a anterior.
- **Tudo é determinista** com as sementes indicadas.
- **Os dados de `data/raw/`** foram cedidos pelos autores do artigo. Confirme com eles antes de tornar o repositório público.
