import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
import sys
src = open('template_enchentes.html').read()
s = src


def R(a, b):
    global s
    assert a in s, 'NOT FOUND: ' + a[:80]
    s = s.replace(a, b, 1)


# ---------- CSS extra ----------
R("footer{margin-top:22px;", """.item2{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;padding:8px 2px;border-bottom:1px solid var(--line)}
.item2 .br{font-family:var(--font-display);font-weight:700;font-size:15px;grid-row:span 3;align-self:start;min-width:64px;cursor:pointer}
.item2 .a{font-size:14px}
.item2 .b{font-size:12px;color:var(--muted);font-family:var(--font-data)}
.item2 .c{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px}
.item2 .btn{padding:4px 10px;font-size:13px}
.chip{display:inline-block;font-size:11.5px;font-weight:600;padding:1px 7px;border-radius:999px;margin-left:4px;vertical-align:1px;white-space:nowrap}
.chip.agua{background:color-mix(in srgb,var(--flood) 18%,transparent);color:var(--flood)}
.chip.barr{background:color-mix(in srgb,var(--slow) 22%,transparent);color:color-mix(in srgb,var(--slow) 60%,var(--fg))}
.chip.estr{background:color-mix(in srgb,var(--jam) 16%,transparent);color:var(--jam)}
.chip.nd{background:color-mix(in srgb,var(--muted) 16%,transparent);color:var(--muted)}
.working{color:color-mix(in srgb,var(--slow) 55%,var(--fg));font-weight:600}
.teams{display:grid;gap:4px;font-size:13px}
.teams div{display:flex;justify-content:space-between;gap:8px;border-bottom:1px dashed var(--line);padding:3px 0}
.teams div:last-child{border-bottom:0}
.teams span:last-child{color:var(--muted);text-align:right}
.msg{font-size:13px;color:var(--jam);min-height:1em;margin:0}
.cmp{width:100%;border-collapse:collapse;font-size:13px}
.cmp th,.cmp td{padding:6px 4px;border-bottom:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums}
.cmp th:first-child,.cmp td:first-child{text-align:left}
.cmp th{font-weight:600;color:var(--muted);font-size:12px}
.cmp tr.best td{font-weight:700}
.cmpwrap{overflow-x:auto}
.assump{font-size:12.5px;color:var(--muted);margin:0;display:grid;gap:3px}
footer{margin-top:22px;""")

# ---------- cabeçalho ----------
R("<title>Malha Federal do RS nas Enchentes de 2024</title>", "<title>Liberação de Trechos RS 2024</title>")
R('<div class="eyebrow">Dados reais · SNV 2023, PNCT e interdições da PRF · abril a junho de 2024</div>',
  '<div class="eyebrow">Problema de decisão · dados reais das enchentes de 2024 no Rio Grande do Sul</div>')
R('<h1>Malha Federal do RS nas Enchentes de 2024</h1>', '<h1>Liberação de Trechos RS 2024</h1>')
R('<p class="lead">Replay das 88 interdições totais registradas nas rodovias federais gaúchas durante as chuvas de 2024, sobre a malha real com número de faixas e volume diário de cada trecho. As interdições entram e saem na data e hora em que ocorreram. Você também pode interditar trechos à mão e comparar o fluxo simulado com o que os postos de contagem registraram.</p>',
  '<p class="lead">As 88 interdições reais das enchentes de 2024 começam na data e hora em que aconteceram. A diferença: agora você dispõe de equipes extras de liberação. Cada equipe só trabalha em uma interdição por vez, e a pergunta é <b>em que ordem liberar</b>. Escolha à mão ou deixe uma estratégia decidir, e compare o resultado com o que aconteceu de fato.</p>')
R('<div class="hint">Clique na barra para ir a outra data · em vermelho: interdições ativas</div>',
  '<div class="hint">Clique na barra para ir a outra data · barras: interdições ativas na realidade · linha: com a estratégia escolhida</div>')
