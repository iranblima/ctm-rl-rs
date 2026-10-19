# andina-ctm-rl

Código, dados e resultados dos experimentos feitos para o artigo da Andina Alay Lerma (com Taveira, Menezes e Buarque) sobre a escolha sequencial de intervenções na malha federal do Rio Grande do Sul.

O repositório tem quatro etapas, na ordem em que foram feitas. Cada etapa guarda o código, os resultados que geraram as páginas e a página pronta para abrir no navegador.

| Pasta | O que é | Linguagem |
|---|---|---|
| `00_simulador_enchentes/` | Preparação dos dados e simuladores das enchentes de 2024 (replay das interdições e liberação de trechos) | Python + HTML/JS |
| `01_reproducao_artigo/` | Reprodução do experimento do artigo inicial: cascata independente, K = 5 sementes, Dueling DDQN × Improved Re-rank × Greedy MC e outros | Python |
| `02_ordem_liberacao/` | Primeira adaptação: semente = liberar um trecho interditado, propagação da fila pelo modelo de tráfego, Guloso × Dueling DDQN | JavaScript (Node.js) |
| `03_desobstrucao_ctm_rl/` | **Versão atual**, a proposta CTM–RL: rede obstruída, decisão a cada hora por 12 h, orçamento K ∈ {1, 3, 5, 10}, Esperar × Guloso × Dueling DDQN MLP | JavaScript (Node.js) |
| `data/raw/` | Arquivos enviados pela Andina (malha SNV, contagens PNCT, interdições da PRF) | — |
| `data/derived/` | `rsdata.json`: malha + postos + interdições prontos para os simuladores (gerado por `00_simulador_enchentes/prep.py`) | — |
| `paginas/` | Todas as páginas dos simuladores, já com os dados embutidos | HTML |
| `tools/embed.py` | Junta um modelo HTML com um JSON de dados e gera a página | Python |

## Requisitos

- **Python 3.10 ou mais novo**: `pip install -r requirements.txt`
- **Node.js 18 ou mais novo** (testado no 22). As etapas 02 e 03 não usam nenhum pacote externo.

## Como rodar

Todos os comandos partem da pasta raiz do repositório. Os scripts acham os próprios arquivos, então podem ser chamados de qualquer lugar.

### 00 · Dados e simuladores das enchentes

```bash
python 00_simulador_enchentes/prep.py        # gera data/derived/rsdata.json (~1 min)
python 00_simulador_enchentes/make2.py       # monta o modelo do simulador de liberação (passo 1)
python 00_simulador_enchentes/make3.py       # (passo 2) → template_liberacao.html
python tools/embed.py 00_simulador_enchentes/template_enchentes.html data/derived/rsdata.json paginas/malha-rs-enchentes.html
python tools/embed.py 00_simulador_enchentes/template_liberacao.html data/derived/rsdata.json paginas/liberacao-trechos-rs.html
```

Nesses dois simuladores o modelo de tráfego roda no próprio navegador, dentro da página.

### 01 · Reprodução do artigo inicial

```bash
python 01_reproducao_artigo/data.py       # snapshots diários por aresta com imputação em 5 níveis → results/snap.npz (~2 min)
python 01_reproducao_artigo/run.py        # Re-rank, treino do DDQN (3 sementes × 1.500 episódios), teste (~1 h)
python 01_reproducao_artigo/viz_data.py   # results/viz.json para a página
python tools/embed.py 01_reproducao_artigo/viewer.html 01_reproducao_artigo/results/viz.json paginas/reproducao-artigo-rs.html
```

Arquivos principais:

- `env.py`: ambiente (cascata por arestas vivas, lista curta pela Eq. 2, políticas de referência);
- `rl.py`: Dueling DDQN em NumPy.

### 02 · Ordem de liberação (primeira adaptação)

```bash
node 02_ordem_liberacao/train.js 0 1200 &   # semente 0 (~25 min)
node 02_ordem_liberacao/train.js 1 1200 &   # semente 1, em paralelo
wait
node 02_ordem_liberacao/select.js           # escolhe o checkpoint na validação → results/selected.json
node 02_ordem_liberacao/test.js 0 2 & node 02_ordem_liberacao/test.js 1 2 & wait
python 02_ordem_liberacao/build.py          # tabelas, IC bootstrap → results/viz.json
python tools/embed.py 02_ordem_liberacao/viewer.html 02_ordem_liberacao/results/viz.json paginas/ordem-liberacao-rs.html
```

### 03 · Desobstrução CTM–RL (versão atual)

