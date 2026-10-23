require('../js/samples.js');
const { exec, NS } = require('./harness');
(async () => {
  let bad = 0;
  for (const d of Object.keys(NS.SAMPLES)) {
    for (const s of NS.SAMPLES[d]) {
      const r = await exec(d, s.code, { inputs: ['50', '30', '3', '80', '90', '1', '2', '3'], maxSleeps: 20, seed: 7 });
      const ok = !r.err;
      if (!ok) bad++;
      console.log((ok ? 'OK  ' : 'FAIL') + ' [' + d + '] ' + s.title + (r.err ? '  -> ' + r.err.msg + ' @' + r.err.line : ''));
      if (process.argv[2] === '-v') console.log(r.text.split('\n').slice(0, 12).join('\n') + '\n');
    }
  }
  process.exit(bad ? 1 : 0);
})();
