// P5 — ablações (treino novo, 5 sementes × 2.400 episódios cada, mesmo protocolo do cenário D).
// A-*: DDQN com a recompensa D1 (a de referência), retirando UM grupo de atributos da observação (o grupo vira zero no treino e no teste).
// R-*: recompensa D1 com outro peso α do termo de progresso (α = 0: só a recompensa base −Δτ/60), para Q1 e DDQN.
// Referência: D1-DDQN e D1-Q1 do cenário D (α = 0,25, todos os atributos), sementes 0 a 4.
// Índices dos atributos (simulador_d/env.js, feats): 0–4 tipo da ação; 5–6 fluxo do trecho previsto agora e nas próximas 3 h (z entre candidatos);
// 7–8 grau do entroncamento e pista dupla (z); 9–12 fluxo observado no trecho (3 janelas de 1 h) e nos que chegam a ele; 13 tempo desde o
// início da obstrução; 14–17 contexto (orçamento restante, hora, nº de obstruções ativas, fração estável); 18–21 tipo da obstrução e tempo
// típico de remoção; 22–24 intervalo até a próxima decisão (Δτ).
const GRUPOS = { obstrucao: [18, 19, 20, 21], fluxo_previsto: [5, 6], estrutura: [7, 8], fluxo_observado: [9, 10, 11, 12], tempo_obstrucao: [13], contexto: [14, 15, 16, 17], dtau: [22, 23, 24] };
const NOMES = { obstrucao: 'tipo e tempo de remoção da obstrução', fluxo_previsto: 'fluxo previsto do trecho', estrutura: 'grau do entroncamento e pista dupla', fluxo_observado: 'fluxo observado no trecho e vizinhos', tempo_obstrucao: 'tempo desde o início da obstrução', contexto: 'contexto (orçamento, hora, nº de obstruções, fração estável)', dtau: 'intervalo da decisão (Δτ)' };
const CONFIGS = {};
for (const [g, idx] of Object.entries(GRUPOS)) CONFIGS[`A-sem-${g}`] = { pol: 'ddqn', variavel: true, rec: 'estavel', alpha: 0.25, mascara: idx, ref: 'D1-DDQN', nome: `DDQN sem ${NOMES[g]}` };
for (const [tag, a] of [['base', 0], ['a010', 0.10], ['a050', 0.50]]) for (const pol of ['Q1', 'DDQN'])
  CONFIGS[`R-${tag}-${pol}`] = { pol: pol.toLowerCase(), variavel: true, rec: 'estavel', alpha: a, mascara: [], ref: `D1-${pol}`, nome: `${pol}, α = ${String(a).replace('.', ',')}${a === 0 ? ' (só recompensa base)' : ''}` };
const SEMENTES = [0, 1, 2, 3, 4], ALPHA = 0.25, LAMBDA = 0.25;
module.exports = { CONFIGS, GRUPOS, NOMES, SEMENTES, ALPHA, LAMBDA };
