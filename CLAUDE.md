# Instruções para o Claude neste repositório

## Contexto
Repositório de pesquisa (doutorado em IA, UPE). Estende o artigo *Sequential Spatial-Temporal Influence Maximization under Flow, Coverage, and Capacity Constraints* (Lerma, Taveira, Menezes e Buarque) com a **proposta CTM–RL**: a malha federal do RS começa obstruída (momentos reais das enchentes de 2024) e, a cada hora, um método escolhe uma intervenção. Compara **Esperar × Guloso (Greedy MC) × Dueling DDQN MLP (método proposto)**.

O dono do repositório é desenvolvedor e policial rodoviário federal. Ele conhece bem a operação da PRF, mas está começando em aprendizado por reforço.

## Como responder
- Português, linguagem simples, sem siglas não explicadas. Explique como para quem está começando na área.
- **Não invente.** Siga o artigo e a proposta. Toda escolha que não estiver neles deve ser marcada como suposição.
- Não use nome de pessoa para identificar trabalho ou método ("artigo da Fulana", "método do Fulano"). Use o título do artigo, "proposta CTM–RL" ou "método proposto". Autores só em citações (Lerma et al.; Taveira et al., 2026).
- Respostas objetivas. Mostre números com unidade e diga de onde vieram.

## Estrutura
- `simulador/`: tudo do experimento, em Node.js sem dependências. Correspondência com os módulos da proposta CTM–RL:

| Módulo da proposta | Papel na proposta | Onde está no código |
|---|---|---|
| M1 Scenario | Cenário: rede de base, interrupções, trechos, observabilidade | `env.js`: `starts()` (replay real até cada instante) + `sim.SITES` (interdições) + `scan.json` (referência sem interdições) |
| M2 CausalObservationModel | Observação causal, só com histórico | `env.js`: `Ep.feats()` (18 atributos por candidato) |
| M3 PhysicalSimulator | `reset(scenario)`, `advance(cmd, 1 h)` | `sim.js` (CTM); `Ep.advance()` chama 60 passos de 1 min |
| M4 ActionModule | `legal_mask`, `to_command` | `env.js`: `Ep.legal()` (candidatos + lista curta) e `Ep.apply()` (ação → multiplicador de capacidade) |
| M5 ModularTrafficEnv | `reset`, `step`, orçamento, horizonte | `env.js`: classe `Ep` + `runEpisode()` |
| M6 DQNPolicy | Escolhe a ação pelo Q, com máscara legal | `rl.js` (`Net`, `makePolicy`); treino em `train.js` |
| M7 GreedyPolicy | `clone(env)`, 1 passo à frente | `env.js`: `P.greedy` (snap/restore do simulador) |
| M8 | Não definido no material da proposta | — |
| M9 factory.make_env | Cria e liga os componentes | Não existe como função; hoje `env.js` monta tudo ao ser carregado |
| Tracker | Estabilização e KPI | `env.js`: `stableFrac()`, `stFlags()`, dentro de `Ep.advance()` |

- `simulador/baseline/`: treino de referência (não alterar).
- `preparacao/prep.py`: gera `data/derived/rsdata.json`.
- `data/raw/`: dados de entrada (SNV/DNIT, PNCT, PRF). **Não alterar.**
- `paginas/desobstrucao-rs.html`: o simulador com os dados embutidos. `tools/embed.py` gera a página.
- Detalhes: `README.md`. Treino, monitor e reset: `TREINO.md`.
- Tamanho da rede no simulador: 308 nós, 630 sentidos de trecho (links), 5.744 células, 32 postos com referência, 88 interdições.

## Comandos principais
```
node simulador/train.js 0 2400     # treino de uma semente (~16 min)
node simulador/monitor.js          # curvas ao vivo em http://localhost:8765
node simulador/select.js           # escolhe o checkpoint na validação
node simulador/test.js 0 2         # teste (rodar também com 1 2)
python simulador/build.py          # tabelas, IC bootstrap, viz.json
node simulador/reset.js            # volta ao treino de referência
```

## Resultados de referência (para conferir se nada quebrou)
- Validação: Esperar 7,05 h; Guloso 2,51 h; DDQN escolhido (semente 1, episódio 2.100) 3,71 h.
- Teste (39 momentos × K ∈ {1, 3, 5, 10}): Guloso 1,69 a 2,54 h; DDQN 4,46 a 4,90 h; Esperar 4,97 h. DDQN − Guloso = +2,88 h (IC 95% +2,44 a +3,33).
- Verificação rápida: com o momento de teste 0 e K = 3, Esperar estabiliza em 8 h (9.223 v·h), Guloso em 4 h (8.048 v·h) e DDQN em 7 h (8.800 v·h).

