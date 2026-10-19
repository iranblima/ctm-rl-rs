process.chdir(__dirname);
// referência na validação (mesmos 16 cenários do treino)
const E = require('./env.js');
const VAL = Array.from({ length: 16 }, (_, i) => E.synthScenario(900000 + i));
for (const n of ['none', 'random', 'greedy']) { const v = VAL.map(z => E.runEpisode(z, E.P[n]).total); console.log(n, (v.reduce((a, b) => a + b) / v.length).toFixed(0)); }
