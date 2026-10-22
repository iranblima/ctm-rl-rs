# Cenário C: interdições sintéticas de quatro tipos

Pergunta: **o Dueling DDQN MLP, treinado do zero num cenário sintético e mais diverso, se aproxima do Guloso?**

O cenário C é independente dos outros: treina e testa as próprias redes, sem usar nada aprendido em outro cenário. O código fica em `simulador_c/`; `simulador/` (cenário A) e `simulador_b/` não são usados nem alterados. O cenário C só lê do A os resultados de teste já publicados, para a tabela de comparação.

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
| Guloso | Testa cada ação por 1 h | O mesmo, **mais um Guloso que olha 3 h à frente** |
| DDQN | Todas as ações | **Duas versões, ambas do zero:** todas as ações (igual ao A) e só esperar e desobstruir |

Iguais ao A: malha (308 nós, 315 trechos, 630 sentidos), modelo de tráfego, decisão a cada 1 h por 12 h, orçamento K ∈ {1, 3, 5, 10}, medida (horas até ≥ 80% estável; ±20% ou ±30 veículos/h da referência sem obstrução), recompensa (−1 por hora até estabilizar), arquitetura e hiperparâmetros do DDQN, 2 sementes × 2.400 episódios, escolha da rede na validação.

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
node simulador_c/train.js 0 2400                    # DDQN com todas as ações, semente 0 (em outro terminal, a semente 1)
$env:CTM_ACOES="desob"; node simulador_c/train.js 0 2400   # DDQN só esperar e desobstruir (idem semente 1)
node simulador_c/select.js total
node simulador_c/select.js so_desob
node simulador_c/valref.js                          # Esperar, Guloso (1 h) e Guloso (3 h) na validação
node simulador_c/test.js 0 2                        # em outro terminal: node simulador_c/test.js 1 2
python simulador_c/build.py
python tools/embed.py simulador_c/viewer.html simulador_c/results/viz.json paginas/desobstrucao-rs-c.html
```

- `pregen.js` grava `cenarios_c_0.json` e `cenarios_c_1.json`; para juntar: `node -e "const f=require('fs');const o=Object.assign({},...[0,1].map(i=>JSON.parse(f.readFileSync('simulador_c/results/cenarios_c_'+i+'.json'))));f.writeFileSync('simulador_c/results/cenarios_c.json',JSON.stringify(o))"`. O arquivo já vem pronto no repositório.
- No Git Bash ou no Linux: `CTM_ACOES=desob node simulador_c/train.js 0 2400`.
- **Monitor do treino:** `node simulador_c/monitor.js total` ou `node simulador_c/monitor.js so_desob`, em http://localhost:8767.
- **Voltar ao treino de referência:** `node simulador_c/reset.js` (as duas redes, as tabelas e a página).

## Resultado

Teste: 60 cenários × K ∈ {1, 3, 5, 10} = 240 episódios por método. Horas até ≥ 80% dos trechos estáveis; menor é melhor.

| K | Esperar | Guloso (1 h) | Guloso (3 h) | DDQN todas as ações | DDQN só desobstruir |
|---|---|---|---|---|---|
| 1 | 5,00 | 4,73 | 4,48 | 5,13 | **4,45** |
| 3 | 5,00 | 4,60 | **4,17** | 5,10 | 4,25 |
| 5 | 5,00 | 4,57 | **4,08** | 4,97 | 4,15 |
| 10 | 5,00 | 4,57 | **4,08** | 5,20 | 4,13 |
| **Média** | 5,00 | 4,62 | **4,20** | 5,10 | 4,25 |
| Veículo-hora médio | 20.428 | 20.185 | 19.333 | 21.040 | **18.833** |

| Comparação pareada (240 episódios) | Diferença média | IC 95% | Melhor / empate / pior |
|---|---|---|---|
| DDQN só desobstruir − Guloso (3 h) | +0,04 h | −0,18 a +0,25 | 17% / 54% / 29% |
| DDQN só desobstruir − Guloso (1 h) | −0,37 h | −0,61 a −0,15 | 23% / 58% / 20% |
| DDQN só desobstruir − Esperar | −0,75 h | −1,00 a −0,53 | 25% / 75% / 0% |
| DDQN só desobstruir − todas as ações | −0,85 h | −1,11 a −0,62 | 31% / 68% / 1% |
| DDQN todas as ações − Guloso (3 h) | +0,90 h | +0,68 a +1,13 | 4% / 55% / 41% |
| DDQN todas as ações − Esperar | +0,10 h | −0,04 a +0,25 | 8% / 81% / 11% |
| Guloso (3 h) − Guloso (1 h) | −0,41 h | −0,59 a −0,26 | 20% / 76% / 4% |
| Veículo-hora: DDQN só desobstruir − Guloso (3 h) | −499 v·h | −919 a −68 | — |

Validação (40 cenários × 4 orçamentos), usada só para escolher a rede: Esperar 4,73 h, Guloso (1 h) 4,08 h, Guloso (3 h) 4,06 h, DDQN todas as ações 4,51 h (semente 1, episódio 2.400), DDQN só desobstruir 4,13 h (semente 1, episódio 1.500).

Ações no teste: DDQN só desobstruir fez 511 desobstruções (88 acidentes, 301 barreiras, 122 estruturas). DDQN todas as ações fez 206 desobstruções e 473 interrupções e controles de 50%. Guloso (3 h): 179 desobstruções (61 acidentes, 118 barreiras) e 312 interrupções e controles. Guloso (1 h): 50 desobstruções (só acidentes) e 368 interrupções e controles.

**Leitura:**

1. **Sem as ações de controle, o DDQN treinado do zero empatou com o melhor Guloso.** A diferença para o Guloso de 3 h é de +0,04 h, com intervalo contendo o zero. Ele vence o Guloso de 1 h (−0,37 h), nunca fica pior que Esperar e tem a menor perda no trânsito de todos os métodos (499 veículo-hora a menos que o Guloso de 3 h, significativo).
2. **Com todas as ações, o treino falha.** O DDQN fica igual a Esperar e troca desobstruções por interrupções e controles de 50%, que atrapalham. Tirar essas ações melhorou o tempo em 0,85 h.
3. **Olhar mais à frente importa para o Guloso.** Com remoção demorada, o Guloso de 1 h quase só desobstrui acidentes. O de 3 h desobstrui também barreiras e ganha 0,41 h.

## Comparação com o cenário A

| | Cenário A | Cenário C |
|---|---|---|
| Esperar | 4,97 h | 5,00 h |
| Melhor Guloso | 1,90 h | 4,20 h (Guloso de 3 h) |
| Melhor DDQN | 4,79 h | 4,25 h (só desobstruir) |
| **DDQN − melhor Guloso (pareado)** | **+2,88 h** (IC +2,44 a +3,37) | **+0,04 h** (IC −0,18 a +0,25) |
| DDQN vence ou empata | 22% | 71% |
| Melhor DDQN − Esperar | −0,19 h | −0,75 h |
| Episódios de teste | 156 | 240 |

As horas não são diretamente comparáveis (no A a estabilidade é medida em 32 postos, com instantes reais; no C, em 630 sentidos de trecho, com obstruções sintéticas). O que se compara é a distância entre os métodos.

**O que explica a mudança (o C altera várias coisas ao mesmo tempo, então são interpretações, não efeitos isolados):**

- **Desobstrução instantânea favorecia o Guloso no A.** Ele via o efeito de cada ação em 1 hora. Com remoção demorada, o Guloso precisa olhar mais à frente, e o DDQN, que aprende o valor de longo prazo, ganha espaço.
- **Treino e teste com a mesma distribuição.** No A, o DDQN treinou no pico das enchentes e foi testado numa fase posterior.
- **As ações de controle atrapalham o aprendizado.** No A, o DDQN também usou interrupções e controles (40 e 13), e o Guloso só desobstruiu. No C, o DDQN só com esperar e desobstruir foi 0,85 h melhor que com todas as ações.

Para separar esses efeitos, seria preciso rodar o cenário A só com esperar e desobstruir (teste sugerido).

## Suposições adicionais deste cenário

- Proporções dos tipos, duração dos acidentes, bloqueio parcial e todos os tempos de remoção são suposições. Não vêm de dados. As durações de barreira, estrutura e água vêm de poucas interdições reais (11, 5 e 14).
- "Meia pista" é metade da capacidade no ponto, nos sentidos bloqueados.
- O tempo de remoção não depende de equipes disponíveis nem de distância; várias remoções podem ocorrer ao mesmo tempo.
- O Guloso vê o tempo exato de remoção (porque simula); o DDQN vê só o tempo típico do tipo.
- O Guloso sempre pode usar todas as ações, inclusive na comparação com o DDQN só desobstruir. Isso não o prejudica: ele tem mais opções.
- O VDM do DNIT é uma estimativa anual, e a observação de cada trecho é o fluxo do próprio simulador, sem erro (observação completa ideal).
