/* MACS BASIC Simulator - VM: 命令列の実行・実行時ライブラリ */
(function (root) {
  'use strict';
  const NS = root.MacsBasic;
  const { BasicError, BArray, printNum, usingFormat, FN, COLORS, E, typeErr, illegal, PAL8, PAL16 } = NS;

  class StopSignal extends Error { constructor() { super('stopped'); this.name = 'StopSignal'; } }

  const isThen = (r) => r !== undefined && r !== null && typeof r.then === 'function';

  class VM {
    constructor(prog, env) {
      this.prog = prog; this.D = prog.D; this.env = env; this.screen = env.screen;
      this.code = prog.code; this.routines = prog.routines;
      this.globals = new Map(); this.scope = null; this.mode = '';
      this.callStack = []; this.forStack = []; this.tmp = Object.create(null);
      this.dataPtr = 0; this.pc = 0; this.halted = false; this.reason = '';
      this.retVal = 0; this.lastRnd = 0.5; this.nest = 0;
      this.errHandler = -1; this.errCode = 0; this.errLine = 0; this.inErr = false; this.errPc = 0;
      this.gcolor = this.D.fg; this.win = null; this.lastSync = 0;
      this.t0 = env.now();
      this.seed(env.seed !== undefined ? env.seed : Date.now());
      // 画面の初期化
      const s = this.screen;
      s.color(this.D.fg, -1);
      if (this.D.id === 'smile' && !s.spr && NS.Sprites) NS.Sprites.attach(s);
    }
    // ------------------------------------------------------------ グラフィックページ・フレーム
    setPages(disp, draw) {
      if (disp !== null) { if (!(disp >= 0 && disp <= 5)) throw illegal('ページ番号は 0〜5'); this.screen.dispPage = Math.trunc(disp); this.screen.dirtyG = true; }
      if (draw !== null) { if (!(draw >= 0 && draw <= 5)) throw illegal('ページ番号は 0〜5'); this.screen.usePage(Math.trunc(draw)); }
    }
    advance(frames) { if (this.env.tickOnVsync && this.screen.spr) this.screen.spr.tick(frames); }
    // ------------------------------------------------------------ ファイル (TXT:名前 / DAT:名前)
    fsKey(name) {
      if (typeof name !== 'string') throw typeErr();
      const m = /^(TXT|DAT):([A-Za-z0-9_.\-]{1,32})$/i.exec(name.trim());
      if (!m) throw illegal('ファイル名は "TXT:名前" または "DAT:名前" の形です');
      return m[1].toUpperCase() + ':' + m[2].toUpperCase();
    }
    fsEnv() { if (!this.env.fs) throw E('この環境ではファイルを使えません', 5); return this.env.fs; }
    fsSave(name, data) {
      const key = this.fsKey(name);
      let rec;
      if (key.startsWith('TXT:')) { if (typeof data !== 'string') throw typeErr(); rec = { t: 'TXT', d: data }; }
      else {
        if (!(data instanceof BArray)) throw typeErr();
        rec = { t: 'DAT', lo: data.lo, hi: data.hi, def: data.def, d: data.data };
      }
      try { this.fsEnv().set(key, JSON.stringify(rec)); } catch (e) { if (e instanceof BasicError) throw e; throw E('ファイルを保存できません (容量オーバーか、保存が許可されていません)', 70); }
    }
    fsLoad(name) {
      const key = this.fsKey(name);
      const raw = this.fsEnv().get(key);
      if (raw === null || raw === undefined) throw E(`ファイルが見つかりません: ${key} (Load failed)`, 53);
      const rec = JSON.parse(raw);
      if (rec.t === 'TXT') return rec.d;
      const a = new BArray(rec.lo, rec.hi, rec.def);
      a.data = rec.d;
      return a;
    }
    fsDelete(name) {
      const key = this.fsKey(name), fs = this.fsEnv();
      if (fs.get(key) === null || fs.get(key) === undefined) throw E(`ファイルが見つかりません: ${key}`, 53);
      fs.del(key);
    }
    fsRename(a, b) {
      const ka = this.fsKey(a), kb = this.fsKey(b), fs = this.fsEnv();
      const raw = fs.get(ka);
      if (raw === null || raw === undefined) throw E(`ファイルが見つかりません: ${ka}`, 53);
      if (ka.slice(0, 3) !== kb.slice(0, 3)) throw illegal('種類(TXT/DAT)は変えられません');
      if (fs.get(kb) !== null && fs.get(kb) !== undefined) throw E(`同じ名前のファイルがあります: ${kb}`, 58);
      fs.set(kb, raw); fs.del(ka);
    }
    fsList() { return this.fsEnv().list().sort(); }
    // ------------------------------------------------------------ 乱数
    seed(s) { this.rs = (Math.floor(Math.abs(s) * 997) ^ 0x9e3779b9) >>> 0; this.lastRnd = this.rand(); }
    rand() {
      let t = (this.rs = (this.rs + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    // ------------------------------------------------------------ 変数
    getVar(name, dv) {
      const s = this.scope;
      if (s !== null) {
        const v = s.get(name);
        if (v !== undefined) return v;
        if (this.mode === 'iso') return dv;
      }
      const g = this.globals.get(name);
      return g === undefined ? dv : g;
    }
    setVar(name, v) {
      const s = this.scope;
      if (s !== null && (this.mode !== 'ov' || s.has(name))) s.set(name, v);
      else this.globals.set(name, v);
    }
    hasVar(key) {
      const s = this.scope;
      if (s !== null && s.has(key)) return true;
      if (s !== null && this.mode === 'iso') return false;
      return this.globals.has(key);
    }
    getVarRaw(key, name) {
      const s = this.scope;
      let v;
      if (s !== null) { v = s.get(key); if (v === undefined && this.mode !== 'iso') v = this.globals.get(key); }
      else v = this.globals.get(key);
      if (v === undefined) {
        if (name[name.length - 1] === '$') return '';
        throw E(`変数 ${name} が定義されていません (Undefined variable)`, 5);
      }
      return v;
    }
    getArr(key, nd) {
      const s = this.scope;
      let v;
      if (s !== null) { v = s.get(key); if (v === undefined && this.mode !== 'iso') v = this.globals.get(key); }
      else v = this.globals.get(key);
      if (v === undefined) {
        if (this.D.id === 'smile') throw E('配列が定義されていません (DIM が必要です)', 5);
        const lo = [], hi = [];
        for (let i = 0; i < nd; i++) { lo.push(0); hi.push(key === '@()' ? 1023 : 10); }
        const base = key.replace('()', '');
        v = new BArray(lo, hi, base[base.length - 1] === '$' ? '' : 0);
        (s !== null && this.mode !== 'ov' ? s : this.globals).set(key, v);
      }
      if (!(v instanceof BArray)) throw typeErr();
      return v;
    }
    declare(key, arr, dupErr) {
      const st = this.scope !== null && this.mode !== 'ov' ? this.scope : this.globals;
      if (dupErr && st.has(key)) throw E('配列が二重に定義されています (Duplicate Definition)', 10);
      st.set(key, arr);
    }
    declareVar(name, v) { (this.scope !== null && this.mode !== 'ov' ? this.scope : this.globals).set(name, v); }
    eraseVar(key) { (this.scope !== null && this.mode !== 'ov' ? this.scope : this.globals).delete(key); }
    clearVars() { this.globals.clear(); this.forStack.length = 0; }
    indexChain(base, chain) {
      let v = base;
      for (const lvl of chain) {
        const ix = lvl.map((f) => f(this));
        if (v instanceof BArray) v = v.get(ix);
        else if (typeof v === 'string') {
          const i = Math.trunc(ix[0]);
          if (!(i >= 0 && i < v.length)) throw E('添字が範囲外です (Subscript out of range)', 9);
          v = v[i];
        } else throw typeErr();
      }
      return v;
    }
    lookup(v) {
      if (typeof v === 'number') {
        const pc = this.prog.lineMap.get(v);
        if (pc === undefined) throw E(`未定義の行番号です: ${v} (Undefined line number)`, 8);
        return pc;
      }
      let k = String(v).toUpperCase();
      if (k[0] !== '@') k = '@' + k;
      const pc = this.prog.labels.get(k);
      if (pc === undefined) throw E(`未定義のラベルです: ${v}`, 8);
      return pc;
    }

    // ------------------------------------------------------------ 呼び出し
    enter(r, args, ret, lvs) {
      const D = this.D;
      if (r.params.length !== args.length) {
        if (D.id === 'smile') { while (args.length < r.params.length) args.push(undefined); args.length = r.params.length; }
        else throw E(`引数の数が合いません: ${r.name} (${r.params.length}個必要)`, 5);
      }
      const scope = new Map();
      const wb = [];
      r.params.forEach((p, i) => {
        let v = args[i];
        const isStr = p.name[p.name.length - 1] === '$';
        if (v === undefined) v = isStr ? '' : 0;
        if (v instanceof BArray) scope.set(D.brackets ? p.name : p.name + '()', v);
        else {
          if ((typeof v === 'string') !== isStr) throw typeErr();
          scope.set(p.name, v);
          if (lvs && lvs[i] && r.kind === 'sub') wb.push([p.name, lvs[i]]);
        }
      });
      this.callStack.push({ k: 'c', ret, scope: this.scope, mode: this.mode, r, wb });
      this.scope = scope; this.mode = r.mode; this.pc = r.addr; this.retVal = 0;
      if (this.callStack.length > 3000) throw E('呼び出しが深すぎます (Out of memory)', 7);
    }
    finishCall() {
      const f = this.callStack.pop();
      if (!f || f.k !== 'c') throw E('SUB/FUNCTION/DEF の外では使えません', 3);
      const scope = this.scope;
      if (f.r.kind === 'function') {
        const v = scope.get(f.r.name);
        this.retVal = v === undefined ? (f.r.name[f.r.name.length - 1] === '$' ? '' : 0) : v;
      }
      this.scope = f.scope; this.mode = f.mode; this.pc = f.ret;
      for (const [pn, lv] of f.wb) { const v = scope.get(pn); if (v !== undefined) lv.set(this, v); }
    }
    doReturn() {
      const f = this.callStack.pop();
      if (!f) throw E('RETURN に対応する GOSUB がありません (RETURN without GOSUB)', 3);
      if (f.k === 'g') this.pc = f.ret;
      else { this.callStack.push(f); this.finishCall(); }
    }
    findRoutine(name) {
      const r = this.routines.get(name);
      if (!r) throw E(`${name} は定義されていません (SUB / FUNCTION / DEF が見つかりません)`, 5);
      return r;
    }
    callFn(r, args) {
      if (r.kind === 'expr') {
        if (args.length !== r.params.length) throw E(`引数の数が合いません: ${r.name}`, 5);
        const scope = new Map();
        r.params.forEach((p, i) => {
          if ((typeof args[i] === 'string') !== (p.name[p.name.length - 1] === '$')) throw typeErr();
          scope.set(p.name, args[i]);
        });
        const ps = this.scope, pm = this.mode;
        this.scope = scope; this.mode = r.mode;
        if (this.nest > 400) throw E('関数の呼び出しが深すぎます (スタックがあふれました)', 7);
        this.nest++;
        try { return r.expr(this); } finally { this.scope = ps; this.mode = pm; this.nest--; }
      }
      const base = this.callStack.length;
      if (this.nest > 400) throw E('関数の呼び出しが深すぎます (スタックがあふれました)', 7);
      this.enter(r, args, this.pc, null);
      this.nest++;
      try {
      while (this.callStack.length > base) {
        if (this.halted) throw new StopSignal();
        const res = this.code[this.pc++](this);
        if (isThen(res)) throw E('関数の中では入力や待機の命令は使えません (CALL/呼び出し文で使ってください)', 5);
      }
      } finally { this.nest--; }
      return this.retVal;
    }
    callNamed(name, args) { return this.callFn(this.findRoutine(name), args); }
    callStmt(name, args, lvs) {
      const r = this.findRoutine(name);
      if (r.kind === 'expr') { this.callFn(r, args); return; }
      this.enter(r, args, this.pc, lvs);
    }

    // ------------------------------------------------------------ PRINT / INPUT
    tabZone() {
      const scr = this.screen, z = this.D.zone;
      const next = (Math.floor(scr.cx / z) + 1) * z;
      if (next >= scr.cols) scr.newline(); else scr.write(' '.repeat(next - scr.cx));
    }
    doPrint(items, using) {
      const scr = this.screen;
      if (using) {
        const f = using(this);
        if (typeof f !== 'string') throw typeErr();
        const vals = [];
        for (const it of items) if (it.e) vals.push(it.e(this));
        scr.write(usingFormat(f, vals));
        const last = items[items.length - 1];
        if (!(last && last.sep === ';')) scr.newline();
        return;
      }
      let nl = true;
      for (const it of items) {
        if (it.sep) { if (it.sep === ',') this.tabZone(); nl = false; continue; }
        nl = true;
        const v = it.e(this);
        if (typeof v === 'number') scr.write(printNum(this, v));
        else if (typeof v === 'string') scr.write(v);
        else if (v && v.tab !== undefined) { const t = v.tab - 1; if (t > scr.cx) scr.write(' '.repeat(Math.min(t, scr.cols) - scr.cx)); }
        else if (v && v.spc !== undefined) scr.write(' '.repeat(Math.max(0, v.spc)));
        else throw typeErr();
      }
      if (nl) scr.newline();
    }
    async doInput(prompt, lvs, isLine) {
      const scr = this.screen, D = this.D;
      let pr = prompt;
      for (;;) {
        scr.write(pr);
        scr.cursorOn = true;
        let raw;
        try { raw = await this.env.input(); } finally { scr.cursorOn = false; }
        scr.write(raw + '\n');
        if (isLine) { lvs[0].set(this, raw); return; }
        const parts = splitInput(raw);
        if (parts.length < lvs.length && !(parts.length === 1 && parts[0] === '' && lvs.length === 1)) {
          if (parts.length < lvs.length) { scr.write('??再入力してください (Redo from start)\n'); pr = prompt; continue; }
        }
        const vals = [];
        let ok = parts.length >= lvs.length;
        for (let i = 0; i < lvs.length && ok; i++) {
          const s = parts[i];
          if (lvs[i].isStr) vals.push(s);
          else {
            const t = s.trim();
            const re = D.intOnly ? /^[+-]?\d+$/ : /^[+-]?(\d+\.?\d*|\.\d+)([eEdD][+-]?\d+)?$/;
            if (re.test(t)) vals.push(parseFloat(t.replace(/[dD]/, 'e')));
            else if (/^&H[0-9A-Fa-f]+$/i.test(t) && !D.intOnly) vals.push(parseInt(t.slice(2), 16));
            else ok = false;
          }
        }
        if (!ok) { scr.write('?再入力してください (Redo from start)\n'); pr = prompt; continue; }
        lvs.forEach((lv, i) => lv.set(this, vals[i]));
        return;
      }
    }
    doResume(kind, pc) {
      if (!this.inErr) throw E('RESUME に対応するエラーがありません (RESUME without error)', 20);
      this.inErr = false;
      if (kind === 'retry') this.pc = this.errPc;
      else if (kind === 'next') this.pc = this.errPc + 1;
      else this.pc = pc;
    }

    // ------------------------------------------------------------ 時間・音
    vsync(n) {
      this.advance(n);
      const now = this.env.now();
      const target = (this.lastSync || now) + n * 1000 / 60;
      const wait = Math.max(0, target - now);
      this.lastSync = wait > 0 ? target : now;
      return this.env.sleep(wait);
    }
    doPlay(mml) {
      if (!this.env.tone) return;
      let oct = 4, len = 4, tempo = 120, i = 0;
      const s = mml.toUpperCase().replace(/\s+/g, '');
      const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
      const num = () => { let st = i; while (i < s.length && s[i] >= '0' && s[i] <= '9') i++; return i > st ? parseInt(s.slice(st, i), 10) : null; };
      const dots = (ms) => { let m = ms, add = ms; while (s[i] === '.') { add /= 2; m += add; i++; } return m; };
      while (i < s.length) {
        const c = s[i++];
        if (c === 'O') { const n = num(); if (n !== null) oct = n; }
        else if (c === '<') oct--;
        else if (c === '>') oct++;
        else if (c === 'L') { const n = num(); if (n) len = n; }
        else if (c === 'T') { const n = num(); if (n) tempo = n; }
        else if (c === 'R') { const n = num() || len; this.env.tone(0, dots((60000 / tempo) * 4 / n)); }
        else if (base[c] !== undefined) {
          let semi = base[c];
          if (s[i] === '#' || s[i] === '+') { semi++; i++; } else if (s[i] === '-') { semi--; i++; }
          const n = num() || len;
          const f = 261.63 * Math.pow(2, (semi + (oct - 4) * 12) / 12);
          this.env.tone(f, dots((60000 / tempo) * 4 / n));
        }
      }
    }

    // ------------------------------------------------------------ 色・座標
    toRGB(c) {
      const D = this.D;
      if (typeof c === 'string') {
        const k = COLORS[c.toUpperCase()];
        if (k === undefined) throw illegal('未知の色名: ' + c);
        return k;
      }
      if (typeof c !== 'number') throw typeErr();
      if (D.id === 'smile') {
        if (Number.isInteger(c) && c >= 0 && c <= 15) { const v = PAL16[c]; return v < 0 ? D.bg : v; }
        return c & 0xffffff;
      }
      if (D.id === 'full') return Number.isInteger(c) && c >= 0 && c < 8 ? PAL8[c] : c & 0xffffff;
      return PAL8[Math.trunc(c) & 7];
    }
    setTextColor(f, b) {
      const D = this.D, s = this.screen;
      if (D.id === 'full') return;
      if (D.id === 'smile') {
        if (f !== null && f !== 0) s.color(this.toRGB(f), undefined);
        if (b !== null) s.color(undefined, b === 0 ? -1 : this.toRGB(b));
        return;
      }
      if (f !== null) { const c = this.toRGB(f); s.color(c, undefined); this.gcolor = c; }
      if (b !== null) s.color(undefined, this.toRGB(b) === D.bg ? -1 : this.toRGB(b));
    }
    setWindow(l, r, b, t) {
      if (l === r || b === t) throw illegal('SET WINDOW の範囲が不正です');
      this.win = { l, r, b, t };
    }
    mapPoint(x, y) {
      if (this.D.id !== 'full') return [x, y];
      const w = this.win || { l: 0, r: 1, b: 0, t: 1 };
      return [(x - w.l) / (w.r - w.l) * this.screen.gw, (w.t - y) / (w.t - w.b) * this.screen.gh];
    }
    gPoint(x, y, rgb) { const p = this.mapPoint(x, y); this.screen.pset(p[0], p[1], rgb); }
    gLine(x1, y1, x2, y2, rgb, style) {
      const a = this.mapPoint(x1, y1), b = this.mapPoint(x2, y2);
      if (style === 0) this.screen.line(a[0], a[1], b[0], b[1], rgb);
      else this.screen.box(a[0], a[1], b[0], b[1], rgb, style === 2);
    }
    gCircle(x, y, r, rgb, a0, a1, aspect, flag) {
      const p = this.mapPoint(x, y);
      let rx = r, ry = r;
      if (aspect !== null && aspect !== undefined && aspect !== 1) { if (aspect < 1) ry = r * aspect; else rx = r / aspect; }
      if (a0 !== null && a0 !== undefined) {
        let s = a0, e = a1 === null || a1 === undefined ? Math.PI * 2 : a1;
        const l0 = s < 0, l1 = e < 0;
        s = Math.abs(s); e = Math.abs(e);
        if (e < s) e += Math.PI * 2;
        this.screen.arc(p[0], p[1], rx, ry, s, e, rgb);
        if (l0 || flag) this.screen.line(p[0], p[1], p[0] + rx * Math.cos(s), p[1] - ry * Math.sin(s), rgb);
        if (l1 || flag) this.screen.line(p[0], p[1], p[0] + rx * Math.cos(e), p[1] - ry * Math.sin(e), rgb);
      } else this.screen.ellipse(p[0], p[1], rx, ry, rgb, false);
    }
    gPaint(x, y, rgb, border) { const p = this.mapPoint(x, y); this.screen.paint(p[0], p[1], rgb, border); }
    gPolygon(P, rgb) { this.screen.polygon(P.map((q) => this.mapPoint(q[0], q[1])), rgb); }
    gBox(kind, x1, y1, x2, y2) {
      const a = this.mapPoint(x1, y1), b = this.mapPoint(x2, y2), s = this.screen, c = this.gcolor;
      if (kind === 'LINES') s.box(a[0], a[1], b[0], b[1], c, false);
      else if (kind === 'AREA') s.box(a[0], a[1], b[0], b[1], c, true);
      else s.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2, c, kind === 'DISK');
    }
    gText(x, y, str) {
      const p = this.mapPoint(x, y);
      this.screen.gtext(p[0], p[1], str, this.gcolor, this.D.id === 'smile' ? 8 : 14);
    }

    // ------------------------------------------------------------ 実行
    stop() { this.halted = true; this.reason = 'user'; this.stopped = true; if (this.env.abort) this.env.abort(); }
    async run() {
      const code = this.code, env = this.env, info = this.prog.info;
      let steps = 0, slice = env.now();
      for (;;) {
        try {
          while (!this.halted) {
            const r = code[this.pc++](this);
            if (isThen(r)) await r;
            if ((++steps & 1023) === 0) {
              const t = env.now();
              if (t - slice > 12) { await env.yield(); slice = env.now(); }
            }
          }
          break;
        } catch (e) {
          if (e instanceof RangeError) { e = new BasicError('呼び出しが深すぎます (スタックオーバーフロー)', 7); }
          if (this.stopped || e instanceof StopSignal) { this.reason = 'user'; break; }
          if (e instanceof BasicError) {
            const inf = info[Math.max(0, this.pc - 1)];
            if (e.line === undefined && inf) { e.line = inf.line; e.srcLine = inf.src; }
            if (this.errHandler >= 0 && !this.inErr) {
              this.errCode = e.code; this.errLine = e.line || 0; this.errPc = this.pc - 1; this.inErr = true;
              this.scope = null; this.mode = ''; this.pc = this.errHandler;
              continue;
            }
          }
          throw e;
        }
      }
      return this.reason;
    }
  }

  function splitInput(raw) {
    const out = [];
    let i = 0, cur = '', q = false, quoted = false;
    for (; i < raw.length; i++) {
      const c = raw[i];
      if (c === '"') { q = !q; quoted = true; continue; }
      if (c === ',' && !q) { out.push(quoted ? cur : cur.trim()); cur = ''; quoted = false; continue; }
      cur += c;
    }
    out.push(quoted ? cur : cur.trim());
    return out;
  }

  function memoryFs() {
    const m = new Map();
    return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => { m.set(k, v); }, del: (k) => { m.delete(k); }, list: () => [...m.keys()] };
  }
  // 簡易環境(テスト・既定値)
  function makeEnv(screen, o) {
    o = o || {};
    const inputs = (o.inputs || []).slice();
    const keys = (o.keys || []).slice();
    return Object.assign({
      screen, seed: o.seed === undefined ? 12345 : o.seed,
      now: () => Date.now(),
      sleep: () => new Promise((r) => setTimeout(r, 0)),
      yield: () => new Promise((r) => setTimeout(r, 0)),
      input: () => Promise.resolve(inputs.length ? inputs.shift() : ''),
      inkey: () => (keys.length ? keys.shift() : ''),
      buttons: () => 0, stick: () => [0, 0], touch: () => [0, 0, 0],
      tone: null, abort: null, tickOnVsync: true, fs: memoryFs(),
    }, o.env || {});
  }

  NS.createScreen = (id) => {
    const D = NS.DIALECTS[id];
    return new NS.Screen({ cols: D.cols, rows: D.rows, gw: D.gw, gh: D.gh, bg: D.bg, fg: D.fg, transparent: !!D.transparent });
  };
  NS.memoryFs = memoryFs;
  NS.VM = VM; NS.StopSignal = StopSignal; NS.makeEnv = makeEnv;
  NS.run = function (src, dialectId, env) {
    const prog = NS.compile(src, dialectId);
    const vm = new VM(prog, env);
    return { vm, promise: vm.run() };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
