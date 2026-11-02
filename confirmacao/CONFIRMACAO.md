# Confirmação num conjunto de teste novo (registrada ANTES de rodar, 02/11/2026)

**Por quê.** Os 100 cenários de teste do C2/D (sementes 4.000.000+) foram usados em muitas análises (D, D2, causas, P0, P1, P4, P5).
Para que os números principais do artigo venham de dados que não influenciaram nenhuma decisão, rodamos os métodos da conclusão final
em **100 cenários novos** (sementes 5.000.000 a 5.000.099), sorteados pelo mesmo gerador do cenário D, × K ∈ {1, 3, 5, 10}.
Nada é treinado nem ajustado: mesmas redes, mesmas regras, mesmos parâmetros.

**Métodos.** Esperar; Aleatória; regra "maior fluxo" (a cada 15 min); D1-Q1, D1-DDQN e D2P-Q1 (redes escolhidas na validação do D);
Guloso olhando 1, 3 e 6 h (decide a cada 60 min), com 5 ações e só desobstruindo; Guloso de 6 h com modelo imperfeito "realista"
(sem saber tempos de remoção e fins; demanda ±20% por cenário; filas ±20% por sentido a cada decisão), com 5 ações e só desobstruindo.

**Comparações fixadas antes de ver os resultados** (diferença pareada; IC 95% por bootstrap agrupado por cenário):
1. Horizonte: Guloso 3 h − 1 h e 6 h − 1 h (5 ações; só desobstruir).
2. Planejamento longo × aprendizado: Guloso 6 h − D1-DDQN e − D2P-Q1 (5 ações; só desobstruir).
3. Modelo imperfeito: Guloso 6 h realista − perfeito; realista − D1-DDQN e − D2P-Q1 (5 ações; só desobstruir).
4. Aprendizado × planejamento curto: D1-DDQN − Guloso 1 h e D2P-Q1 − Guloso 1 h (5 ações).
5. Retorno futuro: D1-DDQN − D1-Q1.
6. Regra simples: regra "maior fluxo" − D1-DDQN e − D2P-Q1.
7. Aprender ajuda: D1-DDQN − Esperar.

Comando: `node confirmacao/run_confirmacao.js` → `confirmacao/RESULTADOS_CONFIRMACAO.md` (com os números do teste antigo ao lado).