R('<span><i class="mk" style="background:var(--stop)"></i>Interdição real ativa</span>\n        <span><i class="mk" style="background:var(--slow)"></i>Interdição manual</span>',
  '<span><i class="mk" style="background:var(--stop)"></i>Interdição ativa</span>\n        <span><i class="mk" style="background:var(--slow)"></i>Equipe trabalhando</span>')

# ---------- painel lateral ----------
start = s.index('    <aside>')
end = s.index('    </aside>') + len('    </aside>')
aside = '''    <aside>
      <div class="card">
        <h2>Situação agora</h2>
        <div class="metrics">
          <div class="metric"><span class="k">Interdições ativas</span><span class="v" id="mInt">0</span></div>
          <div class="metric"><span class="k">Horas de interdição desde 29/04</span><span class="v" id="mHrs">0 h</span></div>
          <div class="metric"><span class="k">Horas de interdição evitadas</span><span class="v" id="mSaved">0 h</span></div>
          <div class="metric"><span class="k">Viagens interrompidas ou canceladas</span><span class="v" id="mCan">0</span></div>
          <div class="metric"><span class="k">Viagens desviadas</span><span class="v" id="mDiv">0</span></div>
          <div class="metric"><span class="k">Tempo perdido somado</span><span class="v" id="mDelay">0 h</span></div>
          <div class="metric"><span class="k">Extensão congestionada agora</span><span class="v" id="mCong">0 km</span></div>
        </div>
      </div>

      <div class="card">
        <h2>Equipes de liberação</h2>
        <label class="field" for="policy">Quem decide a ordem
          <select id="policy">
            <option value="none">Ninguém: como foi na realidade</option>
            <option value="manual">Eu escolho (clique numa interdição)</option>
            <option value="volume" selected>Guloso: maior volume primeiro</option>
            <option value="rapida">Mais rápida de liberar primeiro</option>
            <option value="ganho">Maior ganho por hora de equipe</option>
            <option value="corredor">Corredor: pensa à frente</option>
          </select>
        </label>
        <label class="field" for="nteams">Número de equipes extras
          <select id="nteams">
            <option value="1">1</option><option value="2">2</option><option value="3" selected>3</option><option value="5">5</option><option value="8">8</option>
          </select>
        </label>
        <p class="small" id="polDesc"></p>
        <div class="teams" id="teams"></div>
        <p class="msg" id="teamMsg" aria-live="polite"></p>
        <div class="assump">
          <span><b>Suposições de trabalho:</b></span>
          <span><span class="chip barr">Queda de barreira</span> uma equipe libera em 12 h</span>
          <span><span class="chip estr">Dano estrutural</span> a equipe corta pela metade o tempo que faltava (mínimo 6 h)</span>
          <span><span class="chip nd">Causa não informada</span> uma equipe libera em 24 h</span>
          <span><span class="chip agua">Água na pista</span> não adianta enviar equipe: é preciso esperar baixar</span>
        </div>
      </div>

      <div class="card">
        <h2>Comparar estratégias</h2>
        <p class="small">Roda o período de 29/04 a 31/05 com cada estratégia e o mesmo número de equipes. Leva de um a dois minutos.</p>
        <button type="button" class="btn" id="cmpBtn">Comparar agora</button>
        <div class="cmpwrap" id="cmpOut"></div>
      </div>

      <div class="card">
        <h2>Simulação</h2>
        <div class="row">
          <button type="button" class="btn primary" id="play">Pausar</button>
          <button type="button" class="btn" id="restart">Voltar a 29/04</button>
        </div>
        <label class="field" for="speed">Velocidade
          <select id="speed">
            <option value="60">1 hora por segundo</option>
            <option value="360" selected>6 horas por segundo</option>
            <option value="1440">1 dia por segundo</option>
            <option value="4320">3 dias por segundo</option>
          </select>
        </label>
        <label class="field" for="demand">Demanda de tráfego
          <select id="demand">
            <option value="real" selected>Real de 2024 (ajustada pelos postos)</option>
            <option value="normal">Normal (perfil típico de 2023)</option>
          </select>
        </label>
        <div class="field">Quando um trecho está interditado, os motoristas
          <div class="seg two" role="group" aria-label="Comportamento dos motoristas">
            <button type="button" id="rrOn" aria-pressed="true">desviam no entroncamento</button>
            <button type="button" id="rrOff" aria-pressed="false">seguem e formam fila</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 id="listTitle">Interdições ativas</h2>
        <div class="list" id="list"></div>
      </div>
    </aside>'''
