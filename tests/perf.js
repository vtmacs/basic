const { exec } = require('./harness');
(async () => {
  for (const [d, src] of [
    ['n88', '10 FOR I=1 TO 1000000: S=S+I*2: NEXT I\n20 PRINT S'],
    ['smile', 'FOR I=1 TO 1000000\nS=S+I*2\nNEXT\nPRINT S'],
    ['full', 'FOR i = 1 TO 1000000\nLET s = s + i * 2\nNEXT i\nPRINT s'],
    ['tiny', '10 LET I=0\n20 LET I=I+1\n30 IF I<30000 THEN GOTO 20\n40 PRINT I'],
  ]) {
    const t = Date.now();
    const r = await exec(d, src);
    console.log(d, r.err ? r.err.msg : r.text, (Date.now() - t) + 'ms');
  }
})();