## Suposições do modelo (todas documentadas aqui; não vêm dos dados)
- Quem fica parado (velocidade < 20% da livre) desiste a 3%/min e sai da simulação. Na fila de entrada da rede, a desistência é 3%/min × fração bloqueada.
- Desobstruir vale na hora; não há tempo de trabalho da equipe.
- Não há escolha de rota. A divisão nos entroncamentos é fixa, calculada por preenchimento proporcional (4 rodadas) sobre o volume médio diário ÷ 2 de cada sentido, sem meia-volta. A demanda que sobra nasce nos nós de origem.
- A demanda segue o perfil horário por dia da semana e, em 2024, é multiplicada pelo fator real dos postos (limitado a 0,15–1,6; só com ≥ 6 postos com dado).
- O dia da semana é calculado como (5 + dia) % 7 porque o dia 0 (27/04/2024) é um sábado e o perfil usa segunda = 0 (convenção do pandas).
- FIFO (quem não segue trava quem vem atrás) só em pista simples.
- Estável = fluxo do posto a ±20% ou ±30 veículos/h da simulação sem interdições. Limiares de "parado" (20%) e "lento" (50%) da velocidade livre.
- Interromper e Controle 50% atuam só na primeira célula do trecho que chega ao entroncamento de uma interdição ativa.
- 36 links têm célula mais curta que a distância percorrida em 1 min (condição CFL do CTM violada; a fração é cortada em 1) e 40 têm armazenamento mínimo de 1,5 km.
- "Greedy MC" é o nome do artigo inicial; aqui o simulador é determinista e o Guloso faz uma única simulação de 1 h por candidato.

## Limitações e pendências conhecidas (backlog)
Não mudam os resultados atuais. Corrigir só como mudança declarada, revalidando os números de referência.
1. Estado global: `env.js` usa um único `sim` compartilhado; dois ambientes no mesmo processo se corrompem. Resolver no porte (cada ambiente com seu simulador).
2. Após `restore`, os objetos de interdição são cópias; `bindEv`/`apply` religam pelo índice da interdição. No porte, endereçar sempre pelo índice.
3. `makeSim` altera os dados de entrada (`e.links` em `D.edges`); `scan.js` cria dois simuladores sobre o mesmo `D`.
4. Comentário em `sim.js` fala em velocidade < 50% para desistência; o código usa 20%.
5. Replay priorizado simplificado: sem pesos de importância, registro novo com prioridade 1 (não a máxima), substituição aleatória com a memória cheia, sorteio O(N).
6. O fim do horizonte (hora 12) é tratado como terminal. Isso é coerente com um problema de horizonte fixo, porque o progresso h/H está na observação. No Gymnasium, usar `terminated=True` na hora 12, não `truncated`.
7. B = 32 gera até 33 candidatos (com Esperar). Normalizações `left/10` e `nAct/30` são escalas fixas, sem outra justificativa.
8. Código morto: `stNode` e `sc` em `env.js`.
9. `'use strict'` vem depois de `process.chdir` em vários scripts e por isso não tem efeito.
10. Constante `T0 = 1,5 dia` duplicada em `scan.js` e `env.js`; sementes `[0, 1]` fixas em `select.js`.
11. Validação e teste são vizinhos no tempo (último instante de validação 13/05 17h, primeiro de teste 13/05 18h), e os episódios de 12 h se sobrepõem. Citar como limitação; para a tese, considerar um intervalo de separação.
12. Sem teste automático: a verificação rápida acima ainda é manual.

## Regras de trabalho
- O teste é rodado **uma única vez** por modelo. Não escolha hiperparâmetros olhando o teste; use a validação.
- Reproduzir o teste com o **mesmo modelo** (por exemplo, para validar um porte de código) é permitido: não há escolha nova.
- Toda mudança no simulador ou no ambiente precisa reproduzir os números de referência, ou explicar por que mudaram.
- Suposições atuais, que não vêm dos dados:
  - quem fica parado desiste a 3% por minuto;
  - a desobstrução é imediata;
  - não há escolha de rota;
  - estável = ±20% ou ±30 veículos/h da simulação sem interdições.
- Commits pequenos, com mensagem em português.

## Cenário C (branch `cenario-c-interdicoes-sinteticas`)
- Código em `simulador_c/`, independente: treina e testa as próprias redes do zero; só lê os testes do cenário A (`simulador/baseline/results/`) para comparar. Documentação e resultados em `CENARIO_C.md`.
- Tipos de interdição e tempos de remoção em `TIPOS` (env.js), todos suposições. Desobstruir não é instantâneo. 22 atributos.
- DDQN em duas versões: todas as ações (`results/total/`) e só esperar e desobstruir (`CTM_ACOES=desob`, `results/so_desob/`).
- Guloso igual ao do cenário A (testa cada ação por 1 h).
- Referência no teste (média de 240 episódios): Esperar 5,00 h; Guloso 4,62; DDQN todas as ações 5,10; DDQN só desobstruir 4,25.
- DDQN − Guloso: todas as ações +0,48 h; só desobstruir −0,37 h. No cenário A: +2,88 h.
- Pendência: rodar o cenário A só com esperar e desobstruir, para separar os efeitos.

## Próximo passo planejado
Portar `sim.js` e `env.js` para Python, com interface Gymnasium e os contratos M1–M9 da proposta. Vetorizar a física com NumPy ou Numba e passar a rede para PyTorch. Antes de qualquer melhoria, validar que a versão portada reproduz os números acima.
