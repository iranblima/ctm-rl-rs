// Cenário C2 — sorteia uma vez os 100 cenários do NOVO conjunto de teste (sementes a partir de 4.000.000) e guarda a tentativa
// aceita de cada um em results/cenarios_c2_teste_<parte>.json. Treino e validação reaproveitam os do cenário C (mesmas sementes).
// node pregen.js <parte> <nPartes>
process.env.CTM_NOHINT = '1'; process.chdir(__dirname);
const E = require('./env.js'), fs = require('fs');
const part = +process.argv[2] || 0, np = +process.argv[3] || 1, out = {};
for (let i = 0; i < (+process.env.CTM_NTE || 100); i++) { if (i % np !== part) continue; const s = E.SEEDS.teste2(i), sc = E.scenario(s); out[s] = sc.tries; }
fs.writeFileSync(`results/cenarios_c2_teste_${part}.json`, JSON.stringify(out));
