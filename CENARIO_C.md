# Cenário C: interdições sintéticas de quatro tipos

Pergunta: **o Dueling DDQN MLP continua competitivo quando as interdições são mais diversas?**

O cenário C parte do cenário B: mesma malha, mesma demanda (VDM do DNIT por sentido), mesma medida (≥ 80% dos 630 sentidos de trecho estáveis), mesma observação da rede inteira, mesmas ações e mesmo orçamento. Muda só o tipo das obstruções. O código fica em `simulador_c/`; `simulador/` e `simulador_b/` não foram alterados.

## O que muda em relação ao cenário B

| Elemento | Cenário B | Cenário C |
|---|---|---|
| Tipos de obstrução | Dois: "água na pista" (16%) ou desobstruível | **Quatro**: acidente, queda de barreira, dano na estrutura e água na pista |
| Bloqueio | Sempre total | Total ou **meia pista** (metade da capacidade), conforme o tipo |
| Desobstruir | Instantâneo | **Leva tempo**: a interdição só sai depois do tempo de remoção do tipo |
| Duração | Sorteada entre todas as interdições reais de 2024 | Própria de cada tipo (tabela abaixo) |
| O que o DDQN vê | 18 atributos | 22: os 18 do B + tipo da interdição (3) + tempo típico de remoção (1) |
| Guloso | Testa cada ação por 1 h | O mesmo, **mais um Guloso que olha 3 h à frente** |
| Métodos com DDQN | Treinado no B | **Treinado no C** e **a rede do B sem novo treino** (teste de generalização) |

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

Igual ao cenário B, com uma diferença no início das obstruções:

- **Tráfego de base:** semana típica, um estado a cada 2 h.
- **Obstruções:** de 4 a 12 por cenário, em trechos sorteados com peso pelo volume, em posição aleatória no trecho. O tipo é sorteado pela proporção da tabela.
- **Início:** de 1 a 12 h antes da primeira decisão, mas sem passar do ponto em que a obstrução já teria acabado. (No B, todas as durações eram longas; aqui um acidente de 2 h não pode ter começado 12 h antes.)
- **Filtro:** só valem cenários com menos de 80% dos trechos estáveis no início (até 400 tentativas). Como acidentes são curtos e muitas vezes parciais, só cerca de 1 em cada 8 sorteios passa no filtro (média de 7 rejeitados por cenário aceito).
- **Sementes:** treino a partir de 1.000.000, validação a partir de 2.000.000 e teste a partir de 3.000.000. `results/cenarios_c.json` guarda a tentativa aceita de cada semente, só para não refazer as rejeitadas.

## Como rodar

```powershell
node simulador_c/pregen.js 0 2                     # sorteia os cenários uma vez (em outro terminal: node simulador_c/pregen.js 1 2)
node simulador_c/train.js 0 2400                   # semente 0 (em outro terminal: node simulador_c/train.js 1 2400)
node simulador_c/select.js
node simulador_c/valref.js                          # Esperar, Guloso (1 h) e Guloso (3 h) na validação
node simulador_c/test.js 0 2                        # em outro terminal: node simulador_c/test.js 1 2
python simulador_c/build.py
python tools/embed.py simulador_c/viewer.html simulador_c/results/viz.json paginas/desobstrucao-rs-c.html
```

- Para juntar os arquivos do `pregen`, rode `node -e "const f=require('fs');const o=Object.assign({},...[0,1].map(i=>JSON.parse(f.readFileSync('simulador_c/results/cenarios_c_'+i+'.json'))));f.writeFileSync('simulador_c/results/cenarios_c.json',JSON.stringify(o))"`. O arquivo já vem pronto no repositório.
- **Monitor do treino:** `node simulador_c/monitor.js`, em http://localhost:8767.
- **Voltar ao treino de referência:** `node simulador_c/reset.js` (rede, tabelas e página) ou `node simulador_c/reset.js total` (só a rede).
- O teste usa a rede do B guardada em `simulador_b/baseline/total/selected.json`.

## Resultado

O teste usa 60 cenários × K ∈ {1, 3, 5, 10}, num total de 240 episódios por método. Os valores são horas até ≥ 80% dos trechos estáveis; menor é melhor.

| K | Esperar | Guloso (1 h) | Guloso (3 h) | DDQN treinado no C | Rede do B (sem novo treino) |
|---|---|---|---|---|---|
| 1 | 5,00 | 4,73 | **4,48** | 5,13 | 4,78 |
| 3 | 5,00 | 4,60 | **4,17** | 5,10 | 4,32 |
| 5 | 5,00 | 4,57 | **4,08** | 4,97 | 4,27 |
| 10 | 5,00 | 4,57 | **4,08** | 5,20 | 4,25 |
| **Média** | 5,00 | 4,62 | **4,20** | 5,10 | 4,40 |
| Veículo-hora médio | 20.428 | 20.185 | 19.333 | 21.040 | **18.736** |

