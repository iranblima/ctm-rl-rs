// Cenário C — monitor do treino: node monitor.js [porta]   →   abra http://localhost:8767 no navegador
// Lê os registros de results/ a cada poucos segundos e desenha as curvas. Também oferece o botão
// "Voltar ao treino de referência" (o mesmo que node reset.js). Sem dependências externas.
process.chdir(__dirname);
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { reset, running } = require('./reset.js');
const MODE = 'total';
const PORT = +(process.argv.find(a => /^\d+$/.test(a)) || 8767);
const RD = `results/${MODE}`, BD = `baseline/${MODE}`; fs.mkdirSync(RD, { recursive: true });

const readJSON = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const readLog = f => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (e) { return []; } };
const valOf = f => (readJSON(f, []) || []).map(c => ({ ep: c.ep, kpi: c.kpi, vh: c.vh }));

function status() {
  const seeds = new Set();
  for (const f of fs.readdirSync(RD)) { const m = f.match(/^(?:ckpt_|train_log_|\.training_)(\d+)/); if (m) seeds.add(+m[1]); }
  const busy = new Set(running());
  const out = [...seeds].sort((a, b) => a - b).map(s => {
    const lockF = `${RD}/.training_${s}.lock`; let lock = null;
    if (fs.existsSync(lockF)) { const [pid, since, total] = fs.readFileSync(lockF, 'utf8').split('\n'); if (busy.has(+pid)) lock = { pid: +pid, since, total: +total }; }
    return { seed: s, running: !!lock, lock, log: readLog(`${RD}/train_log_${s}.jsonl`), val: valOf(`${RD}/ckpt_${s}.json`) };
  });
  const base = [];
  for (const f of fs.existsSync(`${BD}`) ? fs.readdirSync(`${BD}`) : []) { const m = f.match(/^ckpt_(\d+)\.json$/); if (m) base.push({ seed: +m[1], val: valOf(`${BD}/${f}`) }); }
  const sel = readJSON(`${RD}/selected.json`), bsel = readJSON(`${BD}/selected.json`);
  return { now: new Date().toISOString(), seeds: out, baseline: base, ref: readJSON('results/valref.json'),
    selected: sel ? { seed: sel.seed, ep: sel.ep } : null, baselineSelected: bsel ? { seed: bsel.seed, ep: bsel.ep } : null,
    manifest: readJSON('baseline/MANIFEST.json'), mode: MODE };
}

http.createServer((req, res) => {
  const send = (code, type, body) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); };
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) return send(200, 'text/html; charset=utf-8', fs.readFileSync('monitor.html'));
  if (req.method === 'GET' && req.url === '/api/status') return send(200, 'application/json', JSON.stringify(status()));
  if (req.method === 'POST' && req.url === '/api/reset') { const r = reset(MODE); return send(r.ok ? 200 : 409, 'application/json', JSON.stringify(r)); }
  send(404, 'text/plain', 'não encontrado');
}).listen(PORT, '127.0.0.1', () => console.log(`[${MODE}] Monitor do treino em http://localhost:${PORT}  (Ctrl+C para fechar)`));