s = s[:start] + aside + s[end:]

R('<p><b>Modelo:</b>', '''<p><b>Equipes e estratégias:</b> as interdições começam na hora real e, sem equipe, terminam na hora real. Uma equipe enviada antecipa o fim conforme o tipo da interdição, classificado pelo texto do registro da PRF (suposições ao lado). Cada equipe trabalha em uma interdição por vez e fica livre quando ela termina; o deslocamento entre locais não é considerado. As estratégias automáticas decidem a cada 10 minutos. "Guloso" escolhe o trecho de maior volume diário. "Mais rápida" escolhe o menor tempo de trabalho. "Maior ganho por hora de equipe" divide o volume vezes as horas antecipadas pelo tempo de trabalho. "Corredor" agrupa as interdições que ficam no mesmo corredor, isto é, entre os mesmos dois entroncamentos, porque basta uma delas para bloquear a passagem. Só envia equipe quando liberar o grupo reabre o corredor antes do previsto, e não gasta equipe num ponto que continuaria bloqueado por outro ao lado (por exemplo, água na pista).</p>
    <p><b>Modelo:</b>''')

# ---------- JS ----------
R("""  const byStart = [...INTS].sort((p, q) => p.s - q.s), byEnd = [...INTS].sort((p, q) => p.f - q.f);""",
  """  // tipo de cada interdição, pelo texto do registro
  function classify(txt) {
    const t = (txt || '').toLowerCase();
    if (/água|agua|aguá|cheia|nível do rio|nivel do rio|alag|inund/.test(t)) return 'agua';
    if (/cedeu|ruindo|rompimento|galeria|reparo|cratera|erosão|erosao/.test(t)) return 'estr';
    if (/barreira|desliz|encosta/.test(t)) return 'barr';
    return 'nd';
  }
  const CLSN = { agua: 'Água na pista', estr: 'Dano estrutural', barr: 'Queda de barreira', nd: 'Causa não informada' };
  // corredor = sequência de trechos entre dois entroncamentos (une trechos ligados por nós de grau 2)
  const deg = new Int16Array(D.nodes.length);
  for (const e of D.edges) { deg[e.a]++; deg[e.b]++; }
  const parent = D.edges.map((_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const byNode = D.nodes.map(() => []);
  D.edges.forEach((e, i) => { byNode[e.a].push(i); byNode[e.b].push(i); });
  byNode.forEach((arr, n) => { if (deg[n] === 2 && arr.length === 2) parent[find(arr[0])] = find(arr[1]); });
  INTS.forEach(it => { it.cls = classify(it.txt); it.vdm = D.edges[it.e].vdm; it.fEff = it.f; it.team = -1; it.grp = find(it.e); });
  function workTime(it, t) {
    const rem = it.f - t;
    if (it.cls === 'agua') return Infinity;
    if (it.cls === 'barr') return 720;
    if (it.cls === 'estr') return Math.max(360, 0.5 * rem);
    return 1440;
  }
  const CEND = 34 * 1440; // 31/05 00:00
  function realHrs(t) { let h = 0; for (const it of INTS) h += Math.max(0, Math.min(it.f, t) - Math.max(it.s, START)); return h / 60; }""")

R("""    t: WARM, playing: true, rate: 360, acc: 0, tool: 'total', reroute: true, realOn: true, demand: 'real',
    cong: 0, queue: 0, delay: 0, div: 0, can: 0, ps: 0, pe: 0, manual: [], selSt: null, busy: false,""",
  """    t: WARM, playing: true, rate: 360, acc: 0, reroute: true, demand: 'real', policy: 'volume', K: 3, teams: [-1, -1, -1],
    cong: 0, queue: 0, delay: 0, div: 0, can: 0, hrs: 0, nAct: 0, actH: new Int16Array(D.nh).fill(-1), selSt: null, busy: false,""")

