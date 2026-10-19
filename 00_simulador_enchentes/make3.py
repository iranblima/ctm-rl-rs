import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
s = open('template_liberacao_v1.html').read()


def R(a, b):
    global s
    assert a in s, 'NOT FOUND: ' + a[:90]
    s = s.replace(a, b, 1)


# opções do seletor
R('''            <option value="volume" selected>Guloso: maior volume primeiro</option>
            <option value="rapida">Mais rápida de liberar primeiro</option>
            <option value="ganho">Maior ganho por hora de equipe</option>
            <option value="corredor">Corredor: pensa à frente</option>''',
  '''            <optgroup label="Referências do artigo, adaptadas">
              <option value="random">Aleatória</option>
              <option value="central">Centralidade: trecho mais "ponte" primeiro</option>
              <option value="gmc">Guloso com simulação (como o Greedy MC)</option>
            </optgroup>
            <optgroup label="Regras simples">
              <option value="volume" selected>Maior volume primeiro</option>
              <option value="rapida">Mais rápida de liberar primeiro</option>
              <option value="ganho">Maior ganho por hora de equipe</option>
              <option value="corredor">Corredor: pensa à frente</option>
            </optgroup>''')

R('Roda o período de 29/04 a 31/05 com cada estratégia e o mesmo número de equipes. Leva de um a dois minutos.',
  'Roda o período de 29/04 a 31/05 com cada estratégia e o mesmo número de equipes. Leva cerca de três minutos.')

# rodapé
R('As estratégias automáticas decidem a cada 10 minutos. "Guloso" escolhe o trecho de maior volume diário.',
  'As estratégias automáticas decidem a cada 10 minutos. Três delas adaptam referências do artigo da Andina: "Aleatória" (sorteio com semente fixa, como o Random); "Centralidade" (a maior intermediação do trecho na malha, ponderada pela distância, como o Betweenness); e "Guloso com simulação", equivalente ao Greedy MC: entre os 8 candidatos de maior volume (uma lista curta, como no artigo), simula 1 hora à frente com cada interdição aberta, mede quantas viagens deixam de ser interrompidas e multiplica pelas horas que a equipe anteciparia. Como o simulador não tem sorteio, uma simulação por candidato basta. "Maior volume primeiro" escolhe o trecho de maior volume diário, sem simular.')

# ---------- JS ----------
R("""  const CEND = 34 * 1440; // 31/05 00:00""", """  const CEND = 34 * 1440; // 31/05 00:00
  // intermediação dos trechos (Brandes, distâncias em km)
  const EB = (() => {
    const n = D.nodes.length, adj = D.nodes.map(() => []);
    D.edges.forEach((e, i) => { adj[e.a].push([e.b, i, Math.max(0.1, e.km)]); adj[e.b].push([e.a, i, Math.max(0.1, e.km)]); });
    const eb = new Float64Array(D.edges.length);
    for (let s0 = 0; s0 < n; s0++) {
      if (!adj[s0].length) continue;
      const dist = new Float64Array(n).fill(Infinity), sigma = new Float64Array(n), delta = new Float64Array(n), done = new Uint8Array(n);
      const pred = Array.from({ length: n }, () => []), order = [];
      dist[s0] = 0; sigma[s0] = 1;
      for (;;) {
        let u = -1, bd = Infinity;
        for (let i = 0; i < n; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; u = i; }
        if (u < 0) break;
        done[u] = 1; order.push(u);
        for (const [v, ei, w] of adj[u]) {
          if (done[v]) continue;
          const nd = dist[u] + w;
          if (nd < dist[v] - 1e-9) { dist[v] = nd; sigma[v] = sigma[u]; pred[v] = [[u, ei]]; }
          else if (Math.abs(nd - dist[v]) < 1e-9) { sigma[v] += sigma[u]; pred[v].push([u, ei]); }
        }
      }
      for (let k = order.length - 1; k >= 0; k--) {
        const w = order[k];
        for (const [u, ei] of pred[w]) { const c = sigma[u] / sigma[w] * (1 + delta[w]); eb[ei] += c; delta[u] += c; }
      }
    }
    return eb;
  })();
  INTS.forEach(it => { it.bt = EB[it.e]; });
  // sorteio reprodutível
  let rngState = 1;
  const rng = () => { rngState |= 0; rngState = rngState + 0x6D2B79F5 | 0; let t = Math.imul(rngState ^ rngState >>> 15, 1 | rngState); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };""")

R("""    if (S.policy === 'volume') return argmax(C, it => it.vdm);""",
  """    if (S.policy === 'random') return C[Math.floor(rng() * C.length)];
    if (S.policy === 'central') return argmax(C, it => it.bt);
    if (S.policy === 'gmc') return pickGMC(C);
    if (S.policy === 'volume') return argmax(C, it => it.vdm);""")

