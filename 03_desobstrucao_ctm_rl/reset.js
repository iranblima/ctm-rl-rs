// Volta a etapa 03 ao treino de referência (o que gerou os resultados publicados).
//   node reset.js          pede confirmação
//   node reset.js --sim    sem confirmação
// Apaga checkpoints, registros, seleção e testes atuais e copia de volta os arquivos de baseline/.
// Recusa se houver treino rodando.
process.chdir(__dirname);
'use strict';
const fs = require('fs'), path = require('path');

function running() {
  const out = [];
  for (const f of fs.readdirSync('results').filter(f => /^\.training_\d+\.lock$/.test(f))) {
    const pid = +fs.readFileSync(path.join('results', f), 'utf8').split('\n')[0];
    try { process.kill(pid, 0); out.push(pid); } catch (e) { fs.unlinkSync(path.join('results', f)); }
  }
  return out;
}
function reset() {
  const busy = running();
  if (busy.length) return { ok: false, msg: `Há treino rodando (processo ${busy.join(', ')}). Interrompa antes de voltar ao estado de referência.` };
  if (!fs.existsSync('baseline/MANIFEST.json')) return { ok: false, msg: 'Pasta baseline/ não encontrada.' };
  const man = JSON.parse(fs.readFileSync('baseline/MANIFEST.json', 'utf8'));
  const removed = [];
  for (const f of fs.readdirSync('results')) {
    if (f === 'scan.json' || f === 'valref.json') continue;         // derivados dos dados, não do treino
    fs.unlinkSync(path.join('results', f)); removed.push(f);
  }
  for (const f of man.results) fs.copyFileSync(path.join('baseline', 'results', f), path.join('results', f));
  fs.copyFileSync(path.join('baseline', 'desobstrucao-rs.html'), path.join('..', 'paginas', 'desobstrucao-rs.html'));
  return { ok: true, msg: `Estado de referência restaurado (${man.label}). ${man.results.length} arquivos copiados de baseline/; ${removed.length} removidos de results/.` };
}
module.exports = { reset, running };

if (require.main === module) {
  const go = () => { const r = reset(); console.log(r.msg); process.exit(r.ok ? 0 : 1); };
  if (process.argv.includes('--sim')) go();
  else {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Isto apaga os checkpoints, registros e testes atuais da etapa 03 e volta ao treino de referência. Continuar? (s/N) ', a => { rl.close(); if (/^s/i.test(a.trim())) go(); else { console.log('Nada foi alterado.'); process.exit(0); } });
  }
}
