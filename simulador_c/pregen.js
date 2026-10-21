// Cenário C — sorteia uma vez todos os cenários (treino, validação e teste) e guarda a tentativa aceita de cada semente
// em results/cenarios_c.json, para o treino e o teste não refazerem as tentativas rejeitadas. node pregen.js <parte> <nPartes>
process.env.CTM_NOHINT = '1'; process.chdir(__dirname);
const E = require('./env.js'), fs = require('fs');
const part = +process.argv[2] || 0, np = +process.argv[3] || 1, out = {};
const seeds = [...Array(300).keys()].map(E.SEEDS.treino).concat([...Array(40).keys()].map(E.SEEDS.validacao), [...Array(60).keys()].map(E.SEEDS.teste));
seeds.forEach((s, j) => { if (j % np !== part) return; const sc = E.scenario(s); out[s] = sc.tries; if (j % 20 === part) console.log(j, s, sc.tries); });
fs.writeFileSync(`results/cenarios_c_${part}.json`, JSON.stringify(out));