```bash
node 03_desobstrucao_ctm_rl/scan.js         # replay com e sem interdições; fluxos de referência dos postos → results/scan.json (~1 min)
node 03_desobstrucao_ctm_rl/train.js 0 2400 & node 03_desobstrucao_ctm_rl/train.js 1 2400 & wait   # (~16 min cada)
node 03_desobstrucao_ctm_rl/select.js       # menor KPI médio na validação → results/selected.json
node 03_desobstrucao_ctm_rl/valref.js       # Esperar e Guloso na validação (referência)
node 03_desobstrucao_ctm_rl/test.js 0 2 & node 03_desobstrucao_ctm_rl/test.js 1 2 & wait            # teste, uma única vez (~6 min)
python 03_desobstrucao_ctm_rl/build.py      # tabelas por K, diferença pareada, IC → results/summary.json e viz.json
python tools/embed.py 03_desobstrucao_ctm_rl/viewer.html 03_desobstrucao_ctm_rl/results/viz.json paginas/desobstrucao-rs.html
```

## Etapa 03 por dentro

| Arquivo | Papel (módulo da proposta) |
|---|---|
| `sim.js` | **M3, simulador físico.** Modelo de transmissão por células (Daganzo): células de ~2 km, passo de 1 min, capacidade de envio e recepção, modelo de nó com FIFO em pista simples, desistência de 3%/min de quem está parado, fluxo horário nos postos. `man[]` é o multiplicador de capacidade que as ações alteram. |
| `env.js` | **M1 + M2 + M4 + M5 + Tracker.** Monta os momentos de início a partir do replay real (`starts`). A classe `Ep` gera as ações legais e a lista curta (`legal`), os 18 atributos causais (`feats`), traduz a ação em comando de capacidade (`apply`) e avança 1 h, calculando estabilidade e recompensa (`advance`). Também contém o Guloso (`P.greedy`, que clona o ambiente e olha 1 h à frente) e `runEpisode`. |
| `rl.js` | **M6.** Dueling DDQN MLP escrito à mão: 18 → 32 → 32 por candidato, cabeça de vantagem por ação e de valor pela média dos candidatos, Adam com corte de gradiente em 5. |
| `train.js` | Treino: ε de 1 para 0,05 em 60% dos episódios, replay priorizado (α = 0,6, até 20.000 registros), lote de 32, alvo Double DQN com γ = 0,95, rede-alvo a cada 200 atualizações, checkpoint a cada 300 episódios avaliado na validação. |
| `results/selected.json` | Pesos da rede escolhida (semente 1, episódio 2.100). Para carregar: `Net.from(require('./results/selected.json').net)`. |
| `results/ckpt_*.json` | Todos os checkpoints, com o desempenho na validação. |
| `results/test_*.json` | Cada episódio de teste: KPI, veículo-hora, decisões hora a hora e quadros do mapa. |
| `results/summary.json` | Números finais (por K, agregados, correlação Q × KPI). |

### Resultado principal (teste: 39 momentos × 4 orçamentos)

| K | Esperar | Guloso | Dueling DDQN | DDQN − Guloso (IC 95%) |
|---|---|---|---|---|
| 1 | 4,97 h | 2,54 h | 4,90 h | +2,36 (+1,41 a +3,44) |
| 3 | 4,97 h | 1,69 h | 4,90 h | +3,21 (+2,33 a +4,18) |
| 5 | 4,97 h | 1,69 h | 4,46 h | +2,77 (+2,08 a +3,54) |
| 10 | 4,97 h | 1,69 h | 4,90 h | +3,21 (+2,33 a +4,15) |

As células são horas até ≥ 80% dos postos estáveis; menor é melhor.

## Suposições e cuidados

- **Não vêm dos dados:**
  - desistência de 3%/min de quem está parado;
  - desobstrução imediata, sem tempo de trabalho da equipe;
  - ausência de escolha de rota;
  - critério de estabilidade (±20% ou ±30 veículos/h em relação à simulação sem interdições).
- **Correção feita depois do treino da etapa 03.** `legal()` passou a excluir interdições que terminam exatamente no minuto da decisão, e o Guloso passou a restaurar o histórico de estabilidade depois de olhar à frente. O teste e os números acima já usam a versão corrigida; os checkpoints foram treinados com a anterior.
- **As etapas 01 a 03 são deterministas** com as sementes indicadas: rodar o teste de novo dá os mesmos números. Retreinar a etapa 03 com o código corrigido gera checkpoints um pouco diferentes dos guardados.
- **Os dados em `data/raw/`** vêm do SNV/DNIT, do PNCT e da PRF e foram enviados pela Andina. Antes de tornar este repositório público, confirme com ela.

## Próximo passo planejado

Portar o simulador (`sim.js`) e o ambiente (`env.js`) para Python, com a interface Gymnasium e os contratos M1 a M9 da proposta. A física seria vetorizada em NumPy ou Numba, e a rede passaria para PyTorch. A versão portada deve reproduzir os números desta.
