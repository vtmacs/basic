/* MACS BASIC Simulator - UI */
(function () {
  'use strict';
  const NS = window.MacsBasic;
  const $ = (s) => document.querySelector(s);

  const INFO = {
    tiny: {
      desc: '最小限のBASIC(1975年ごろ)。行番号が必須で、変数は A〜Z の整数だけ、文字列やFORもありません。シンプルだからこそ「プログラムとは何か」がよく分かります。グラフィックは本シミュレータ独自の拡張命令(PLOT / LINE / CIRCLE / COLOR)で対応。',
      keys: '入力待ちのときは下の入力欄に打ち込んで <kbd>Enter</kbd>。画面は 80×25 文字・640×400 ドットです。',
      font: '"Courier New", "Noto Sans Mono CJK JP", "MS Gothic", monospace',
    },
    n88: {
      desc: 'NEC PC-8801/PC-9801 シリーズの標準BASIC。行番号つきで、色・図形(LINE/CIRCLE/PAINT)・音(PLAY)・文字列関数が使える、日本のパソコン黎明期の定番です。',
      keys: '<kbd>INKEY$</kbd> 用に、画面をクリックしてからキーを押します(矢印キー = 28〜31)。画面は 80×25 文字・640×400 ドット・8色です。',
      font: '"MS Gothic", "Noto Sans Mono CJK JP", "Courier New", monospace',
    },
    full: {
      desc: 'JIS X 3003 / ISO 10279 で標準化された構造化BASIC。行番号は不要、IF…END IF、SELECT CASE、DO…LOOP、SUB / FUNCTION が使えます。グラフィックは SET WINDOW で好きな座標系を決めて PLOT / BOX で描きます。',
      keys: '<kbd>INPUT</kbd> の入力は下の入力欄から。画面は正方形の 400×400 ドットで、文字は 50×25 です。',
      font: '"Courier New", "Noto Sans Mono CJK JP", "MS Gothic", monospace',
    },
    smile: {
      desc: 'ゲームを作りたくなる現代的なBASIC(SmileBASIC風)。行番号なし、ラベル(@LOOP)、DEF による関数、配列 A[i]、VSYNC によるフレーム同期、RGB() による色指定。スプライト等は未対応です。',
      keys: '<kbd>←↑↓→</kbd> = 十字キー、<kbd>Z</kbd><kbd>X</kbd><kbd>A</kbd><kbd>S</kbd> = A/B/X/Y ボタン(<kbd>BUTTON()</kbd>)。マウスでタッチ(<kbd>TOUCH</kbd>)。画面は 400×240 ドット・50×30 文字です。',
      font: '"Noto Sans Mono CJK JP", "MS Gothic", "Courier New", monospace',
    },
  };
  const LABELS = { tiny: 'Tiny BASIC', n88: 'N88-BASIC', full: 'Full BASIC', smile: 'smile BASIC' };

  const editor = $('#editor'), statusEl = $('#status'), runBtn = $('#run'), stopBtn = $('#stop');
  const screenEl = $('#screen'), gfx = $('#gfx'), txt = $('#txt');
  const gctx = gfx.getContext('2d'), tctx = txt.getContext('2d');
  const inputRow = $('#input-row'), inputEl = $('#input'), samplesEl = $('#samples');

  let dialect = 'n88', screen = null, vm = null, running = false, pendingInput = null;
  const keyQueue = [], pressed = new Set();
  let touch = { down: false, x: 0, y: 0, t0: 0 };

  // ---------------------------------------------------------------- 保存
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 無視 */ } },
  };
  const codeKey = (d) => 'macs-basic:code:' + d;

  // ---------------------------------------------------------------- 画面
  function makeScreen() {
    const D = NS.DIALECTS[dialect];
    screen = new NS.Screen({ cols: D.cols, rows: D.rows, gw: D.gw, gh: D.gh, bg: D.bg, fg: D.fg });
    gfx.width = D.gw; gfx.height = D.gh;
    txt.width = D.gw * 2; txt.height = D.gh * 2;
    screenEl.style.setProperty('--ar', D.gw + ' / ' + D.gh);
    screenEl.style.background = '#' + D.bg.toString(16).padStart(6, '0');
    $('#screen-size').textContent = D.gw + '×' + D.gh + ' / ' + D.cols + '×' + D.rows + '文字';
    screen.dirtyG = screen.dirtyT = true;
    return screen;
  }
  function frame() {
    if (screen) {
      if (screen.dirtyG) screen.renderGfx(gctx);
      if (screen.dirtyT || screen.cursorOn) screen.renderText(tctx, txt.width, txt.height, INFO[dialect].font);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- 状態表示
  function setStatus(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = 'status' + (cls ? ' ' + cls : '');
  }
  function setRunning(on) {
    running = on;
    runBtn.disabled = false;
    stopBtn.disabled = !on;
    runBtn.textContent = on ? '↻ 最初から実行' : '▶ 実行';
  }
  function selectLine(n) {
    if (!n) return;
    const lines = editor.value.split('\n');
    let start = 0;
    for (let i = 0; i < n - 1 && i < lines.length; i++) start += lines[i].length + 1;
    const end = start + (lines[n - 1] || '').length;
    editor.focus();
    editor.setSelectionRange(start, end);
    const lh = parseFloat(getComputedStyle(editor).lineHeight) || 21;
    editor.scrollTop = Math.max(0, (n - 4) * lh);
  }
  function showError(e) {
    if (e instanceof NS.BasicError) {
      const D = NS.DIALECTS[dialect];
      const where = e.line ? (D.lineNo === 'none' || e.line === e.srcLine && D.lineNo !== 'req' ? `${e.srcLine || e.line}行目` : `行番号 ${e.line}`) : '';
      setStatus(`エラー: ${e.msg}${where ? '  (' + where + ')' : ''}`, 'err');
      selectLine(e.srcLine);
    } else {
      console.error(e);
      setStatus('内部エラー: ' + (e && e.message ? e.message : e), 'err');
    }
  }

  // ---------------------------------------------------------------- 入出力
  function askInput() {
    return new Promise((resolve, reject) => {
      pendingInput = { resolve, reject };
      inputRow.classList.add('on');
      inputEl.value = '';
      inputEl.focus({ preventScroll: true });
    });
  }
  function cancelInput() {
    if (pendingInput) { const p = pendingInput; pendingInput = null; p.reject(new NS.StopSignal()); }
    inputRow.classList.remove('on');
  }
  inputRow.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!pendingInput) return;
    const p = pendingInput; pendingInput = null;
    inputRow.classList.remove('on');
    p.resolve(inputEl.value);
    screenEl.focus({ preventScroll: true });
  });

  const KEYMAP = { Enter: '\r', Backspace: '\b', Escape: '\x1b', ArrowRight: '\x1c', ArrowLeft: '\x1d', ArrowUp: '\x1e', ArrowDown: '\x1f', Tab: '\t' };
  const BTN = { ArrowUp: 1, ArrowDown: 2, ArrowLeft: 4, ArrowRight: 8, KeyZ: 16, KeyX: 32, KeyA: 64, KeyS: 128, KeyQ: 256, KeyW: 512, Enter: 2048 };
  function typing(el) { return el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'SELECT'); }
  document.addEventListener('keydown', (e) => {
    if (!running || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    pressed.add(e.code);
    const ch = KEYMAP[e.key] || (e.key.length === 1 ? e.key : '');
    if (ch) { keyQueue.push(ch); if (keyQueue.length > 64) keyQueue.shift(); }
    if (BTN[e.code] || KEYMAP[e.key] || e.key === ' ') e.preventDefault();
  });
  document.addEventListener('keyup', (e) => pressed.delete(e.code));
  window.addEventListener('blur', () => pressed.clear());
  function pos(ev) {
    const r = gfx.getBoundingClientRect();
    return [Math.floor((ev.clientX - r.left) / r.width * gfx.width), Math.floor((ev.clientY - r.top) / r.height * gfx.height)];
  }
  screenEl.addEventListener('pointerdown', (ev) => { screenEl.focus({ preventScroll: true }); const p = pos(ev); touch = { down: true, x: p[0], y: p[1], t0: Date.now() }; });
  screenEl.addEventListener('pointermove', (ev) => { if (touch.down) { const p = pos(ev); touch.x = p[0]; touch.y = p[1]; } });
  window.addEventListener('pointerup', () => { touch.down = false; });

  // 音 (Web Audio)
  let actx = null, tpos = 0;
  function ensureAudio() {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { actx = null; }
  }
  function tone(freq, ms) {
    if (!actx) return;
    const t = Math.max(actx.currentTime, tpos);
    if (t - actx.currentTime > 30) return;
    if (freq > 20 && freq < 20000) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = dialect === 'smile' ? 'triangle' : 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
      g.gain.setValueAtTime(0.08, t + Math.max(0.01, ms / 1000 - 0.02));
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + ms / 1000 + 0.02);
    }
    tpos = t + ms / 1000;
  }

  // ---------------------------------------------------------------- 実行
  async function run() {
    stop(true);
    ensureAudio();
    const src = editor.value;
    store.set(codeKey(dialect), src);
    let prog;
    try { prog = NS.compile(src, dialect); } catch (e) { setRunning(false); showError(e); return; }
    makeScreen();
    keyQueue.length = 0;
    tpos = 0;
    const env = {
      screen, seed: Date.now(),
      now: () => Date.now(),
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      yield: () => new Promise((r) => setTimeout(r, 0)),
      input: askInput,
      inkey: () => keyQueue.shift() || '',
      buttons: () => { let b = 0; pressed.forEach((c) => { b |= BTN[c] || 0; }); return b; },
      stick: () => [(pressed.has('ArrowRight') ? 1 : 0) - (pressed.has('ArrowLeft') ? 1 : 0), (pressed.has('ArrowUp') ? 1 : 0) - (pressed.has('ArrowDown') ? 1 : 0)],
      touch: () => [touch.down ? Math.floor((Date.now() - touch.t0) * 60 / 1000) + 1 : 0, touch.x, touch.y],
      tone, abort: cancelInput,
    };
    const me = new NS.VM(prog, env);
    vm = me;
    setRunning(true);
    setStatus('実行中…');
    screenEl.focus({ preventScroll: true });
    try {
      const reason = await me.run();
      if (vm !== me) return;
      if (reason === 'user') setStatus('停止しました');
      else if (reason === 'stop') setStatus('STOP で停止しました', 'ok');
      else setStatus('プログラムが終了しました', 'ok');
    } catch (e) {
      if (vm !== me) return;
      showError(e);
    }
    if (vm === me) { setRunning(false); cancelInput(); }
  }
  function stop(silent) {
    if (vm && running) { vm.stop(); cancelInput(); }
    if (!silent) { setRunning(false); }
  }

  // ---------------------------------------------------------------- 方言切り替え
  function fillSamples() {
    samplesEl.innerHTML = '';
    const o = document.createElement('option'); o.textContent = 'サンプルを選ぶ…'; o.value = ''; samplesEl.appendChild(o);
    (NS.SAMPLES[dialect] || []).forEach((s, i) => {
      const op = document.createElement('option'); op.value = String(i); op.textContent = s.title; samplesEl.appendChild(op);
    });
  }
  function setDialect(d, opt) {
    opt = opt || {};
    if (!NS.DIALECTS[d]) d = 'n88';
    if (running) { vm.stop(); cancelInput(); setRunning(false); }
    if (!opt.initial) store.set(codeKey(dialect), editor.value);
    dialect = d;
    store.set('macs-basic:dialect', d);
    document.documentElement.dataset.dialect = d;
    document.title = LABELS[d] + ' | BASIC シミュレータ | MACS Project';
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.d === d)));
    $('#desc').innerHTML = INFO[d].desc + ` <a href="manual-${d}.html">${LABELS[d]} マニュアル</a>`;
    $('#keys').innerHTML = INFO[d].keys;
    $('#screen-title').textContent = LABELS[d] + ' の画面';
    document.querySelectorAll('[data-manual]').forEach((a) => { a.href = `manual-${d}.html`; });
    fillSamples();
    const saved = store.get(codeKey(d));
    editor.value = opt.code != null ? opt.code : saved != null ? saved : (NS.SAMPLES[d] && NS.SAMPLES[d][0].code) || '';
    makeScreen();
    setStatus('準備完了');
    if (!opt.initial) history.replaceState(null, '', '#' + d);
  }
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setDialect(t.dataset.d)));
  document.querySelector('.tabs').addEventListener('keydown', (e) => {
    const tabs = [...document.querySelectorAll('.tab')];
    const i = tabs.findIndex((t) => t.dataset.d === dialect);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); setDialect(n.dataset.d);
    }
  });

  // ---------------------------------------------------------------- ボタン
  runBtn.addEventListener('click', run);
  stopBtn.addEventListener('click', () => { stop(); setStatus('停止しました'); });
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
  samplesEl.addEventListener('change', () => {
    const i = samplesEl.value;
    if (i === '') return;
    if (editor.value.trim() && !confirm('今のプログラムをサンプルで置き換えます。よろしいですか?')) { samplesEl.value = ''; return; }
    editor.value = NS.SAMPLES[dialect][+i].code;
    samplesEl.value = '';
    setStatus('サンプルを読み込みました。「実行」を押してください');
  });
  editor.addEventListener('input', () => store.set(codeKey(dialect), editor.value));
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const s = editor.selectionStart, t = editor.selectionEnd;
      editor.setRangeText('  ', s, t, 'end');
      editor.dispatchEvent(new Event('input'));
    }
  });
  $('#number').addEventListener('click', () => {
    const lines = editor.value.split('\n');
    let n = 10;
    editor.value = lines.map((l) => {
      if (/^\s*$/.test(l)) return l;
      if (/^\s*\d+(\s|$)/.test(l)) { n = parseInt(l, 10) + 10; return l; }
      const r = n + ' ' + l; n += 10; return r;
    }).join('\n');
    store.set(codeKey(dialect), editor.value);
    setStatus('行番号を振りました');
  });
  $('#clear').addEventListener('click', () => {
    if (!editor.value.trim() || confirm('プログラムをすべて消去します。よろしいですか?')) { editor.value = ''; store.set(codeKey(dialect), ''); editor.focus(); }
  });
  $('#save').addEventListener('click', () => {
    const blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = dialect + '.bas';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus(dialect + '.bas として保存しました');
  });
  $('#load').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { editor.value = String(r.result); store.set(codeKey(dialect), editor.value); setStatus(f.name + ' を読み込みました'); };
    r.readAsText(f);
    e.target.value = '';
  });

  // ---------------------------------------------------------------- 起動
  const q = new URLSearchParams(location.search);
  let d0 = q.get('d') || location.hash.replace('#', '') || store.get('macs-basic:dialect') || 'n88';
  if (!NS.DIALECTS[d0]) d0 = 'n88';
  setDialect(d0, { initial: true, code: q.get('code') });
  if (q.get('code') != null) { store.set(codeKey(d0), editor.value); history.replaceState(null, '', location.pathname + '#' + d0); }
  requestAnimationFrame(frame);

  // テスト用
  window.__sim = { run, stop, setDialect, getScreen: () => screen, getVM: () => vm };
})();
