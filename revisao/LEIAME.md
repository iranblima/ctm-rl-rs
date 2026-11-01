# Revisão metodológica (P0 e P1), a partir do relatório "CTM-RL: retorno futuro" (31/10/2026)

- **P0 — estatística** (`node revisao/p0.js`, segundos; nada é rodado de novo): IC por bootstrap agrupado por cenário (os 4
  orçamentos K de um cenário entram juntos), fração de episódios que não estabilizaram, comparações com a média das 10 sementes e
  custo computacional. Resultado: `revisao/P0_ESTATISTICA.md`.
- **P1 — feedback sequencial** (`node revisao/run_p1.js`): cada política aprendida (D1-Q1 e D1-DDQN) comparada com ela mesma,
  replanejando × com plano fixo no início, com calendário fixo (15 e 60 min), no cenário D determinístico e com obstruções novas
  que surgem durante o episódio. Sem treino. Resultado: `revisao/RESULTADOS_P1.md`.

Escolhas desta análise (declaradas antes dos resultados): no plano fixo, a observação do tráfego fica congelada em t0 e só relógio,
orçamento e tempo desde o início de cada obstrução são atualizados; obstruções novas: 1 a 4 por cenário, tipo e trecho sorteados como
no gerador do D, início entre 30 min e 6 h após a primeira decisão, sorteio fixo por cenário.
