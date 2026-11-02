// Confirmação — sorteia os 100 cenários novos (sementes 5.000.000+) e guarda a tentativa aceita: node pregen.js <parte> <nPartes>
// Grava results/hints_<parte>.json; o orquestrador junta tudo nos arquivos de atalho dos ambientes do D e do C2 (mesmo gerador).
process.env.CTM_NOHINT = '1'; process.chdir(__dirname);
const E = require('../simulador_d/env.js'), fs = require('fs');
const part = +process.argv[2] || 0, np = +process.argv[3] || 1, out = {};
for (let i = 0; i < (+process.env.CTM_NTE || 100); i++) { if (i % np !== part) continue; const s = 5000000 + i, sc = E.scenario(s); out[s] = sc.tries; console.log(s, sc.tries); }
fs.writeFileSync(`results/hints_${part}.json`, JSON.stringify(out));
