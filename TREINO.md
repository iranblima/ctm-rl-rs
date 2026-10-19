# Guia do treino: rodar, acompanhar e voltar ao estado de referência

Este guia cobre o simulador da pasta `simulador/`: a proposta CTM–RL, em que o Dueling DDQN MLP (método proposto) é comparado com o Guloso e com Esperar.

Os comandos são para o **PowerShell no Windows** e partem sempre da pasta do repositório:

```powershell
cd $HOME\Desktop\ctm-rl-rs
```

> No Windows, se `python` não funcionar, use `py` no lugar.

---

## 1. Antes de começar (uma vez só)

1. Instale o **Node.js 18 ou mais novo** (nodejs.org) e o **Python 3.10 ou mais novo** (python.org).
2. Confira as versões:
   ```powershell
   node -v
   python --version
   ```
3. Instale as bibliotecas Python, usadas só para gerar tabelas e páginas:
   ```powershell
   pip install -r requirements.txt
   ```

O treino em si roda só com o Node e não precisa instalar nada além disso.

---

## 2. Só ver os resultados (sem treinar)

Abra `paginas\desobstrucao-rs.html` com dois cliques. A página já traz o modelo treinado e os resultados do teste.

- **Momento de início:** um instante real das enchentes (13 a 17/05/2024).
- **Orçamento K:** quantas intervenções o método pode fazer em 12 horas.
- **Relógio:** de 0 a 12 h, com uma decisão por hora.
- **Dois mapas:** o mesmo instante decidido por dois métodos.

Cada episódio é um "e se": começa no estado real da rede naquele instante e simula as 12 horas seguintes. Os episódios não se encadeiam.

---

## 3. Treinar e acompanhar ao vivo

Use **dois terminais**, os dois abertos na pasta do repositório.

### Terminal 1: o treino

```powershell
node simulador/train.js 0 2400
```

- `0` é a **semente**, o número que fixa o sorteio. A mesma semente dá sempre o mesmo treino.
- `2400` é o número de **episódios**. Cada semente leva cerca de 16 minutos.
- Para registrar com mais frequência no monitor: `node simulador/train.js 0 2400 --log 10`. O padrão é a cada 50 episódios.
- Para treinar uma segunda semente ao mesmo tempo, abra um **terceiro terminal** e rode `node simulador/train.js 1 2400`.
- Para interromper: **Ctrl+C**.

A cada 300 episódios aparece uma linha como esta:

```
semente 0 ep 600 validação: KPI 4.500 h, 7682 v·h (4.3 min)
```

Ela mostra o tempo médio até estabilizar nos 38 instantes de validação. **Menor é melhor.**

### Terminal 2: o monitor

```powershell
node simulador/monitor.js
```

Abra **http://localhost:8765** no navegador. A página se atualiza sozinha a cada 5 segundos e pode ficar aberta durante todo o treino. Para fechar o monitor, use **Ctrl+C** no terminal 2. Isso não afeta o treino.

### Como ler o monitor

| Parte | O que mostra | Como interpretar |
|---|---|---|
| Selos no topo | Cada semente: treinando (ponto verde piscando) ou parada; episódio, ε e minutos | Confirma que o treino está andando |
| **KPI na validação** (gráfico grande) | Horas médias até estabilizar, a cada 300 episódios | Menor é melhor. As linhas **Esperar (7,05 h)** e **Guloso (2,51 h)** são as comparações. O tracejado claro é o treino de referência. O círculo vazado marca o checkpoint escolhido |
| Retorno médio | −1 por hora sem estabilizar (−3 ≈ estabilizou em 3 h) | Subir é bom. Oscila bastante, porque é média de poucos episódios |
| Exploração (ε) | Chance de agir ao acaso | Cai de 1 para 0,05 nos primeiros 60% do treino. É normal o retorno melhorar depois que ε cai |
| Erro da rede | Diferença entre o Q previsto e o alvo | Sobe no início e depois se acomoda. Se crescer sem parar, o treino está instável |
| Ações gastas | Quanto do orçamento K o agente usa por episódio | O Guloso usa de 1 a 1,7 em média |