R("""  function autoAssign() {""", """  // guloso com simulação: copia o estado, abre cada candidato por 1 h e mede o ganho
  function snapshot() {
    return {
      t: S.t, can: S.can, div: S.div, delay: S.delay, hrs: S.hrs, nAct: S.nAct, cong: S.cong, queue: S.queue, teams: S.teams.slice(),
      L: links.map(k => [k.n.slice(), k.q, k.auto.slice(), k.v.slice()]), I: INTS.map(it => [it.active, it.fEff, it.team]),
    };
  }
  function restore(sn) {
    Object.assign(S, { t: sn.t, can: sn.can, div: sn.div, delay: sn.delay, hrs: sn.hrs, nAct: sn.nAct, cong: sn.cong, queue: sn.queue });
    S.teams = sn.teams.slice();
    links.forEach((k, i) => { const x = sn.L[i]; k.n.set(x[0]); k.q = x[1]; k.auto.set(x[2]); k.v.set(x[3]); refreshClosed(k); });
    INTS.forEach((it, i) => { const x = sn.I[i]; it.active = x[0]; it.fEff = x[1]; it.team = x[2]; });
  }
  function pickGMC(C) {
    const t = S.t, H = 60;
    const short = C.slice().sort((a, b) => b.vdm - a.vdm).slice(0, 8);
    const sn = snapshot(); S.rollout = true;
    const run = () => { const c0 = S.can; for (let i = 0; i < H; i++) step(true); return S.can - c0; };
    const base = run(); restore(sn);
    let best = null, bv = 0;
    for (const c of short) {
      c.fEff = t;
      const v = run(); restore(sn);
      const gain = (base - v) / H * (c.f - t - workTime(c, t));
      if (gain > bv) { bv = gain; best = c; }
    }
    S.rollout = false;
    return best || argmax(C, it => it.vdm);
  }
  function autoAssign() {""")

R("""    if (S.policy !== 'none' && S.policy !== 'manual' && S.t % 10 === 0) autoAssign();""",
  """    if (!S.rollout && S.policy !== 'none' && S.policy !== 'manual' && S.t % 10 === 0 && S.teams.includes(-1)) autoAssign();""")

R("""    if (rec) {
      S.delay += Math.max(0, delay) + wait * DT;
      for (const st of STATIONS) for (const [k, c] of st.cells) S.stAcc[st.i] += k.out[c];
    }""", """    if (rec) {
      S.delay += Math.max(0, delay) + wait * DT;
      if (!S.rollout) for (const st of STATIONS) for (const [k, c] of st.cells) S.stAcc[st.i] += k.out[c];
    }""")
R("""    if (S.t % 60 === 0) {""", """    if (S.t % 60 === 0 && !S.rollout) {""")
R("""    S.t = WARM; S.delay = 0;""", """    rngState = 1; S.rollout = false;
    S.t = WARM; S.delay = 0;""")

R("""    volume: 'Envia cada equipe livre ao trecho interditado de maior volume diário. Olha só o agora.',""",
  """    random: 'Sorteia a interdição. Serve de piso: qualquer estratégia razoável deve fazer melhor.',
    central: 'Escolhe o trecho de maior intermediação: aquele por onde passam mais caminhos mais curtos da malha.',
    gmc: 'Para os 8 candidatos de maior volume, simula 1 hora com o trecho aberto e escolhe o que mais reduz as viagens interrompidas, multiplicado pelas horas antecipadas. Mais lento.',
    volume: 'Envia cada equipe livre ao trecho interditado de maior volume diário. Olha só o agora, sem simular.',""")
R("""volume: 'Guloso: maior volume',""", """random: 'Aleatória', central: 'Centralidade', gmc: 'Guloso com simulação', volume: 'Maior volume primeiro',""")
R("""    for (const p of ['none', 'volume', 'rapida', 'ganho', 'corredor']) {""",
  """    for (const p of ['none', 'random', 'central', 'gmc', 'volume', 'rapida', 'ganho', 'corredor']) {""")
R("""      res.push({ p, hrs: S.hrs, can: S.can, div: S.div, delay: S.delay });""",
  """      res.push({ p, hrs: S.hrs, can: S.can, div: S.div, delay: S.delay, ref: ['random', 'central', 'gmc'].includes(p) });""")
R("""<td>${PNAME[r.p]}</td>""", """<td>${PNAME[r.p]}${r.ref ? ' <span class="chip nd">adaptada do artigo</span>' : ''}</td>""")

open('template_liberacao.html', 'w').write(s)
print('ok')
