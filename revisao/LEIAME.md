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

## Rodada da noite: P5 e P4 simplificado (`node revisao/run_noite.js`, ~7 h estimadas no i9)

- **P5 — permutação** (`revisao/p5/permutacao.js`): nas redes D1-DDQN, D1-Q1 e D2P-Q1 já treinadas, embaralha um grupo de atributos por
  vez e mede quanto o tempo até estabilizar piora (o que a rede usa).
- **P5 — ablações com treino** (`revisao/p5/configs.js`, `train.js`): DDQN (recompensa D1) treinado de novo sem um grupo de atributos
  por vez (7 grupos), e Q1/DDQN com α = 0 (só recompensa base), 0,10 e 0,50; 5 sementes × 2.400 episódios cada. Referência: D1 do
  cenário D, sementes 0 a 4 (o que a rede precisa).
- **P4 simplificado** (`revisao/p4/guloso_imperfeito.js`): Guloso de 1 h e de 6 h, com 5 ações e só desobstruindo, cujas simulações
  de teste usam um modelo imperfeito: (a) sem saber os tempos de remoção sorteados nem quando cada obstrução acabaria sozinha;
  (b) isso + demanda errada (±20%, por cenário) + filas com erro (±20% por sentido, a cada decisão).
- Resultados: `revisao/p5/RESULTADOS_P5.md` e `revisao/p4/RESULTADOS_P4.md`. Pode interromper e rodar de novo: o que terminou é pulado.
