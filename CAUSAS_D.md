# Análise das causas: por que o RL vence o Guloso no cenário D

Pedido na conversa de 29/10/2026 ("temos que analisar as causas"). Nada é treinado: as políticas aprendidas são as do D, e tudo roda
nos mesmos 100 cenários de teste × K ∈ {1, 3, 5, 10} = 400 episódios. Código em `causas_d/`.

| Análise | Pergunta | Arquivo |
|---|---|---|
| 1. Regras simples | Uma regra fixa de "desobstruir cedo" (por fluxo, por importância, remoção longa primeiro, remoção curta primeiro), decidindo a cada 15 min, chega perto do RL? | `regras.js` |
| 2. Guloso olhando mais longe | Se o Guloso testar cada ação por 3 h ou 6 h (em vez de 1 h), ele passa a desobstruir e alcança o RL? (diagnóstico; o Guloso da comparação principal não muda) | `guloso_h.js` |
| 3. Auditoria no D | Só com esperar/desobstruir, quanto o ganho de cada desobstrução aparece em 15 min, 1 h, 3 h e 6 h, por tipo? | `auditoria.js` |
| 4. Decisões do RL | O que o RL desobstrui (tipo, fluxo), e quando? | `analise.js` |
| 5. Onde o RL vence | Em que episódios (orçamento, nº de obstruções, remoções longas, estabilidade inicial) a vantagem aparece? | `analise.js` |

```powershell
node causas_d/run_causas.js
```

Resultado em `causas_d/RESULTADOS_CAUSAS.md`.

## Suposições desta análise

- O Guloso que olha mais longe decide a cada 60 min (no D2, decidir a cada 15 min mudou só 0,03 h). No teste de cada ação, o
  simulador vai até o fim do horizonte mesmo que a rede estabilize no meio, para comparar todas as ações no mesmo instante. Por isso
  roda-se também o horizonte de 1 h com esse mesmo procedimento, como referência.
- As regras usam os mesmos candidatos de desobstrução que o RL vê (até 20 por decisão).
- Limiares (1 pp de inversão, 2 pp de benefício atrasado) e as faixas dos grupos são escolhas fixadas antes de ver os resultados.
