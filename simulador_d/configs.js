// Cenário D — configurações (reunião de 28/10/2026). Todas: só esperar ou desobstruir, Δτ ∈ {15, 30, 60} min (como M4/M5 do C2).
// Q1 = política míope aprendida (alvo y = r); DDQN = Dueling Double DQN (alvo y = r + γ(Δτ)·Q_alvo).
// Recompensas (base = −Δτ/60 por época até estabilizar):
//   D1  'estavel'  : base + α[γ(Δτ)·Φ' − Φ], Φ = fração de trechos estáveis (a recompensa atual, do M5)
//   D2L 'literal'  : base + λ·importância da obstrução, quando a ação é desobstruir (combinação linear somada direto)
//   D2P 'potencial': base + α[γ(Δτ)·Ψ' − Ψ], Ψ = fração da importância das obstruções já liberada
// α = 0,25 (do diagnóstico A3); λ = 0,25 (mesma escala; suposição).
const ALPHA = 0.25, LAMBDA = 0.25;
const CONFIGS = {
  'D1-Q1':    { pol: 'q1',   variavel: true, rec: 'estavel',   alpha: ALPHA, nome: 'D1 — Q1, reward atual (fração estável)' },
  'D1-DDQN':  { pol: 'ddqn', variavel: true, rec: 'estavel',   alpha: ALPHA, nome: 'D1 — DDQN, reward atual (fração estável)' },
  'D2L-Q1':   { pol: 'q1',   variavel: true, rec: 'literal',   alpha: ALPHA, lambda: LAMBDA, nome: 'D2L — Q1, importância somada direto' },
  'D2L-DDQN': { pol: 'ddqn', variavel: true, rec: 'literal',   alpha: ALPHA, lambda: LAMBDA, nome: 'D2L — DDQN, importância somada direto' },
  'D2P-Q1':   { pol: 'q1',   variavel: true, rec: 'potencial', alpha: ALPHA, nome: 'D2P — Q1, importância como potencial' },
  'D2P-DDQN': { pol: 'ddqn', variavel: true, rec: 'potencial', alpha: ALPHA, nome: 'D2P — DDQN, importância como potencial' },
};
module.exports = { CONFIGS, ALPHA, LAMBDA };
