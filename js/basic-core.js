/* MACS BASIC Simulator - core: 方言定義 / エラー / 字句解析 / 書式 / 組込み関数 */
(function (root) {
  'use strict';
  const NS = (root.MacsBasic = root.MacsBasic || {});

  class BasicError extends Error {
    constructor(msg, code, line, srcLine) {
      super(msg);
      this.name = 'BasicError';
      this.msg = msg; this.code = code || 0; this.line = line; this.srcLine = srcLine;
    }
  }
  const E = (msg, code) => new BasicError(msg, code);
  const typeErr = () => E('型が一致しません (Type mismatch)', 13);
  const illegal = (m) => E('不正な関数呼び出しです (Illegal function call)' + (m ? ': ' + m : ''), 5);

  // ---------------------------------------------------------------- 方言
  const PAL8 = [0x000000, 0x0000ff, 0xff0000, 0xff00ff, 0x00ff00, 0x00ffff, 0xffff00, 0xffffff];
  const PAL16 = [-1, 0x000000, 0x800000, 0xff0000, 0xff00ff, 0x008000, 0x00ff00, 0x808000, 0xffff00,
    0x000080, 0x0000ff, 0x008080, 0x00ffff, 0x808080, 0xc0c0c0, 0xffffff];
  const words = (s) => new Set(s.split(/\s+/).filter(Boolean));

  const DIALECTS = {
    tiny: {
      id: 'tiny', label: 'Tiny BASIC', lineNo: 'req', colon: false, intOnly: true, suffix: '',
      apos: false, bang: false, brackets: false, trueVal: 1, numStyle: 'plain', digits: 15, zone: 8,
      cols: 80, rows: 25, gw: 640, gh: 400, bg: 0x03140a, fg: 0x4cff8a, pal: PAL8, arrCount: false,
      kw: words('REM LET PRINT IF GOTO GOSUB RETURN INPUT END STOP CLEAR CLS COLOR PLOT LINE CIRCLE WAIT'),
    },
    n88: {
      id: 'n88', label: 'N88-BASIC', lineNo: 'req', colon: true, intOnly: false, suffix: '$%!#',
      apos: true, bang: false, brackets: false, trueVal: -1, numStyle: 'ms', digits: 7, zone: 14,
      cols: 80, rows: 25, gw: 640, gh: 400, bg: 0x000000, fg: 0xffffff, pal: PAL8, arrCount: false,
      kw: words(`REM LET PRINT IF GOTO GOSUB RETURN ON INPUT LINE FOR NEXT WHILE WEND DATA READ RESTORE DIM ERASE
        CLEAR END STOP CLS LOCATE COLOR SCREEN WIDTH BEEP SOUND PLAY RANDOMIZE SWAP DEFINT DEFSNG DEFDBL DEFSTR
        DEF OPTION PSET PRESET CIRCLE PAINT RESUME CONSOLE KEY`),
    },
    full: {
      id: 'full', label: 'Full BASIC', lineNo: 'opt', colon: true, intOnly: false, suffix: '',
      apos: false, bang: true, brackets: false, trueVal: 1, numStyle: 'ms', digits: 15, zone: 16,
      cols: 50, rows: 25, gw: 400, gh: 400, bg: 0xffffff, fg: 0x000000, pal: PAL8, arrCount: false,
      kw: words(`REM LET PRINT INPUT LINE IF ELSEIF ELSE SELECT CASE DO LOOP FOR NEXT EXIT GOTO GOSUB RETURN ON DATA
        READ RESTORE DIM OPTION RANDOMIZE DEF SUB FUNCTION CALL DECLARE END STOP CLEAR SET PLOT BOX WAIT PAUSE`),
    },
    smile: {
      id: 'smile', label: 'smile BASIC', lineNo: 'none', colon: true, intOnly: false, suffix: '',
      apos: true, bang: false, brackets: true, trueVal: 1, numStyle: 'plain', digits: 15, zone: 4,
      cols: 50, rows: 30, gw: 400, gh: 240, bg: 0x000000, fg: 0xffffff, pal: PAL16, arrCount: true,
      kw: words(`REM PRINT LOCATE COLOR CLS VSYNC WAIT FOR NEXT BREAK CONTINUE WHILE WEND REPEAT UNTIL IF ELSEIF ELSE
        ENDIF GOTO GOSUB RETURN ON VAR DIM DATA READ RESTORE DEF END COMMON CALL INPUT LINPUT INC DEC SWAP PUSH
        UNSHIFT SORT RSORT ACLS GCLS GCOLOR GPSET GLINE GBOX GFILL GCIRCLE GPAINT GPRINT XSCREEN DISPLAY BEEP
        RANDOMIZE STICK TOUCH SWITCH CASE DEFAULT ENDSWITCH STOP OPTION
        SPSET SPCLR SPOFS SPROT SPSCALE SPHOME SPCOLOR SPSHOW SPHIDE SPCHR SPDEF SPANIM SPCOL SPVAR
        BGSCREEN BGPUT BGFILL BGOFS BGCLR BGSHOW BGHIDE GPAGE GCOPY SAVE LOAD DELETE RENAME FILES`),
      transparent: true,
    },
  };
  for (const d of Object.values(DIALECTS)) d.suffixSet = new Set(d.suffix.split(''));

  // ---------------------------------------------------------------- 配列
  class BArray {
    constructor(lo, hi, def) {
      this.lo = lo; this.hi = hi; this.def = def;
      this.dims = lo.map((l, i) => hi[i] - l + 1);
      let total = 1; for (const d of this.dims) total *= d;
      if (total > 5e6) throw E('メモリが足りません (Out of memory)', 7);
      this.data = new Array(total).fill(def);
    }
    off(ix) {
      if (ix.length !== this.dims.length) throw E('添字の数が合いません (Subscript out of range)', 9);
      let o = 0;
      for (let k = 0; k < ix.length; k++) {
        const v = Math.trunc(ix[k]);
        if (!(v >= this.lo[k] && v <= this.hi[k])) throw E('添字が範囲外です (Subscript out of range)', 9);
        o = o * this.dims[k] + (v - this.lo[k]);
      }
      return o;
    }
    get(ix) { return this.data[this.off(ix)]; }
    set(ix, v) { this.data[this.off(ix)] = v; }
    clone() {
      const a = new BArray(this.lo.slice(), this.hi.slice(), this.def);
      a.data = this.data.map((v) => (v instanceof BArray ? v.clone() : v));
      return a;
    }
    sync() { this.dims = [this.data.length]; this.lo = [0]; this.hi = [this.data.length - 1]; }
  }

  // ---------------------------------------------------------------- 数値の文字列化
  function expForm(x, digits) {
    let s = x.toExponential(Math.max(0, digits - 1));
    let [m, e] = s.split('e');
    if (m.indexOf('.') >= 0) m = m.replace(/0+$/, '').replace(/\.$/, '');
    const sign = e[0] === '-' ? '-' : '+';
    e = e.replace(/^[+-]/, '');
    return m + 'E' + sign + e.padStart(2, '0');
  }
  function fmtNum(x, digits, noLead) {
    if (x === 0) return '0';
    if (!isFinite(x)) return x > 0 ? '1.#INF' : x < 0 ? '-1.#INF' : '1.#NAN';
    const ax = Math.abs(x);
    let s;
    if (Number.isInteger(x) && ax < Math.pow(10, digits)) s = String(x);
    else if (ax >= Math.pow(10, digits) || ax < 1e-3) s = expForm(x, digits);
    else {
      s = String(Number(x.toPrecision(digits)));
      if (s.indexOf('e') >= 0) s = expForm(x, digits);
    }
    if (noLead) s = s.replace(/^(-?)0\./, '$1.');
    return s;
  }
  function numToStr(vm, x) {
    const D = vm.D;
    if (D.intOnly) return String(x);
    const s = fmtNum(x, D.digits, D.numStyle === 'ms' && D.id === 'n88');
    return s;
  }
  // PRINT時の数値表記 (MS系は前後に空白)
  function printNum(vm, x) {
    const s = numToStr(vm, x);
    if (vm.D.numStyle === 'ms') return (x < 0 ? '' : ' ') + s + ' ';
    return s;
  }

  // PRINT USING
  function usingFormat(fmt, vals) {
    let out = '', vi = 0, guard = 0;
    const hasField = /[#!&\\]/.test(fmt);
    do {
      let i = 0;
      while (i < fmt.length) {
        const c = fmt[i];
        if (c === '_' && i + 1 < fmt.length) { out += fmt[i + 1]; i += 2; continue; }
        if (c === '!') { if (vi >= vals.length) return out; out += String(vals[vi++]).charAt(0) || ' '; i++; continue; }
        if (c === '&') { if (vi >= vals.length) return out; out += String(vals[vi++]); i++; continue; }
        if (c === '\\') {
          const j = fmt.indexOf('\\', i + 1);
          if (j > 0) {
            if (vi >= vals.length) return out;
            const w = j - i + 1; out += String(vals[vi++]).padEnd(w).slice(0, w); i = j + 1; continue;
          }
        }
        const m = /^(\+?)(\*\*|\$\$)?([#,]*)(\.(#+))?(-?)/.exec(fmt.slice(i));
        if (m && (m[3].replace(/,/g, '').length > 0 || m[5])) {
          if (vi >= vals.length) return out;
          const v = vals[vi++];
          if (typeof v !== 'number') throw typeErr();
          const dec = m[5] ? m[5].length : 0;
          const width = m[0].length;
          let t = Math.abs(v).toFixed(dec);
          if (m[3].indexOf(',') >= 0) { const [a, b] = t.split('.'); t = a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : ''); }
          if (m[2] === '$$') t = '$' + t;
          const neg = v < 0 && Number(t.replace(/[,$]/g, '')) !== 0;
          if (m[1]) t = (v < 0 ? '-' : '+') + t; else if (neg) t = '-' + t;
          if (m[6] && !m[1]) { t = t.replace(/^-/, '') + (neg ? '-' : ' '); }
          if (t.length > width) t = '%' + t;
          out += m[2] === '**' ? t.padStart(width, '*') : t.padStart(width);
          i += m[0].length; continue;
        }
        out += c; i++;
      }
    } while (hasField && vi < vals.length && ++guard < 1000);
    return out;
  }

  // ---------------------------------------------------------------- 字句解析
  const OPS2 = ['<>', '<=', '>=', '==', '!=', '<<', '>>', '&&', '||', '=<', '=>', '><'];
  const OPS1 = '+-*/\\^()[],;:=<>.?#@!%&';
  function tokenize(s, D) {
    const toks = [];
    const n = s.length;
    let i = 0;
    const NUM = /(\d+\.?\d*|\.\d+)(?:[eEdD][+-]?\d+)?/y;
    const ID = /[A-Za-z_][A-Za-z0-9_]*/y;
    while (i < n) {
      const c = s[i];
      if (c === ' ' || c === '\t' || c === '　') { i++; continue; }
      const pos = i;
      if (c === '"') {
        let j = i + 1, str = '';
        for (;;) {
          if (j >= n) break;
          if (s[j] === '"') { if (s[j + 1] === '"') { str += '"'; j += 2; continue; } j++; break; }
          str += s[j++];
        }
        toks.push({ t: 'str', v: str, pos }); i = j; continue;
      }
      if (D.apos && c === "'") { toks.push({ t: 'id', v: 'REM', raw: s.slice(i + 1), pos }); i = n; break; }
      if (D.bang && c === '!') { toks.push({ t: 'id', v: 'REM', raw: s.slice(i + 1), pos }); i = n; break; }
      if (c === '&' && (D.id === 'n88' || D.id === 'smile') && /[HhOoBb]/.test(s[i + 1] || '')) {
        const kind = s[i + 1].toUpperCase();
        const re = kind === 'H' ? /[0-9A-Fa-f]+/y : kind === 'O' ? /[0-7]+/y : /[01]+/y;
        re.lastIndex = i + 2;
        const m = re.exec(s);
        if (m) {
          toks.push({ t: 'num', v: parseInt(m[0], kind === 'H' ? 16 : kind === 'O' ? 8 : 2), pos });
          i = re.lastIndex; if (D.id === 'n88' && s[i] === '%') i++; continue;
        }
      }
      if ((c >= '0' && c <= '9') || (c === '.' && s[i + 1] >= '0' && s[i + 1] <= '9')) {
        NUM.lastIndex = i;
        const m = NUM.exec(s);
        toks.push({ t: 'num', v: parseFloat(m[0].replace(/[dD]/, 'e')), pos });
        i = NUM.lastIndex;
        if (D.id === 'n88' && (s[i] === '!' || s[i] === '#' || s[i] === '%')) i++;
        continue;
      }
      if (D.id === 'smile' && c === '@' && /[A-Za-z_]/.test(s[i + 1] || '')) {
        ID.lastIndex = i + 1; const m = ID.exec(s);
        toks.push({ t: 'label', v: '@' + m[0].toUpperCase(), pos }); i = ID.lastIndex; continue;
      }
      if (D.id === 'smile' && c === '#' && /[A-Za-z_]/.test(s[i + 1] || '')) {
        ID.lastIndex = i + 1; const m = ID.exec(s);
        toks.push({ t: 'id', v: '#' + m[0].toUpperCase(), pos }); i = ID.lastIndex; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        ID.lastIndex = i;
        const m = ID.exec(s);
        let name = m[0].toUpperCase();
        i = ID.lastIndex;
        if (s[i] === '$') { name += '$'; i++; }
        else if (D.suffixSet.has(s[i]) && s[i] !== '$') { name += s[i]; i++; }
        if (name === 'REM' || name === 'DATA') {
          toks.push({ t: 'id', v: name, raw: s.slice(i), pos }); i = n; break;
        }
        const mk = /^(GOTO|GOSUB|THEN|ELSE|RESTORE)(\d+)$/.exec(name); // GOTO100 のような続け書き
        if (mk) { toks.push({ t: 'id', v: mk[1], pos }); toks.push({ t: 'num', v: parseInt(mk[2], 10), pos }); continue; }
        toks.push({ t: 'id', v: name, pos });
        continue;
      }
      const two = s.substr(i, 2);
      if (OPS2.indexOf(two) >= 0) { toks.push({ t: 'op', v: two, pos }); i += 2; continue; }
      if (c === '?' && (D.id === 'n88' || D.id === 'smile')) { toks.push({ t: 'id', v: 'PRINT', pos }); i++; continue; }
      if (OPS1.indexOf(c) >= 0) { toks.push({ t: 'op', v: c, pos }); i++; continue; }
      throw E('使えない文字があります: ' + c, 2);
    }
    toks.push({ t: 'eof', v: '', pos: n });
    return toks;
  }

  // ---------------------------------------------------------------- 組込み関数
  const FN = Object.create(null);
  const STD = 'n88,full,smile', ALL = 'tiny,n88,full,smile';
  function def(names, min, max, fn, d) {
    for (const nm of names.split(' ')) FN[nm] = { min, max, fn, d: (d || STD).split(',') };
  }
  const num = (x) => { if (typeof x !== 'number') throw typeErr(); return x; };
  const str = (x) => { if (typeof x !== 'string') throw typeErr(); return x; };
  const chk = (v) => { if (!isFinite(v)) throw E('オーバーフロー (Overflow)', 6); return v; };

  def('ABS', 1, 1, (vm, a) => Math.abs(num(a)), ALL);
  def('SGN', 1, 1, (vm, a) => Math.sign(num(a)));
  def('INT FLOOR', 1, 1, (vm, a) => Math.floor(num(a)));
  def('FIX TRUNC', 1, 1, (vm, a) => Math.trunc(num(a)));
  def('IP', 1, 1, (vm, a) => Math.trunc(num(a)));
  def('FP', 1, 1, (vm, a) => num(a) - Math.trunc(a));
  def('CEIL', 1, 1, (vm, a) => Math.ceil(num(a)));
  def('CINT', 1, 1, (vm, a) => Math.round(num(a)));
  def('CSNG CDBL', 1, 1, (vm, a) => num(a));
  def('ROUND', 1, 2, (vm, a, n) => {
    num(a);
    if (n === undefined) return vm.D.id === 'smile' ? Math.round(a) : Math.sign(a) * Math.round(Math.abs(a));
    const p = Math.pow(10, n); return Math.sign(a) * Math.round(Math.abs(a) * p) / p;
  });
  def('TRUNCATE', 1, 2, (vm, a, n) => { const p = Math.pow(10, n || 0); return Math.trunc(num(a) * p) / p; });
  def('SQR', 1, 1, (vm, a) => { if (num(a) < 0) throw illegal(); return Math.sqrt(a); });
  def('SIN', 1, 1, (vm, a) => Math.sin(num(a)));
  def('COS', 1, 1, (vm, a) => Math.cos(num(a)));
  def('TAN', 1, 1, (vm, a) => Math.tan(num(a)));
  def('ATN', 1, 1, (vm, a) => Math.atan(num(a)));
  def('ATAN', 1, 2, (vm, a, b) => (b === undefined ? Math.atan(num(a)) : Math.atan2(num(a), num(b))));
  def('ACOS', 1, 1, (vm, a) => Math.acos(num(a)));
  def('ASIN', 1, 1, (vm, a) => Math.asin(num(a)));
  def('SINH', 1, 1, (vm, a) => Math.sinh(num(a)));
  def('COSH', 1, 1, (vm, a) => Math.cosh(num(a)));
  def('TANH', 1, 1, (vm, a) => Math.tanh(num(a)));
  def('EXP', 1, 1, (vm, a) => chk(Math.exp(num(a))));
  def('LOG', 1, 2, (vm, a, b) => {
    if (num(a) <= 0) throw illegal();
    return b === undefined ? Math.log(a) : Math.log(a) / Math.log(num(b));
  });
  def('LOG10', 1, 1, (vm, a) => { if (num(a) <= 0) throw illegal(); return Math.log10(a); });
  def('LOG2', 1, 1, (vm, a) => { if (num(a) <= 0) throw illegal(); return Math.log2(a); });
  def('DEG', 1, 1, (vm, a) => num(a) * 180 / Math.PI);
  def('RAD', 1, 1, (vm, a) => num(a) * Math.PI / 180);
  def('PI', 0, 0, () => Math.PI, 'full,smile');
  def('POW', 2, 2, (vm, a, b) => chk(Math.pow(num(a), num(b))), 'smile');
  def('MOD', 2, 2, (vm, a, b) => { if (num(b) === 0) throw E('0で割りました (Division by zero)', 11); return num(a) - b * Math.floor(a / b); }, 'full');
  def('REMAINDER', 2, 2, (vm, a, b) => { if (num(b) === 0) throw E('0で割りました (Division by zero)', 11); return num(a) - b * Math.trunc(a / b); }, 'full');
  def('MAX', 1, 99, (vm, ...a) => Math.max(...(a.length === 1 && a[0] instanceof BArray ? a[0].data : a).map(num)), 'full,smile');
  def('MIN', 1, 99, (vm, ...a) => Math.min(...(a.length === 1 && a[0] instanceof BArray ? a[0].data : a).map(num)), 'full,smile');
  def('CLAMP', 3, 3, (vm, a, lo, hi) => Math.min(Math.max(num(a), num(lo)), num(hi)), 'smile');
  def('SIZE', 0, 0, () => 1024, 'tiny');
  def('RND', 0, 1, (vm, a) => {
    const id = vm.D.id;
    if (id === 'tiny') { num(a); if (a < 1) throw illegal('RND(n) の n は1以上'); return Math.floor(vm.rand() * a) + 1; }
    if (id === 'smile') { if (a === undefined) return vm.rand(); if (num(a) < 1) throw illegal(); return Math.floor(vm.rand() * a); }
    if (id === 'n88') { if (a !== undefined && a < 0) vm.seed(-a); if (a === 0) return vm.lastRnd; return (vm.lastRnd = vm.rand()); }
    return vm.rand();
  }, ALL);
  def('RNDF', 0, 1, (vm) => vm.rand(), 'smile');
  def('FRE', 0, 1, () => 60000, 'n88');
  def('TIMER', 0, 0, (vm) => (vm.env.now() - vm.t0) / 1000, 'n88,full');
  def('TIME', 0, 0, (vm) => { const d = new Date(vm.env.now()); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); }, 'full');
  const pad2 = (n) => String(n).padStart(2, '0');
  def('TIME$', 0, 0, (vm) => { const d = new Date(vm.env.now()); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }, STD);
  def('DATE$', 0, 0, (vm) => {
    const d = new Date(vm.env.now());
    return vm.D.id === 'n88' ? pad2(d.getFullYear() % 100) + '/' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate())
      : d.getFullYear() + '/' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate());
  }, STD);
  def('MAINCNT', 0, 0, (vm) => Math.floor((vm.env.now() - vm.t0) * 60 / 1000), 'smile');
  def('MILLISEC', 0, 0, (vm) => Math.floor(vm.env.now() - vm.t0), 'smile');

  // 文字列
  def('LEN', 1, 1, (vm, a) => (a instanceof BArray ? a.data.length : str(a).length));
  def('LEFT$', 2, 2, (vm, s, n) => { if (num(n) < 0) throw illegal(); return str(s).slice(0, n); });
  def('RIGHT$', 2, 2, (vm, s, n) => { if (num(n) < 0) throw illegal(); return n === 0 ? '' : str(s).slice(-n); });
  def('MID$', 2, 3, (vm, s, p, l) => {
    str(s); num(p);
    const base = vm.D.id === 'smile' ? 0 : 1;
    if (p < base) { if (vm.D.id === 'smile') throw illegal(); throw illegal(); }
    const st = p - base;
    return l === undefined ? s.slice(st) : s.substr(st, Math.max(0, num(l)));
  });
  def('STR$', 1, 1, (vm, x) => { num(x); const t = numToStr(vm, x); return vm.D.id === 'n88' && x >= 0 ? ' ' + t : t; });
  def('VAL', 1, 1, (vm, s) => {
    s = str(s).trim();
    let m = /^&H([0-9A-Fa-f]+)/i.exec(s); if (m) return parseInt(m[1], 16);
    m = /^&B([01]+)/i.exec(s); if (m) return parseInt(m[1], 2);
    m = /^[+-]?(\d+\.?\d*|\.\d+)([eEdD][+-]?\d+)?/.exec(s);
    return m ? parseFloat(m[0].replace(/[dD]/, 'e')) : 0;
  });
  def('CHR$', 1, 1, (vm, n) => { if (num(n) < 0 || n > 0x10ffff) throw illegal(); return String.fromCodePoint(n); });
  def('ASC ORD', 1, 1, (vm, s) => { if (str(s) === '') throw illegal(); return s.codePointAt(0); });
  def('HEX$', 1, 2, (vm, n, w) => { let t = (Math.trunc(num(n)) >>> 0).toString(16).toUpperCase(); return w ? t.padStart(w, '0') : t; });
  def('OCT$', 1, 1, (vm, n) => (Math.trunc(num(n)) >>> 0).toString(8));
  def('BIN$', 1, 2, (vm, n, w) => { let t = (Math.trunc(num(n)) >>> 0).toString(2); return w ? t.padStart(w, '0') : t; });
  def('SPACE$', 1, 1, (vm, n) => ' '.repeat(Math.max(0, num(n))));
  def('STRING$', 2, 2, (vm, n, c) => (typeof c === 'string' ? c.charAt(0) : String.fromCodePoint(num(c))).repeat(Math.max(0, num(n))), 'n88');
  def('RPT$', 2, 2, (vm, s, n) => str(s).repeat(Math.max(0, num(n))), 'full');
  def('LTRIM$', 1, 1, (vm, s) => str(s).replace(/^[ 　]+/, ''), 'full');
  def('RTRIM$', 1, 1, (vm, s) => str(s).replace(/[ 　]+$/, ''), 'full');
  def('UCASE$', 1, 1, (vm, s) => str(s).toUpperCase(), 'full');
  def('LCASE$', 1, 1, (vm, s) => str(s).toLowerCase(), 'full');
  def('INSTR', 2, 3, (vm, a, b, c) => {
    if (typeof a === 'number') { // INSTR(start, s, t)
      const r = str(b).indexOf(str(c), vm.D.id === 'smile' ? a : a - 1);
      return vm.D.id === 'smile' ? r : r + 1;
    }
    const r = str(a).indexOf(str(b));
    return vm.D.id === 'smile' ? r : r + 1;
  }, 'n88,smile');
  def('POS', 0, 3, (vm, a, b, c) => {
    if (vm.D.id === 'n88') return vm.screen.cx + 1;
    if (typeof a !== 'string') throw typeErr();
    return a.indexOf(str(b), c ? c - 1 : 0) + 1;
  }, 'n88,full');
  def('SUBST$', 4, 4, (vm, s, p, l, r) => str(s).slice(0, num(p)) + str(r) + s.slice(p + num(l)), 'smile');
  def('FORMAT$', 1, 99, (vm, f, ...a) => {
    let k = 0;
    return str(f).replace(/%(-?)(0?)(\d*)(?:\.(\d+))?([dfsxXc%])/g, (m, left, zero, w, prec, t) => {
      if (t === '%') return '%';
      const v = a[k++];
      let r;
      if (t === 'd') r = String(Math.trunc(num(v)));
      else if (t === 'f') r = num(v).toFixed(prec === undefined ? 6 : +prec);
      else if (t === 's') r = String(v);
      else if (t === 'c') r = String.fromCodePoint(num(v));
      else r = (Math.trunc(num(v)) >>> 0).toString(16); if (t === 'X') r = r.toUpperCase();
      w = +w || 0;
      return left ? r.padEnd(w) : r.padStart(w, zero && t !== 's' ? '0' : ' ');
    });
  }, 'smile');
  def('TAB', 1, 1, (vm, n) => ({ tab: Math.trunc(num(n)) }), STD);
  def('SPC', 1, 1, (vm, n) => ({ spc: Math.trunc(num(n)) }), 'n88');
  def('INKEY$', 0, 0, (vm) => vm.env.inkey() || '', 'n88,smile');
  def('CSRLIN', 0, 0, (vm) => vm.screen.cy + 1, 'n88');
  def('CSRX', 0, 0, (vm) => vm.screen.cx, 'smile');
  def('CSRY', 0, 0, (vm) => vm.screen.cy, 'smile');
  def('CHKCHR', 2, 2, (vm, x, y) => (vm.screen.charAt(x, y) || ' ').codePointAt(0), 'smile');
  def('ERR', 0, 0, (vm) => vm.errCode, 'n88');
  def('ERL', 0, 0, (vm) => vm.errLine, 'n88');
  def('POINT', 2, 2, (vm, x, y) => {
    const p = vm.mapPoint(num(x), num(y));
    const c = vm.screen.point(p[0], p[1]);
    if (vm.D.id === 'full') return c;
    const i = vm.D.pal.indexOf(c); return i < 0 ? 0 : i;
  }, 'n88');
  def('GSPOIT', 2, 2, (vm, x, y) => { const c = vm.screen.point(num(x), num(y)); return c < 0 ? 0 : (0xff000000 | c) >>> 0; }, 'smile');
  def('RGB', 3, 4, (vm, ...a) => {
    const [r, g, b] = a.length === 4 ? a.slice(1) : a;
    const cl = (v) => Math.max(0, Math.min(255, Math.trunc(num(v))));
    return ((0xff << 24) | (cl(r) << 16) | (cl(g) << 8) | cl(b)) >>> 0;
  }, 'smile');
  def('MIX', 3, 3, (vm, r, g, b) => {
    const cl = (v) => Math.max(0, Math.min(255, Math.round(num(v) * 255)));
    return (cl(r) << 16) | (cl(g) << 8) | cl(b);
  }, 'full');
  def('BUTTON', 0, 2, (vm) => vm.env.buttons(), 'smile');
  const spr = (vm) => { if (!vm.screen.spr) throw E('この環境ではスプライトを使えません', 5); return vm.screen.spr; };
  def('SPUSED', 1, 1, (vm, id) => spr(vm).used(num(id)), 'smile');
  def('SPHITSP', 1, 2, (vm, a, b) => spr(vm).hitsp(num(a), b === undefined ? undefined : num(b)), 'smile');
  def('SPHITRC', 5, 5, (vm, id, x, y, w, h) => spr(vm).hitrc(num(id), num(x), num(y), num(w), num(h)), 'smile');
  def('SPVAR', 2, 2, (vm, id, n) => spr(vm).spvar(num(id), num(n)), 'smile');
  def('BGGET', 3, 3, (vm, l, x, y) => spr(vm).bgget(num(l), num(x), num(y)), 'smile');
  def('LOAD', 1, 1, (vm, name) => vm.fsLoad(str(name)), 'smile');
  def('POP', 1, 1, (vm, a) => { if (!(a instanceof BArray) || !a.data.length) throw illegal(); const v = a.data.pop(); a.sync(); return v; }, 'smile');
  def('SHIFT', 1, 1, (vm, a) => { if (!(a instanceof BArray) || !a.data.length) throw illegal(); const v = a.data.shift(); a.sync(); return v; }, 'smile');

  const COLORS = {
    BLACK: 0x000000, WHITE: 0xffffff, RED: 0xff0000, GREEN: 0x008000, BLUE: 0x0000ff, YELLOW: 0xffff00,
    CYAN: 0x00ffff, MAGENTA: 0xff00ff, GRAY: 0x808080, ORANGE: 0xffa500, PURPLE: 0x800080, PINK: 0xffc0cb,
    LIME: 0x00ff00, NAVY: 0x000080, MAROON: 0x800000, OLIVE: 0x808000, TEAL: 0x008080, SILVER: 0xc0c0c0,
  };
  const SMILE_CONST = { TRUE: 1, FALSE: 0, PI: Math.PI, YES: 1, NO: 0, UP: 1, DOWN: 2, LEFT: 4, RIGHT: 8,
    A: 16, B: 32, X: 64, Y: 128, L: 256, R: 512, START: 2048 };
  for (const k in COLORS) SMILE_CONST[k] = (0xff000000 | COLORS[k]) >>> 0;

  Object.assign(NS, { BasicError, DIALECTS, BArray, fmtNum, numToStr, printNum, usingFormat, tokenize, FN, COLORS, SMILE_CONST, E, typeErr, illegal, PAL8, PAL16 });
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
