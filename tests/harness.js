const path = require('path');
require(path.join(__dirname, '../js/screen.js'));
require(path.join(__dirname, '../js/basic-core.js'));
require(path.join(__dirname, '../js/basic-compiler.js'));
require(path.join(__dirname, '../js/basic-vm.js'));
require(path.join(__dirname, '../js/sprites.js'));
const NS = globalThis.MacsBasic;

async function exec(dialect, src, opt) {
  opt = opt || {};
  const D = NS.DIALECTS[dialect];
  const screen = NS.createScreen(dialect);
  const env = NS.makeEnv(screen, opt);
  let t = 0;
  env.now = () => { t += 1; if (t > 20000 && vmRef) vmRef.stop(); return t; };
  let sleeps = 0, vmRef = null;
  env.sleep = (ms) => { t += ms; if (opt.maxSleeps && ++sleeps > opt.maxSleeps && vmRef) vmRef.stop(); return Promise.resolve(); };
  env.yield = () => Promise.resolve();
  const q = (opt.inputs || []).slice();
  env.input = () => { if (q.length) return Promise.resolve(q.shift()); if (vmRef) vmRef.stop(); return Promise.reject(new NS.StopSignal()); };
  let err = null, reason = null;
  try {
    const r = NS.run(src, dialect, env);
    vmRef = r.vm; var vm = r.vm;
    reason = await r.promise;
  } catch (e) { err = e; }
  return { text: screen.text(), lines: screen.textLines(), err, reason, screen, vm };
}
module.exports = { exec, NS };