R("""    if (S.realOn && k.auto[i] > 0) return 0;
    return k.man[i];""", """    return k.auto[i] > 0 ? 0 : 1;""")

start = s.index("  function applyEvents() {")
end = s.index("  function demandFactor(m) {")
s = s[:start] + """  function applyEvents(rec) {
    let n = 0;
    for (const it of INTS) {
      const act = it.s <= S.t && S.t < it.fEff;
      if (act !== it.active) {
        it.active = act;
        for (const [k, c] of it.cells) { k.auto[c] += act ? 1 : -1; refreshClosed(k); }
        if (!act && it.team >= 0) { S.teams[it.team] = -1; it.team = -1; }
      }
      if (act) n++;
    }
    S.nAct = n;
    if (rec) S.hrs += n / 60;
    if (S.policy !== 'none' && S.policy !== 'manual' && S.t % 10 === 0) autoAssign();
  }
  function assign(it, ti) {
    const w = workTime(it, S.t);
    if (!isFinite(w)) return false;
    it.fEff = Math.min(it.f, S.t + Math.round(w)); it.team = ti; S.teams[ti] = it.idx;
    return true;
  }
  const worth = (it, t) => it.active && it.team < 0 && it.cls !== 'agua' && workTime(it, t) < it.f - t;
  function argmax(arr, fn) { let b = null, bv = -Infinity; for (const x of arr) { const v = fn(x); if (v > bv) { bv = v; b = x; } } return b; }
  function pick() {
    const t = S.t, C = INTS.filter(it => worth(it, t));
    if (!C.length) return null;
    if (S.policy === 'volume') return argmax(C, it => it.vdm);
    if (S.policy === 'rapida') return argmax(C, it => -workTime(it, t));
    if (S.policy === 'ganho') return argmax(C, it => { const w = workTime(it, t); return it.vdm * (it.f - t - w) / w; });
    // corredor: avalia o grupo inteiro (mesma rodovia, até 25 km)
    const groups = new Map();
    for (const it of INTS) if (it.active) { if (!groups.has(it.grp)) groups.set(it.grp, []); groups.get(it.grp).push(it); }
    let best = null, bs = 0;
    for (const mem of groups.values()) {
      const U = mem.filter(m => C.includes(m)); if (!U.length) continue;
      const natural = Math.max(...mem.map(m => m.fEff - t));
      const fixed = Math.max(0, ...mem.filter(m => !C.includes(m)).map(m => m.fEff - t));
      const sumW = U.reduce((a, m) => a + workTime(m, t), 0);
      const open = Math.max(fixed, ...U.map(m => workTime(m, t)));
      const vdm = Math.max(...mem.map(m => m.vdm));
      const sc = vdm * Math.max(0, natural - open) / sumW;
      if (sc > bs) { bs = sc; best = argmax(U, m => workTime(m, t)); }
    }
    return best;
  }
  function autoAssign() {
    for (let ti = 0; ti < S.teams.length; ti++) {
      if (S.teams[ti] >= 0) continue;
      const it = pick(); if (!it) break;
      assign(it, ti);
    }
  }
  function manualSend(it) {
    const msg = el('teamMsg');
    if (S.policy !== 'manual') { msg.textContent = 'Escolha "Eu escolho" em "Quem decide a ordem" para enviar equipes à mão.'; return; }
    if (!it.active) return;
    if (it.team >= 0) { msg.textContent = 'Já há uma equipe nessa interdição.'; return; }
    if (it.cls === 'agua') { msg.textContent = 'Água na pista: a equipe não consegue acelerar, é preciso esperar baixar.'; return; }
    const ti = S.teams.indexOf(-1);
    if (ti < 0) { msg.textContent = 'Todas as equipes estão ocupadas.'; return; }
    if (workTime(it, S.t) >= it.f - S.t) { msg.textContent = 'Essa interdição termina antes de a equipe concluir o trabalho.'; }
    else msg.textContent = '';
    assign(it, ti);
  }

""" + s[end:]

R("""  function step(rec) {
    applyEvents();""", """  function step(rec) {
    applyEvents(rec);""")
