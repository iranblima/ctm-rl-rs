// Cenário C2 — as seis configurações do desenho experimental (M0–M5) e o α do reward progressivo.
// Q1 = política míope aprendida (alvo y = r, sem retorno futuro); DDQN = Dueling Double DQN (alvo y = r + γ(Δτ)·Q_alvo).
// α = 0,25: valor escolhido na validação do cenário A (diagnóstico A3); aqui não foi reajustado (suposição).
const ALPHA = 0.25;
const CONFIGS = {
  M0: { pol: 'q1',   variavel: false, alpha: 0,     nome: 'M0 — Q1 míope, 60 min, reward base' },
  M1: { pol: 'ddqn', variavel: false, alpha: 0,     nome: 'M1 — DDQN, 60 min, reward base' },
  M2: { pol: 'q1',   variavel: false, alpha: ALPHA, nome: 'M2 — Q1 míope, 60 min, reward progressivo' },
  M3: { pol: 'ddqn', variavel: false, alpha: ALPHA, nome: 'M3 — DDQN, 60 min, reward progressivo' },
  M4: { pol: 'q1',   variavel: true,  alpha: ALPHA, nome: 'M4 — Q1-SMDP, Δτ variável, reward progressivo' },
  M5: { pol: 'ddqn', variavel: true,  alpha: ALPHA, nome: 'M5 — DDQN-SMDP, Δτ variável, reward progressivo' },
};
module.exports = { CONFIGS, ALPHA };