| Comparação pareada (240 episódios) | Diferença média | IC 95% | Melhor / empate / pior |
|---|---|---|---|
| Rede do B − Guloso (1 h) | −0,21 h | −0,42 a −0,02 | 18% / 63% / 19% |
| Rede do B − Guloso (3 h) | +0,20 h | +0,03 a +0,36 | 13% / 60% / 28% |
| Rede do B − Esperar | −0,60 h | −0,81 a −0,40 | 22% / 76% / 2% |
| DDQN treinado no C − Guloso (1 h) | +0,48 h | +0,29 a +0,70 | 8% / 63% / 29% |
| DDQN treinado no C − Esperar | +0,10 h | −0,05 a +0,25 | 8% / 81% / 11% |
| DDQN treinado no C − rede do B | +0,70 h | +0,50 a +0,90 | 3% / 69% / 29% |
| Guloso (3 h) − Guloso (1 h) | −0,41 h | −0,58 a −0,25 | 20% / 76% / 4% |
| Veículo-hora: rede do B − Guloso (3 h) | −597 v·h | −1.011 a −181 | — |

Na validação (40 cenários × 4 orçamentos), usada só para escolher a rede: Esperar 4,73 h, Guloso (1 h) 4,08 h, Guloso (3 h) 4,06 h, rede do B 4,14 h e DDQN treinado no C 4,51 h (semente 1, episódio 2.400).

Desobstruções feitas no teste, por tipo: Guloso (1 h) 50 (só acidentes); Guloso (3 h) 179 (61 acidentes, 118 barreiras); rede do B 554 (121 acidentes, 274 barreiras, 159 estruturas); DDQN treinado no C 206 (15 acidentes, 91 barreiras, 100 estruturas), além de 473 interrupções e controles de 50%.

**Leitura:**

1. **Olhar mais à frente passou a importar.** Com remoção demorada, o Guloso de 1 h quase não desobstrui (só acidentes, cujo efeito aparece em menos de 1 h). O Guloso de 3 h desobstrui também barreiras e é o melhor método no tempo até estabilizar.
2. **A rede do B generalizou.** Sem novo treino e sem saber o tipo da interdição, ela venceu o Guloso de 1 h (−0,21 h, significativo) e teve a menor perda no trânsito de todos os métodos. Perdeu para o Guloso de 3 h (+0,20 h, significativo). Ela gasta orçamento em danos na estrutura, cuja obra provisória leva de 6 a 12 h e quase não ajuda dentro do horizonte.
3. **O DDQN treinado do zero no C não aprendeu uma boa política.** No teste ficou igual a Esperar (+0,10 h, intervalo contém o zero) e pior que a rede do B (+0,70 h). Na validação ficou entre Esperar e os outros métodos (4,51 h contra 4,73 h de Esperar e 4,08 h do Guloso), e a curva de validação ficou parada desde o episódio 300. Ele usa muitas interrupções e controles de 50%, que atrapalham, e desobstrui estruturas.

**Possíveis causas da falha do treino no C (hipóteses, não testadas):**

- O efeito de desobstruir agora chega horas depois; com recompensa de −1 por hora e desconto de 0,95, fica mais difícil o agente ligar a ação ao resultado.
- 2.400 episódios podem ser poucos para um problema com mais tipos e efeitos atrasados.
- Os quatro atributos novos mudam a entrada da rede, que começa do zero.

Próximos passos sugeridos: (a) ajustar a rede do B no cenário C (partir dos pesos do B em vez do zero); (b) treinar mais episódios; (c) testar sem as ações de controle (interromper e 50%) para ver se elas atrapalham o aprendizado.

## Suposições adicionais deste cenário

- Proporções dos tipos, duração dos acidentes, bloqueio parcial e todos os tempos de remoção são suposições. Não vêm de dados. As durações de barreira, estrutura e água vêm de poucas interdições reais (11, 5 e 14).
- "Meia pista" é metade da capacidade no ponto, nos sentidos bloqueados.
- O tempo de remoção não depende de equipes disponíveis nem de distância; várias remoções podem ocorrer ao mesmo tempo.
- O Guloso vê o tempo exato de remoção (porque simula); o DDQN vê só o tempo típico do tipo.
