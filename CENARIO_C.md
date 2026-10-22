# Cenário C: interdições sintéticas de quatro tipos

Pergunta: **o Dueling DDQN MLP, treinado do zero num cenário sintético e mais diverso, se aproxima do Guloso?**

O cenário C é independente dos outros: treina e testa a própria rede, sem usar nada aprendido em outro cenário. O código fica em `simulador_c/`; `simulador/` (cenário A) e `simulador_b/` não são usados nem alterados. O cenário C só lê do A os resultados de teste já publicados, para a tabela de comparação.

## O que muda em relação ao cenário A

| Elemento | Cenário A | Cenário C |
|---|---|---|
| Situações de partida | 192 instantes reais das enchentes de 2024, com as interdições reais ativas | **4 a 12 obstruções sintéticas** sorteadas na rede toda, sobre o tráfego de uma semana típica |
| Tipos de interdição | Reais. "Água na pista" não é desobstruível; o resto é | **Quatro tipos**: acidente, queda de barreira, dano na estrutura e água na pista |
| Bloqueio | Sempre total no ponto | Total ou **meia pista**, conforme o tipo |
| Desobstruir | Instantâneo | **Leva tempo**: a interdição só sai depois do tempo de remoção do tipo |
| Demanda por trecho | VDM do cadastro ÷ 2 por sentido | **VDM por sentido do DNIT** (VDM Modelagem 2019, SNV 202001A) em 295 dos 315 trechos; nos outros 20, VDM do cadastro ÷ 2 |
| Onde se mede a estabilidade | 32 postos de contagem | **Todos os 630 sentidos de trecho** |
| O que o DDQN vê | Fluxo no posto mais próximo (18 atributos) | Fluxo no próprio trecho e nos que chegam a ele, mais o tipo da interdição e o tempo típico de remoção (22 atributos) |
| Treino e teste | Divididos por data (treino no pico, teste numa fase posterior) | 300 cenários de treino, 40 de validação e 60 de teste, sorteados do mesmo jeito e independentes |

Iguais ao A: as 5 ações (esperar, desobstruir, interromper, controle de 50% e liberar), o Guloso (adaptação do Greedy MC do artigo: testa cada ação no simulador por 1 h e escolhe a melhor), malha (308 nós, 315 trechos, 630 sentidos), modelo de tráfego, decisão a cada 1 h por 12 h, orçamento K ∈ {1, 3, 5, 10}, medida (horas até ≥ 80% estável; ±20% ou ±30 veículos/h da referência sem obstrução), recompensa (−1 por hora até estabilizar), arquitetura e hiperparâmetros do DDQN, 2 sementes × 2.400 episódios, escolha da rede na validação.

### Tipos de interdição (suposições)

| Tipo | Proporção | Duração natural (se ninguém agir) | Dois sentidos | Bloqueio | Remoção depois de desobstruir |
|---|---|---|---|---|---|
| Acidente | 40% | Típica de 2,5 h (entre 45 min e 10 h) | 30% | Metade total, metade meia pista | 30 a 90 min; depois libera tudo |
| Queda de barreira | 25% | Interdições reais de 2024 com "barreira", "deslizamento" ou "encosta" (11) | 91% (real) | Total | 2 a 6 h; depois libera tudo |
| Dano na estrutura | 15% | Interdições reais com "cedeu", "rompimento", "cratera", "erosão" etc. (5) | 100% (real) | Total | 6 a 12 h de obra provisória; depois **meia pista** até o fim |
| Água na pista | 20% | Interdições reais com "água", "alagamento", "cheia" etc. (14) | 93% (real) | Total | Não desobstruível |

- O tempo de remoção de cada obstrução é sorteado no início do cenário. O Guloso, que simula, enxerga o tempo exato. O DDQN só vê o tempo típico do tipo (o meio da faixa).
- Uma obstrução já em remoção não pode ser desobstruída de novo.

### Como os cenários são sorteados

- **Tráfego de base:** semana típica (perfil horário dos postos PNCT), um estado a cada 2 h.
- **Obstruções:** de 4 a 12 por cenário, em trechos sorteados com peso pelo volume, em posição aleatória no trecho. O tipo é sorteado pela proporção da tabela.
- **Início:** de 1 a 12 h antes da primeira decisão, sem passar do ponto em que a obstrução já teria acabado.
- **Filtro:** só valem cenários com menos de 80% dos trechos estáveis no início (até 400 tentativas). Cerca de 1 em cada 8 sorteios passa.
- **Sementes:** treino a partir de 1.000.000, validação a partir de 2.000.000 e teste a partir de 3.000.000. `results/cenarios_c.json` guarda a tentativa aceita de cada semente, só para não refazer as rejeitadas.

