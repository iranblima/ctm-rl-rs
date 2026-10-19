// Monitor do treino: node monitor.js [porta]   →   abra http://localhost:8765 no navegador
// Lê os registros de results/ a cada poucos segundos e desenha as curvas. Também oferece o botão
// "Voltar ao treino de referência" (o mesmo que node reset.js). Sem dependências externas.
process.chdir(__dirname);
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { reset, running } = require('./reset.js');
const PORT = +(process.argv[2] || 8765);

const readJSON = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const readLog = f => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (e) { return []; } };
const valOf = f => (readJSON(f, []) || []).map(c => ({ ep: c.ep, kpi: c.kpi, vh: c.vh }));

function status() {
  const seeds = new Set();
  for (const f of fs.readdirSync('results')) { const m = f.match(/^(?:ckpt_|train_log_|\.training_)(\d+)/); if (m) seeds.add(+m[1]); }
  const busy = new Set(running());
  const out = [...seeds].sort((a, b) => a - b).map(s => {
    const lockF = `results/.training_${s}.lock`; let lock = null;
    if (fs.existsSync(lockF)) { const [pid, since, total] = fs.readFileSync(lockF, 'utf8').split('\n'); if (busy.has(+pid)) lock = { pid: +pid, since, total: +total }; }
    return { seed: s, running: !!lock, lock, log: readLog(`results/train_log_${s}.jsonl`), val: valOf(`results/ckpt_${s}.json`) };
  });
  const base = [];
  for (const f of fs.existsSync('baseline/results') ? fs.readdirSync('baseline/results') : []) { const m = f.match(/^ckpt_(\d+)\.json$/); if (m) base.push({ seed: +m[1], val: valOf(`baseline/results/${f}`) }); }
  const sel = readJSON('results/selected.json'), bsel = readJSON('baseline/results/selected.json');
  return { now: new Date().toISOString(), seeds: out, baseline: base, ref: readJSON('results/valref.json'),
    selected: sel ? { seed: sel.seed, ep: sel.ep } : null, baselineSelected: bsel ? { seed: bsel.seed, ep: bsel.ep } : null,
    manifest: readJSON('baseline/MANIFEST.json') };
}

http.createServer((req, res) => {
  const send = (code, type, body) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); };
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) return send(200, 'text/html; charset=utf-8', fs.readFileSync('monitor.html'));
  if (req.method === 'GET' && req.url === '/api/status') return send(200, 'application/json', JSON.stringify(status()));
  if (req.method === 'POST' && req.url === '/api/reset') { const r = reset(); return send(r.ok ? 200 : 409, 'application/json', JSON.stringify(r)); }
  send(404, 'text/plain', 'não encontrado');
}).listen(PORT, '127.0.0.1', () => console.log(`Monitor do treino em http://localhost:${PORT}  (Ctrl+C para fechar)`));
