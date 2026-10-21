# Cenário B: rede inteira observável

Pergunta: **o Dueling DDQN MLP perde para o Guloso porque não enxerga a rede inteira?**

Para responder, o cenário B usa a mesma malha, as mesmas ações, o mesmo orçamento e o mesmo KPI da proposta CTM–RL. Muda só o que está na tabela abaixo. O código fica em `simulador_b/`; o simulador original (`simulador/`) não foi alterado.

## O que muda em relação ao simulador original

| Elemento | Simulador original | Cenário B |
|---|---|---|
| Demanda por trecho | VDM do cadastro ÷ 2 por sentido | **VDM por sentido do DNIT** (VDM Modelagem 2019, SNV 202001A) em 295 dos 315 trechos (5.498 de 5.718 km); nos outros 20, o VDM do cadastro ÷ 2 |
| Onde se mede a estabilidade (KPI) | 32 postos de contagem | **Todos os 630 sentidos de trecho** |
| O que o agente vê | Fluxo no posto mais próximo (t, t−1, t−2) | **Fluxo no próprio trecho (t, t−1, t−2) e nos trechos que chegam a ele** |
| Cenários | 192 instantes reais de 2024, divididos por data | **Obstruções sorteadas na rede toda**: 300 de treino, 40 de validação e 60 de teste, independentes |
| Controle | — | O mesmo DDQN treinado com a observação **só nos postos**, no mesmo ambiente, para isolar o efeito da observação |

O VDM do DNIT é uma estimativa anual do modelo de tráfego do DNIT, não uma contagem do dia. Por isso, o cenário B é um **cenário de observação completa em simulação**. Ele não equivale a ter sensores em toda a malha.

### Como os cenários são sorteados

- **Tráfego de base:** semana típica, com o perfil horário dos postos PNCT e o VDM por sentido. Há um estado de base a cada 2 h da semana.
- **Obstruções:** de 4 a 12 por cenário, em trechos sorteados com peso pelo volume e em posição aleatória no trecho.
  - Bloqueiam os dois sentidos com a mesma proporção das interdições reais (`d = 0`).
  - Começam de 1 a 12 h antes da primeira decisão.
  - Duram o mesmo que uma interdição real sorteada.
  - Uma parte é "água na pista", não desobstruível, na mesma proporção das reais.
- **Filtro:** só valem cenários com menos de 80% dos trechos estáveis no início. Se o sorteio não atinge isso, ele é refeito.
- **Sementes de sorteio:** treino a partir de 1.000.000, validação a partir de 2.000.000 e teste a partir de 3.000.000. Os três conjuntos nunca se misturam.

## Como rodar

Na pasta do repositório, com dois terminais para treinar em paralelo:

```powershell
python preparacao/vdm_dnit.py                                  # gera data/derived/vdm_dnit.json (já incluído)
$env:CTM_OBS="total";  node simulador_b/train.js 0 2400         # rede inteira, semente 0 (~6 min de sorteio + ~15 min)
$env:CTM_OBS="total";  node simulador_b/train.js 1 2400
$env:CTM_OBS="postos"; node simulador_b/train.js 0 2400         # controle: só postos
$env:CTM_OBS="postos"; node simulador_b/train.js 1 2400
node simulador_b/select.js total
node simulador_b/select.js postos
node simulador_b/valref.js                                      # Esperar e Guloso na validação
node simulador_b/test.js 0 2                                    # em outro terminal: node simulador_b/test.js 1 2
python simulador_b/build.py
python tools/embed.py simulador_b/viewer.html simulador_b/results/viz.json paginas/desobstrucao-rs-b.html
```

- **Monitor do treino:** `node simulador_b/monitor.js total`, aberto em http://localhost:8766. Para acompanhar o controle, use `postos`.
- **Voltar ao treino de referência:** `node simulador_b/reset.js` (as duas observações, as tabelas e a página) ou `node simulador_b/reset.js total`.
- **No Git Bash ou no Linux,** use `CTM_OBS=total node simulador_b/train.js 0 2400`.

## Resultado

O teste usa 60 cenários × K ∈ {1, 3, 5, 10}, num total de 240 episódios por método. Os valores são horas até ≥ 80% dos trechos estáveis; menor é melhor.

| K | Esperar | Guloso | DDQN rede inteira | DDQN só postos |
|---|---|---|---|---|
| 1 | 6,87 | **4,67** | 5,02 | 5,13 |
| 3 | 6,87 | **2,63** | 3,13 | 3,13 |
| 5 | 6,87 | **2,43** | 2,83 | 2,97 |
| 10 | 6,87 | **2,42** | 2,98 | 3,03 |

| Comparação pareada (240 episódios) | Diferença média | IC 95% | Melhor / empate / pior |
|---|---|---|---|
| DDQN rede inteira − Guloso (KPI) | +0,45 h | +0,29 a +0,62 | 5% / 62% / 33% |
| DDQN só postos − Guloso (KPI) | +0,53 h | +0,36 a +0,70 | 5% / 57% / 39% |
| DDQN rede inteira − só postos (KPI) | −0,08 h | −0,23 a +0,07 | 19% / 67% / 14% |
| DDQN rede inteira − só postos (veículo-hora em 12 h) | −1.487 v·h | −2.215 a −776 | 53% / 16% / 31% |

Na validação (40 cenários × 4 orçamentos), usada só para escolher a rede: Esperar 6,40 h, Guloso 2,74 h, DDQN rede inteira 3,38 h (semente 0, episódio 1.500) e DDQN só postos 3,38 h (semente 0, episódio 900).

**Leitura:**

1. **A distância para o Guloso caiu muito**, de +2,88 h no simulador original para +0,45 h. O DDQN agora empata em 62% dos episódios e vence em 5%. Mas o Guloso continua melhor, com diferença estatisticamente significativa.
2. **A observação completa não mudou o tempo até estabilizar.** A diferença entre ver a rede inteira e ver só os postos é de −0,08 h, e o intervalo contém o zero. Quase toda a melhora veio da mudança de cenários: obstruções sorteadas e conjuntos de treino e teste com a mesma distribuição. O simulador original treinava no pico das enchentes e testava numa fase posterior.
3. **A observação completa reduziu a perda no trânsito.** O DDQN que vê a rede inteira perdeu, em média, 1.487 veículo-hora a menos por episódio que o que vê só os postos, com intervalo inteiro abaixo de zero. Ele escolhe desobstruções que aliviam mais a fila, mas que não mudam a hora em que a rede cruza o limiar de 80%.

Resumo: a hipótese de que **não ver a rede inteira explica a derrota para o Guloso não se confirmou pelo KPI**. A observação completa ajuda numa medida secundária (veículo-hora), mas a maior parte da diferença vinha da distribuição dos cenários. A vantagem que resta ao Guloso vem de ele testar cada ação no simulador.

## Suposições adicionais deste cenário

- O fluxo "observado" de cada trecho é o do próprio simulador, medido no meio do trecho. É observação completa e sem erro, um caso ideal.
- O fluxo típico usado para normalizar a observação é o VDM por sentido × o perfil horário (conhecido antes do evento).
- As obstruções sorteadas não têm causa específica. Valem as mesmas regras de duração e de "água na pista" das reais.
- Os 20 trechos sem VDM na planilha (não pavimentados, "não simuláveis", planejados ou sem dado) mantêm o VDM do cadastro.