## Como rodar

```powershell
node simulador_c/pregen.js 0 2                      # sorteia os cenários uma vez (em outro terminal: node simulador_c/pregen.js 1 2)
node simulador_c/train.js 0 2400                    # semente 0 (em outro terminal: node simulador_c/train.js 1 2400)
node simulador_c/select.js
node simulador_c/valref.js                          # Esperar e Guloso na validação
node simulador_c/test.js 0 2                        # em outro terminal: node simulador_c/test.js 1 2
python simulador_c/build.py
python tools/embed.py simulador_c/viewer.html simulador_c/results/viz.json paginas/desobstrucao-rs-c.html
```

- `pregen.js` grava `cenarios_c_0.json` e `cenarios_c_1.json`; para juntar: `node -e "const f=require('fs');const o=Object.assign({},...[0,1].map(i=>JSON.parse(f.readFileSync('simulador_c/results/cenarios_c_'+i+'.json'))));f.writeFileSync('simulador_c/results/cenarios_c.json',JSON.stringify(o))"`. O arquivo já vem pronto no repositório.
- **Monitor do treino:** `node simulador_c/monitor.js`, em http://localhost:8767.
- **Voltar ao treino de referência:** `node simulador_c/reset.js` (rede, tabelas e página).

## Resultado

Teste: 60 cenários × K ∈ {1, 3, 5, 10} = 240 episódios por método. Horas até ≥ 80% dos trechos estáveis; menor é melhor.

| K | Esperar | Guloso | DDQN |
|---|---|---|---|
| 1 | 5,00 | **4,73** | 5,13 |
| 3 | 5,00 | **4,60** | 5,10 |
| 5 | 5,00 | **4,57** | 4,97 |
| 10 | 5,00 | **4,57** | 5,20 |
| **Média** | 5,00 | **4,62** | 5,10 |

| Comparação pareada (240 episódios) | Diferença média | IC 95% | Melhor / empate / pior |
|---|---|---|---|
| DDQN − Guloso | +0,48 h | +0,29 a +0,70 | 8% / 63% / 29% |
| DDQN − Esperar | +0,10 h | −0,04 a +0,25 | 8% / 81% / 11% |
| Guloso − Esperar | −0,38 h | −0,53 a −0,25 | 23% / 73% / 4% |

Validação (usada só para escolher a rede): Esperar 4,73 h, Guloso 4,08 h, DDQN 4,51 h (semente 1, episódio 2.400).

## Comparação com o cenário A

| Média de horas até 80% estável | Cenário A | Cenário C |
|---|---|---|
| Esperar | 4,97 | 5,00 |
| Guloso | 1,90 | 4,62 |
| DDQN | 4,79 | 5,10 |
| **DDQN − Guloso (mesma situação)** | **+2,88 h** (IC +2,44 a +3,37) | **+0,48 h** (IC +0,29 a +0,70) |

Positivo: o DDQN levou mais tempo que o Guloso. Nos dois cenários o Guloso foi melhor, com diferença estatisticamente significativa; no C, a diferença é bem menor.

As horas não são diretamente comparáveis entre A e C (no A a estabilidade é medida em 32 postos, com instantes reais; no C, em 630 sentidos de trecho, com obstruções sintéticas). O que se compara é a distância entre DDQN e Guloso.

## Suposições adicionais deste cenário

- Proporções dos tipos, duração dos acidentes, bloqueio parcial e todos os tempos de remoção são suposições. Não vêm de dados. As durações de barreira, estrutura e água vêm de poucas interdições reais (11, 5 e 14).
- "Meia pista" é metade da capacidade no ponto, nos sentidos bloqueados.
- O tempo de remoção não depende de equipes disponíveis nem de distância; várias remoções podem ocorrer ao mesmo tempo.
- O Guloso vê o tempo exato de remoção (porque simula); o DDQN vê só o tempo típico do tipo.
- O VDM do DNIT é uma estimativa anual, e a observação de cada trecho é o fluxo do próprio simulador, sem erro (observação completa ideal).
