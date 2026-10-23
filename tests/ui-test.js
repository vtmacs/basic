const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  const url = 'file://' + path.resolve(__dirname, '../index.html');
  let ok = 0, bad = 0;
  const check = (name, cond) => { if (cond) ok++; else { bad++; console.log('FAIL', name); } };
  const screenText = () => page.evaluate(() => window.__sim.getScreen().text());
  const status = () => page.textContent('#status');

  // 1. INPUT (tiny guess game)
  await page.goto(url + '#tiny');
  await page.evaluate(() => { document.querySelector('#editor').value = '10 INPUT A\n20 PRINT A*2\n30 END'; });
  await page.click('#run');
  await page.waitForSelector('#input-row.on');
  await page.fill('#input', '21');
  await page.press('#input', 'Enter');
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('終了'));
  check('input echo', (await screenText()).includes('42'));

  // 2. 構文エラー表示と行選択
  await page.evaluate(() => { document.querySelector('#editor').value = '10 PRINT 1\n20 PRINT )'; });
  await page.click('#run');
  await page.waitForTimeout(100);
  check('error status', (await status()).includes('エラー'));
  const sel = await page.evaluate(() => { const e = document.querySelector('#editor'); return e.value.slice(e.selectionStart, e.selectionEnd); });
  check('error line selected', sel === '20 PRINT )');

  // 3. 無限ループの停止
  await page.evaluate(() => window.__sim.setDialect('n88'));
  await page.evaluate(() => { document.querySelector('#editor').value = '10 I=I+1\n20 GOTO 10'; });
  await page.click('#run');
  await page.waitForTimeout(300);
  check('running state', (await page.isDisabled('#stop')) === false);
  await page.click('#stop');
  await page.waitForTimeout(100);
  check('stopped', (await status()).includes('停止'));
  check('stop disabled', await page.isDisabled('#stop'));

  // 4. INKEY$
  await page.evaluate(() => { document.querySelector('#editor').value = '10 K$=INKEY$\n20 IF K$="" THEN 10\n30 PRINT "KEY=";K$\n40 END'; });
  await page.click('#run');
  await page.waitForTimeout(100);
  await page.keyboard.press('q');
  await page.waitForTimeout(200);
  check('inkey', (await screenText()).includes('KEY=q'));

  // 5. smile BUTTON / 方言切り替えでコード保持
  await page.evaluate(() => window.__sim.setDialect('smile'));
  await page.evaluate(() => { document.querySelector('#editor').value = 'WHILE 1\nLOCATE 0,0:PRINT BUTTON()\nVSYNC\nWEND'; });
  await page.click('#run');
  await page.waitForTimeout(100);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(150);
  check('button left', (await screenText()).startsWith('4'));
  await page.keyboard.up('ArrowLeft');
  await page.click('#stop');
  await page.evaluate(() => window.__sim.setDialect('n88'));
  check('n88 code kept', (await page.inputValue('#editor')).includes('KEY=') );
  // 6. URL param code
  await page.goto(url + '?d=full&code=' + encodeURIComponent('PRINT "URL OK"\nEND'));
  check('url code', (await page.inputValue('#editor')).includes('URL OK'));
  check('url dialect', (await page.getAttribute('html', 'data-dialect')) === 'full');
  await page.click('#run');
  await page.waitForTimeout(150);
  check('url run', (await screenText()).includes('URL OK'));
  // 7. サンプル選択
  await page.selectOption('#samples', '1');
  check('sample loaded', (await page.inputValue('#editor')).includes('FizzBuzz'));
  // 8. 行番号をふる
  await page.goto(url + '#tiny');
  await page.evaluate(() => { document.querySelector('#editor').value = 'PRINT 1\nPRINT 2'; });
  await page.click('#number');
  check('renumber', (await page.inputValue('#editor')) === '10 PRINT 1\n20 PRINT 2');
  // 9. N88 のファイルはブラウザに残る(2回実行すると追記される)
  await page.goto(url + '#n88');
  await page.evaluate(() => window.__sim.setDialect('n88'));
  await page.evaluate(() => { localStorage.clear(); document.querySelector('#editor').value = '10 OPEN "M.TXT" FOR APPEND AS #1\n20 PRINT #1,"X"\n30 CLOSE\n40 OPEN "M.TXT" FOR INPUT AS #1\n50 WHILE NOT EOF(1):LINE INPUT #1,A$:PRINT A$:WEND'; });
  await page.click('#run'); await page.waitForTimeout(150);
  await page.click('#run'); await page.waitForTimeout(150);
  check('n88 file persists', (await screenText()).replace(/\s+/g, '') === 'XX');
  console.log(`ui: ${ok} ok, ${bad} failed`, errors);
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})();