R("""    if (S.t % 60 === 0) {
      const h = S.t / 60 - 1;""", """    if (S.t % 60 === 0) {
      const h = S.t / 60 - 1;
      if (h >= 0 && h < D.nh && S.t >= START) S.actH[h] = S.nAct;""")
R("""    for (const it of INTS) it.active = false;
    S.t = WARM; S.ps = 0; S.pe = 0; S.delay = 0; S.div = 0; S.can = 0; S.stAcc.fill(0);""",
  """    for (const it of INTS) { it.active = false; it.fEff = it.f; it.team = -1; }
    S.teams = new Array(S.K).fill(-1);
    S.t = WARM; S.delay = 0; S.div = 0; S.can = 0; S.hrs = 0; S.actH.fill(-1); S.stAcc.fill(0);""")

# desenho
R("""    // interdições manuais
    for (const mk of S.manual) {
      const k = mk.k; const A = P[k.from], B = P[k.to]; const t = (mk.i + 0.5) / k.nc;
      marker(sx(A[0] + (B[0] - A[0]) * t), sy(A[1] + (B[1] - A[1]) * t), mk.v === 0 ? T.stop : T.slow, z, mk.v === 0);
    }
    // interdições reais ativas
    if (S.realOn) for (const it of INTS) if (it.active) marker(sx(it.x), sy(it.y), T.stop, z, true);""",
  """    // interdições ativas (âmbar = equipe trabalhando)
    for (const it of INTS) if (it.active && it.team < 0) marker(sx(it.x), sy(it.y), T.stop, z, true);
    for (const it of INTS) if (it.active && it.team >= 0) {
      marker(sx(it.x), sy(it.y), T.slow, z, true);
      ctx.fillStyle = T.fg; ctx.font = `700 ${Math.round(10 * Math.min(1.25, Math.max(0.9, z)))}px IBM Plex Mono, monospace`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('E' + (it.team + 1), sx(it.x) + 8, sy(it.y) - 8);
    }""")

# linha do tempo: linha do cenário
R("""    g.globalAlpha = 1;
    g.strokeStyle = T.line; g.beginPath(); g.moveTo(6, base + .5);""",
  """    g.globalAlpha = 1;
    g.strokeStyle = T.fg; g.lineWidth = 1.6; g.beginPath(); let on = false;
    for (let i = START / 60; i < END / 60; i++) {
      const v = S.actH[i]; if (v < 0) { on = false; continue; }
      const x = X(i * 60 + 30), y = base - v / mx * (base - 16);
      on ? g.lineTo(x, y) : g.moveTo(x, y); on = true;
    }
    g.stroke(); g.lineWidth = 1;
    g.strokeStyle = T.line; g.beginPath(); g.moveTo(6, base + .5);""")

