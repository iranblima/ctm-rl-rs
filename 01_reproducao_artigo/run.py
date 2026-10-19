import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
import json, time, sys
import numpy as np
from env import *
from rl import train, make_policy, features

T0 = time.time()
log = lambda m: print(f'[{time.time() - T0:6.0f}s] {m}', flush=True)
env = Env('results/snap.npz')
nD = env.nD
idx = lambda s: np.where(env.split == s)[0]
tr_days, va_days, te_days = idx('train'), idx('val'), idx('test')
train_starts = tr_days[tr_days + K + H <= tr_days[-1]]
val_starts = np.linspace(va_days[0], va_days[-1] - K, 20).astype(int)
test_starts = np.linspace(te_days[0], te_days[-1] - K - H, 50).astype(int)


def evaluate(pol, starts, R=200, seed=0):
    return np.array([sum(run_policy(env, pol, int(t), seed=seed, R=R).rewards) for t in starts])


def boot_ci(x, n=5000, seed=1):
    r = np.random.default_rng(seed); m = r.choice(x, (n, len(x))).mean(1)
    return float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))


# ---- Improved Re-rank: pesos escolhidos na validação ----
grid = [(a, b, c) for a in (0, .5, 1) for b in (0, .5, 1) for c in (0, .5, 1)]
best = max(grid, key=lambda lam: evaluate(make_rerank(lam), val_starts, R=100, seed=1).mean())
log(f'Re-rank lambdas {best}')
rr_val = evaluate(make_rerank(best), val_starts, R=100, seed=1)

# ---- RL: 3 sementes de treino, checkpoint escolhido na validação pelo limite inferior do IC da diferença ----
cands = []
for seed in (0, 1, 2):
    for ep_n, net in train(env, train_starts, seed, 1500, log=log):
        v = evaluate(make_policy(net), val_starts, R=100, seed=1)
        gap = v - rr_val
        lo, hi = boot_ci(gap, 1000)
        crit = lo if gap.mean() >= 0 else lo - 2.0
        cands.append((crit, seed, ep_n, float(gap.mean()), net))
        log(f'  val seed {seed} ep {ep_n}: mean {v.mean():.2f} gap {gap.mean():+.2f} lo {lo:+.2f}')
crit, sbest, ebest, gbest, net = max(cands, key=lambda c: c[0])
log(f'selected seed {sbest} ep {ebest} val gap {gbest:+.2f}')
val_seeds = [{'seed': c[1], 'ep': c[2], 'gap': round(c[3], 2)} for c in cands]

# ---- teste (uma única vez) ----
POL = {
    'RL (Dueling DDQN)': make_policy(net), 'Improved Re-rank': make_rerank(best), 'Temporal Strength': p_strength,
    'PageRank': p_pagerank, 'Degree': p_degree, 'Betweenness': p_btw, 'Greedy MC': p_greedy_mc, 'Random': p_random,
}
res = {}
for name, pol in POL.items():
    t = time.time(); x = evaluate(pol, test_starts); res[name] = x
    log(f'test {name}: {x.mean():.2f} ({time.time() - t:.0f}s)')
table = []
for name, x in res.items():
    lo, hi = boot_ci(x)
    cv = float(np.sort(x)[:max(1, len(x) // 5)].mean())
    table.append(dict(name=name, mean=round(float(x.mean()), 2), lo=round(lo, 2), hi=round(hi, 2), cvar20=round(cv, 1),
                      mc=(len(test_starts) * K * B * 5 if name == 'Greedy MC' else 0)))
table.sort(key=lambda r: -r['mean'])
gap = res['RL (Dueling DDQN)'] - res['Improved Re-rank']
glo, ghi = boot_ci(gap)
paired = dict(mean=round(float(gap.mean()), 2), lo=round(glo, 2), hi=round(ghi, 2), win=round(float((gap > 0).mean()), 2),
              rl=round(float(res['RL (Dueling DDQN)'].mean()), 2), rr=round(float(res['Improved Re-rank'].mean()), 2))
gg = res['RL (Dueling DDQN)'] - res['Greedy MC']
glo2, ghi2 = boot_ci(gg)
paired_g = dict(mean=round(float(gg.mean()), 2), lo=round(glo2, 2), hi=round(ghi2, 2), win=round(float((gg > 0).mean()), 2))
log(f'paired RL-RR {paired} ; RL-Greedy {paired_g}')

# ---- episódios para o visualizador: 6 inícios de teste + 4 dias das enchentes ----
show = [int(t) for t in test_starts[::10]]
for dstr in ('2024-05-02', '2024-05-05', '2024-05-10', '2024-05-15'):
    show.append(int(np.where(env.days == dstr)[0][0]))
episodes = []
for t0 in show:
    item = dict(t0=t0, day=str(env.days[t0]), split=str(env.split[t0]), methods={})
    for name, pol in POL.items():
        ep = run_policy(env, pol, t0)
        item['methods'][name] = dict(seeds=ep.chosen, rewards=[round(r, 2) for r in ep.rewards],
                                     act=[[round(float(v), 2) for v in s] for s in ep.steps])
        # lista curta do primeiro passo (para mostrar onde o agente escolhe)
    e0 = Episode(env, t0, R=10)
    item['shortlist0'] = [int(c) for c in env.shortlist(t0, [], e0.actp)]
    episodes.append(item)
    log(f'show {item["day"]}')

out = dict(table=table, paired=paired, paired_greedy=paired_g, lambdas=best, val=val_seeds, selected=dict(seed=sbest, ep=ebest),
           test_days=[str(env.days[t]) for t in test_starts], per_start={k: [round(float(v), 2) for v in x] for k, x in res.items()},
           episodes=episodes, split_dates={s: [str(env.days[idx(s)[0]]), str(env.days[idx(s)[-1]])] for s in ('train', 'val', 'test')})
json.dump(out, open('results/results.json', 'w'), ensure_ascii=False)
log('done')
