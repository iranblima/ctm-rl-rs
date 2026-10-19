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
- `simulador/`: tudo do experimento, em Node.js sem dependências.
  - `sim.js` = M3, modelo de transmissão por células (CTM).
  - `env.js` = M1/M2/M4/M5: ações, observação causal, KPI, Guloso.
  - `rl.js` = M6, rede neural; `train.js` = treino.
  - `baseline/` = treino de referência (não alterar).
- `preparacao/prep.py`: gera `data/derived/rsdata.json`.
- `data/raw/`: dados de entrada (SNV/DNIT, PNCT, PRF). **Não alterar.**
- `paginas/desobstrucao-rs.html`: o simulador com os dados embutidos. `tools/embed.py` gera a página.
- Detalhes: `README.md`. Treino, monitor e reset: `TREINO.md`.

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

## Regras de trabalho
- O teste é rodado **uma única vez** por modelo. Não escolha hiperparâmetros olhando o teste; use a validação.
- Toda mudança no simulador ou no ambiente precisa reproduzir os números de referência, ou explicar por que mudaram.
- Suposições atuais, que não vêm dos dados:
  - quem fica parado desiste a 3% por minuto;
  - a desobstrução é imediata;
  - não há escolha de rota;
  - estável = ±20% ou ±30 veículos/h da simulação sem interdições.
- Commits pequenos, com mensagem em português.

## Próximo passo planejado
Portar `sim.js` e `env.js` para Python, com interface Gymnasium e os contratos M1–M9 da proposta. Vetorizar a física com NumPy ou Numba e passar a rede para PyTorch. Antes de qualquer melhoria, validar que a versão portada reproduz os números acima.