# painel
start = s.index("  function updatePanel() {")
end = s.index("  // ---------- interação no mapa ----------")
s = s[:start] + """  const PDESC = {
    none: 'Sem equipes extras: as interdições terminam na hora em que terminaram de fato.',
    manual: 'Clique numa interdição no mapa ou em "Enviar equipe" na lista. Pause a simulação para decidir com calma.',
    volume: 'Envia cada equipe livre ao trecho interditado de maior volume diário. Olha só o agora.',
    rapida: 'Envia cada equipe à interdição que ela libera mais depressa.',
    ganho: 'Pesa volume, horas antecipadas e tempo de trabalho. Ainda olha uma interdição por vez.',
    corredor: 'Olha o corredor inteiro entre dois entroncamentos: só gasta equipe se liberar todas as interdições dele reabre a passagem antes do previsto.',
  };
  const PNAME = { none: 'Como foi (sem equipes)', manual: 'Manual', volume: 'Guloso: maior volume', rapida: 'Mais rápida primeiro', ganho: 'Maior ganho por hora', corredor: 'Corredor: pensa à frente' };
  function updatePanel() {
    const d = dateOf(S.t);
    el('now').innerHTML = fmtDate(S.t) + '<small>' + DOWN[d.getDay()] + ' · ' + d.getFullYear() + '</small>';
    const act = INTS.filter(i => i.active);
    const realAct = INTS.filter(i => i.s <= S.t && S.t < i.f).length;
    el('mInt').textContent = act.length + ' (real: ' + realAct + ')';
    const rh = realHrs(S.t);
    el('mHrs').textContent = nf0.format(S.hrs) + ' h (real: ' + nf0.format(rh) + ')';
    el('mSaved').textContent = nf0.format(Math.max(0, rh - S.hrs)) + ' h';
    el('mCong').textContent = nf0.format(S.cong) + ' km';
    el('mDiv').textContent = fmtBig(S.div);
    el('mCan').textContent = fmtBig(S.can);
    el('mDelay').textContent = fmtBig(S.delay) + ' h';
    el('polDesc').textContent = PDESC[S.policy];
    el('teams').innerHTML = S.policy === 'none' ? '' : S.teams.map((x, i) => {
      if (x < 0) return `<div><span>Equipe ${i + 1}</span><span>livre</span></div>`;
      const it = INTS[x];
      return `<div><span class="working">Equipe ${i + 1}</span><span>BR-${it.br} km ${it.km} · libera ${fmtDate(it.fEff)}</span></div>`;
    }).join('');
    const list = el('list');
    el('listTitle').textContent = 'Interdições ativas (' + act.length + ')';
    const key = act.map(i => i.idx + ':' + i.team).join(',') + '|' + Math.floor(S.t / 60) + '|' + S.policy;
    if (list.dataset.key === key) return;
    list.dataset.key = key;
    if (!act.length) { list.innerHTML = '<p class="empty">Nenhuma interdição ativa neste momento.</p>'; return; }
    act.sort((a, b) => b.vdm - a.vdm);
    list.innerHTML = act.map(i => {
      const team = i.team >= 0 ? `<span class="working">Equipe ${i.team + 1} trabalhando · libera ${fmtDate(i.fEff)}</span>`
        : (S.policy === 'manual' && i.cls !== 'agua' ? `<button type="button" class="btn" data-send="${i.idx}">Enviar equipe</button>` : '');
      return `<div class="item2"><span class="br" data-int="${i.idx}">BR-${i.br}</span>
        <span class="a">km ${nf1.format(i.km).replace(',0', '')} · ${i.mun}<span class="chip ${i.cls}">${CLSN[i.cls]}</span></span>
        <span class="b">volume ${nf0.format(i.vdm)}/dia · fim real ${fmtDate(i.f)} (faltam ${fmtDur(Math.max(0, i.f - S.t))})</span>
        <span class="c">${team}</span></div>`;
    }).join('');
  }
  el('list').addEventListener('click', ev => {
    const s1 = ev.target.closest('[data-send]');
    if (s1) { manualSend(INTS[+s1.dataset.send]); el('list').dataset.key = ''; return; }
    const b = ev.target.closest('[data-int]'); if (!b) return;
    const it = INTS[+b.dataset.int];
    V.cx = it.x; V.cy = it.y; V.s = Math.max(V.s, 900);
  });

""" + s[end:]

R("    if (S.realOn) for (const it of INTS) if (it.active && Math.hypot(sx(it.x) - X, sy(it.y) - Y) < 9) return { type: 'int', it };",
  "    for (const it of INTS) if (it.active && Math.hypot(sx(it.x) - X, sy(it.y) - Y) < 9) return { type: 'int', it };")
R("""        <div class="m">${fmtDate(it.s)} → ${fmtDate(it.f)} (${fmtDur(it.f - it.s)})</div>""",
  """        <div><span class="chip ${it.cls}" style="margin-left:0">${CLSN[it.cls]}</span> · volume ${nf0.format(it.vdm)}/dia</div>
        <div class="m">Real: ${fmtDate(it.s)} → ${fmtDate(it.f)} (${fmtDur(it.f - it.s)})</div>
        ${it.team >= 0 ? `<div class="working">Equipe ${it.team + 1} trabalhando · libera ${fmtDate(it.fEff)}</div>` : (S.policy === 'manual' && it.cls !== 'agua' ? '<div><b>Clique para enviar uma equipe.</b></div>' : '')}""")
