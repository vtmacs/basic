// マニュアル/比較ページに載せたサンプルをすべて実際に実行して、エラーにならないことを確認する
const { exec } = require('./harness');
const { buildAll } = require('../tools/build-docs');
(async () => {
  const { examples } = buildAll({ collect: true });
  let bad = 0;
  for (const e of examples) {
    const r = await exec(e.dialect, e.code, { inputs: ['3', '4', '5', '6', '7', '8'], maxSleeps: 30, seed: 3 });
    if (r.err) { bad++; console.log('FAIL [' + e.dialect + '] ' + e.title + ' -> ' + r.err.msg + ' @' + r.err.line + '\n' + e.code.split('\n').slice(Math.max(0, (r.err.srcLine || 1) - 2), (r.err.srcLine || 1) + 1).join('\n')); }
    else if (process.argv[2] === '-v') console.log('OK [' + e.dialect + '] ' + e.title + '\n' + r.text.split('\n').slice(0, 6).join('\n'));
  }
  console.log(`${examples.length} examples, ${bad} failed`);
  process.exit(bad ? 1 : 0);
})();
