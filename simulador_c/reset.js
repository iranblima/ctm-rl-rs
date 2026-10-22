// Cenário C — volta ao treino de referência guardado em baseline/.
//   node reset.js [todos] [--sim]   (redes com todas as ações e só desobstruir, tabelas e página)
// Recusa se houver treino rodando nessa observação. Mantém results/valref.json.
process.chdir(__dirname);
'use strict';
const fs = require('fs'), path = require('path');
function running(mode) {
  const RD = `results/${mode}`, out = []; if (!fs.existsSync(RD)) return out;
  for (const f of fs.readdirSync(RD).filter(f => /^\.training_\d+\.lock$/.test(f))) {
    const pid = +fs.readFileSync(path.join(RD, f), 'utf8').split('\n')[0];
    try { process.kill(pid, 0); out.push(pid); } catch (e) { fs.unlinkSync(path.join(RD, f)); }
  }
  return out;
}
function reset(mode) {
  const modes = ['total', 'so_desob'].filter(m => fs.existsSync(`baseline/${m}`));
  const busy = modes.flatMap(running);
  if (busy.length) return { ok: false, msg: `Há treino rodando (processo ${busy.join(', ')}). Interrompa antes de voltar ao estado de referência.` };
  if (!fs.existsSync('baseline/MANIFEST.json')) return { ok: false, msg: 'Pasta baseline/ não encontrada.' };
  const man = JSON.parse(fs.readFileSync('baseline/MANIFEST.json', 'utf8')); let n = 0, rm = 0;
  for (const m of modes) {
    const RD = `results/${m}`, BD = `baseline/${m}`; fs.mkdirSync(RD, { recursive: true });
    for (const f of fs.readdirSync(RD)) { fs.unlinkSync(path.join(RD, f)); rm++; }
    for (const f of fs.readdirSync(BD)) { fs.copyFileSync(path.join(BD, f), path.join(RD, f)); n++; }
  }
  if (mode === 'todos') {
    for (const f of fs.readdirSync('results').filter(f => /^(test_\d+\.json|summary\.json|viz\.json)$/.test(f))) { fs.unlinkSync(path.join('results', f)); rm++; }
    for (const f of man.comuns) { fs.copyFileSync(path.join('baseline', f), path.join('results', f)); n++; }
    fs.copyFileSync(path.join('baseline', 'desobstrucao-rs-c.html'), path.join('..', 'paginas', 'desobstrucao-rs-c.html'));
  }
  return { ok: true, msg: `Estado de referência restaurado (${man.label}; ${mode}). ${n} arquivos copiados de baseline/; ${rm} removidos de results/.` };
}
module.exports = { reset, running: () => [...running('total'), ...running('so_desob')] };
if (require.main === module) {
  const mode = ['total', 'todos'].includes(process.argv[2]) ? process.argv[2] : 'todos';
  const go = () => { const r = reset(mode); console.log(r.msg); process.exit(r.ok ? 0 : 1); };
  if (process.argv.includes('--sim')) go();
  else { const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Isto apaga os resultados atuais do cenário C (${mode}) e volta ao treino de referência. Continuar? (s/N) `, a => { rl.close(); if (/^s/i.test(a.trim())) go(); else { console.log('Nada foi alterado.'); process.exit(0); } }); }
}