R("""    if (h.type === 'link') applyTool(h.k, h.i);""", """    if (h.type === 'int') { manualSend(h.it); el('list').dataset.key = ''; }""")

start = s.index("  function applyTool(k, i) {")
end = s.index("  function setRR(v) {")
s = s[:start] + """  el('policy').addEventListener('change', e => {
    S.policy = e.target.value; el('teamMsg').textContent = '';
    if (S.policy === 'none') { for (const it of INTS) if (it.team >= 0) { it.team = -1; it.fEff = it.f; } S.teams.fill(-1); }
    if (S.policy === 'manual') setPlaying(false);
  });
  el('nteams').addEventListener('change', e => {
    const K = +e.target.value; S.K = K;
    while (S.teams.length < K) S.teams.push(-1);
    while (S.teams.length > K) { const x = S.teams.pop(); if (x >= 0) { INTS[x].team = -1; INTS[x].fEff = INTS[x].f; } }
  });
  el('cmpBtn').addEventListener('click', async () => {
    if (S.busy) return;
    setPlaying(false); S.busy = true; el('busy').hidden = false;
    const keep = S.policy, res = [];
    for (const p of ['none', 'volume', 'rapida', 'ganho', 'corredor']) {
      S.policy = p; resetState();
      await new Promise(done => {
        const chunk = () => {
          const stop = performance.now() + 40;
          while (S.t < CEND && performance.now() < stop) step(S.t >= START);
          el('busy').textContent = 'Comparando · ' + PNAME[p] + ' · ' + fmtDate(S.t);
          if (S.t < CEND) requestAnimationFrame(chunk); else done();
        };
        requestAnimationFrame(chunk);
      });
      res.push({ p, hrs: S.hrs, can: S.can, div: S.div, delay: S.delay });
    }
    const base = res[0];
    const bestCan = Math.min(...res.map(r => r.can));
    el('cmpOut').innerHTML = `<table class="cmp"><thead><tr><th>Estratégia (${S.K} equipe${S.K > 1 ? 's' : ''})</th><th>Horas de interdição</th><th>Viagens interrompidas</th><th>vs. como foi</th></tr></thead><tbody>` +
      res.map(r => `<tr class="${r.can === bestCan ? 'best' : ''}"><td>${PNAME[r.p]}</td><td>${nf0.format(r.hrs)}</td><td>${fmtBig(r.can)}</td><td>${r === base ? '—' : (r.can <= base.can ? '−' : '+') + nf1.format(Math.abs(100 * (1 - r.can / base.can))) + '%'}</td></tr>`).join('') +
      `</tbody></table><p class="small" style="margin-top:6px">Período de 29/04 a 31/05. Em negrito, a estratégia com menos viagens interrompidas.</p>`;
    S.policy = keep; el('policy').value = keep;
    resetState(); S.busy = false; el('busy').hidden = true; el('busy').textContent = 'Calculando…';
    runTo(START + 60, () => {});
  });
""" + s[end:]

R("""  el('realOn').addEventListener('change', e => { S.realOn = e.target.checked; for (const k of links) refreshClosed(k); });\n""", "")
R("""  // abre em 03/05 18:00, com a crise em curso, e com o posto da BR-386 em Montenegro selecionado""",
  """  // abre em 02/05 12:00, com a crise em curso, equipes trabalhando e o posto da BR-386 em Montenegro selecionado""")
R("""  runTo(6 * 1440 + 18 * 60, () => {});""", """  runTo(5 * 1440 + 12 * 60, () => {});""")

cmp_start = s.index('      <div class="card">\n        <h2>Comparar estratégias</h2>')
cmp_end = s.index('      <div class="card">\n        <h2>Simulação</h2>')
card = s[cmp_start:cmp_end]
s = s[:cmp_start] + s[cmp_end:]
anchor = '      <div class="card">\n        <h2 id="stTitle">'
s = s.replace(anchor, card + anchor, 1)
s = s.replace('.teams span:last-child{', '.teams span:first-child{white-space:nowrap}\n.teams span:last-child{', 1)
open('template_liberacao_v1.html', 'w').write(s)
print('ok', len(s))
