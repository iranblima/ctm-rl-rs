# Referência para o porte (etapa 0)

Esta pasta guarda o comportamento atual do simulador em Node.js, passo a passo. A versão em Python precisa reproduzir esses números antes de qualquer melhoria (ver "Próximo passo planejado" no `CLAUDE.md`).

O script só **lê** `simulador/`, `data/derived/rsdata.json`, `simulador/results/scan.json` e `simulador/results/selected.json`. Ele não altera nada fora da pasta de saída.

## Arquivos em `referencia/`

| Arquivo | Conteúdo |
|---|---|
| `replay_fluxos.json` | Replay real com as interdições, hora a hora, de T0 = 1,5 dia até o último instante de início: `t` (min), fluxo de cada um dos 32 postos (veículos/h), interdições ativas e fração estável |
| `inicios.json` | Os 192 instantes de início: `t`, parte (treino / validação / teste) e fração estável inicial `stab0` |
| `episodios_validacao.json` | Esperar, Guloso e DDQN em 5 instantes de validação × K ∈ {1, 3, 5, 10} = 60 episódios. Em cada hora: candidatos legais, 18 atributos de cada candidato, Q de cada candidato, índice da decisão, recompensa, fração estável, veículo-hora acumulado e fluxos dos postos |
| `verificacao_rapida.json` | Momento de teste 0, K = 3, para os três métodos (os números do `CLAUDE.md`) |
| `entradas.json` | SHA-256 dos arquivos de entrada lidos, para saber se uma diferença veio da entrada |
| `SHA256SUMS` | SHA-256 de cada arquivo acima |

### Escolhas desta etapa (não vêm do artigo nem da proposta)

- **Os 5 instantes de validação** são o primeiro, o último e três intermediários espaçados por igual entre os 38: posições 0, 9, 19, 28 e 37 da validação (posições 115, 124, 134, 143 e 152 entre os 192).
- **Q para os três métodos.** O Q é o da rede escolhida (`selected.json`: semente 1, episódio 2.100). Só o DDQN decide por ele. Nos episódios de Esperar e Guloso ele serve apenas para conferir a rede portada em mais estados.
- **A recompensa** é o valor devolvido por `Ep.advance()`: −1 por hora enquanto a rede não estabiliza e 0 depois. As simulações de 1 h que o Guloso faz para olhar à frente não entram no registro.
- **O replay** repete o laço de `starts()`. O script confere que os 3 últimos fluxos guardados em cada início são iguais ao replay e para com erro se não forem.
- **T0 = 1,5 dia** está repetido no script porque `env.js` não o exporta (pendência 10).

## Regerar

Na pasta do repositório (leva alguns minutos; o Guloso é a parte mais lenta):

```powershell
node testes/gerar_referencia.js
```

O script grava `testes/referencia/` e mostra os hashes. Ele também roda a verificação rápida do `CLAUDE.md` e termina com erro se o resultado não for Esperar 8 h / 9.223 v·h, Guloso 4 h / 8.048 v·h e DDQN 7 h / 8.800 v·h.

Para gravar em outra pasta: `node testes/gerar_referencia.js C:\caminho\da\pasta`.

## Conferir sem regravar

```powershell
node testes/gerar_referencia.js --conferir
```

Gera tudo em memória e compara com `testes/referencia/SHA256SUMS`. Imprime `igual` ou `DIFERENTE` para cada arquivo e termina com código 1 se houver diferença.

- Se `entradas.json` mudou, a diferença vem dos dados ou do modelo escolhido (por exemplo, depois de um `select.js` novo), não do código.
- Regerar a referência só é aceitável junto com uma mudança declarada no simulador ou no modelo, como manda o `CLAUDE.md`.

## Como a versão em Python deve usar isto

1. Carregar `inicios.json` e conferir `t` e `stab0` dos 192 inícios.
2. Conferir os fluxos de `replay_fluxos.json` hora a hora.
3. Para cada episódio de `episodios_validacao.json`, partir do mesmo início e K, impor as mesmas decisões e comparar candidatos, atributos, Q, recompensa e fluxos em cada hora.

A comparação de números com vírgula deve aceitar uma tolerância pequena, porque a ordem das somas pode mudar no NumPy. Candidatos, decisões, recompensas e o KPI precisam ser **iguais**.