---

## 4. Depois do treino: escolher, testar e ver o resultado

Rode na ordem:

```powershell
node simulador/select.js
node simulador/test.js 0 2
node simulador/test.js 1 2
python simulador/build.py
python tools/embed.py simulador/viewer.html simulador/results/viz.json paginas/desobstrucao-rs.html
```

1. `select.js` escolhe o checkpoint com menor KPI na validação e grava `results\selected.json`.
2. Os dois `test.js` dividem os 39 instantes de teste entre si. Cada um leva cerca de 6 minutos; para ganhar tempo, rode cada um num terminal, ao mesmo tempo.
3. `build.py` calcula as médias, a diferença pareada e o IC bootstrap, e grava `results\summary.json`.
4. `embed.py` atualiza a página `paginas\desobstrucao-rs.html` com o seu treino.

> **O teste é rodado uma única vez por modelo.** Se quiser ajustar algo, olhe a validação (no monitor), não o teste.

---

## 5. Voltar ao estado de referência (reset)

O treino que gerou os resultados publicados está guardado em `simulador\baseline\`. O reset apaga os checkpoints, registros e testes novos e restaura essa cópia, inclusive a página `paginas\desobstrucao-rs.html`.

**Pelo monitor:** clique em **Voltar ao treino de referência** e confirme.

**Pelo terminal:**

```powershell
node simulador/reset.js
```

O terminal pede confirmação (digite `s`). Para não pedir: `node simulador/reset.js --sim`.

Cuidados:

- O reset é **recusado enquanto houver treino rodando**, e o botão do monitor fica desligado. Interrompa o treino com Ctrl+C antes.
- `results\scan.json` e `results\valref.json` são mantidos, porque dependem só dos dados.
- Um treino novo substitui os checkpoints **apenas da semente que está treinando**.
- **Não altere a pasta `baseline\`.** Ela é a cópia de segurança.

Para conferir que voltou ao estado de referência: no monitor, o selo deve dizer **"Escolhido: semente 1, ep. 2.100"**, e a página deve mostrar DDQN − Guloso = **+2,88 h**.

---

## 6. Problemas comuns

| Mensagem ou sintoma | O que fazer |
|---|---|
| `node` ou `python` não é reconhecido | Instale ou reinicie o terminal. No Windows, tente `py` no lugar de `python` |
| `Já existe um treino da semente 0 rodando` | Já há um treino dessa semente aberto em outro terminal. Use outra semente ou interrompa o primeiro |
| Monitor diz "sem conexão" | O terminal do monitor foi fechado. Rode `node simulador/monitor.js` de novo |
| Porta 8765 ocupada | Use outra porta: `node simulador/monitor.js 8770` e abra `http://localhost:8770` |
| O gráfico de validação fica vazio no começo | É normal: o primeiro ponto só sai no episódio 300 (cerca de 2 minutos) |
| Números diferentes dos publicados após retreinar | É esperado: houve uma pequena correção no código depois do treino de referência (ver README). Para voltar aos números publicados, use o reset |

---

## Arquivos gerados pelo treino (em `simulador\results\`)

| Arquivo | Conteúdo |
|---|---|
| `train_log_<semente>.jsonl` | Uma linha a cada N episódios: retorno, KPI, ε, erro da rede, ações (é o que o monitor lê) |
| `ckpt_<semente>.json` | Checkpoints a cada 300 episódios, com pesos e desempenho na validação |
| `selected.json` | Pesos do checkpoint escolhido |
| `test_0.json`, `test_1.json` | Cada episódio de teste: KPI, veículo-hora e decisões hora a hora |
| `summary.json` | Números finais por orçamento e comparação pareada |
| `.training_<semente>.lock` | Existe só enquanto o treino roda. É apagado sozinho no fim ou no Ctrl+C |
