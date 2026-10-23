/* MACS BASIC Simulator - compiler: ソース → 命令列(クロージャ) */
(function (root) {
  'use strict';
  const NS = root.MacsBasic;
  const { BasicError, DIALECTS, BArray, tokenize, FN, SMILE_CONST, E, typeErr, illegal } = NS;

  const ovf = () => E('オーバーフロー (Overflow)', 6);
  const div0 = () => E('0で割りました (Division by zero)', 11);
  const ck16 = (v) => { if (v > 32767 || v < -32767) throw ovf(); return v; };
  const nm = (x) => { if (typeof x !== 'number') throw typeErr(); return x; };
  const fin = (v) => { if (!isFinite(v)) throw ovf(); return v; };

  // どの方言のキーワードか(エラーメッセージ用)
  const KW_OWNERS = {};
  for (const d of Object.values(DIALECTS)) for (const w of d.kw) (KW_OWNERS[w] = KW_OWNERS[w] || []).push(d.label);

  const CLOSERS = new Set(['IF', 'SELECT', 'SUB', 'FUNCTION', 'DEF', 'SWITCH', 'PROGRAM']);

  class Compiler {
    constructor(D) {
      this.D = D;
      this.code = []; this.info = [];
      this.lineMap = new Map(); this.labels = new Map(); this.routines = new Map();
      this.data = []; this.dataAt = new Map();
      this.blocks = []; this.fix = [];
      this.deftype = {}; this.base = 0; this.selId = 0; this.inline = 0;
      this.cur = { line: 0, src: 0 };
    }
    // ---------------------------------------------------------- utilities
    err(msg, code) { throw new BasicError(msg, code || 2, this.cur.line, this.cur.src); }
    syntax(msg) { this.err('構文エラー (Syntax error)' + (msg ? ': ' + msg : ''), 2); }
    peek(k) { return this.toks[this.p + (k || 0)]; }
    next() { return this.toks[this.p++]; }
    isOp(v, k) { const t = this.toks[this.p + (k || 0)]; return t.t === 'op' && t.v === v; }
    isId(v, k) { const t = this.toks[this.p + (k || 0)]; return t.t === 'id' && t.v === v; }
    eatOp(v) { if (this.isOp(v)) { this.p++; return true; } return false; }
    eatId(v) { if (this.isId(v)) { this.p++; return true; } return false; }
    expectOp(v) { if (!this.eatOp(v)) this.syntax(`'${v}' が必要です`); }
    expectId(v) { if (!this.eatId(v)) this.syntax(`${v} が必要です`); }
    emit(fn) { this.code.push(fn); this.info.push(this.cur); return this.code.length - 1; }
    ref() { return { pc: -1 }; }
    here(r) { r.pc = this.code.length; }
    jump(r) { return this.emit((vm) => { vm.pc = r.pc; }); }
    jumpIfFalse(cond, r) { return this.emit((vm) => { if (!cond(vm)) vm.pc = r.pc; }); }
    atEnd() {
      const t = this.peek();
      return t.t === 'eof' || (t.t === 'id' && t.v === 'REM') || (t.t === 'op' && t.v === ':' && this.D.colon) || (t.t === 'id' && t.v === 'ELSE' && this.inline > 0);
    }
    endStmt() { if (!this.atEnd()) this.syntax('文の終わりに余分なものがあります'); }
    findBlock(types) {
      for (let i = this.blocks.length - 1; i >= 0; i--) if (types.indexOf(this.blocks[i].type) >= 0) return this.blocks[i];
      return null;
    }
    topBlock(type, what) {
      const b = this.blocks[this.blocks.length - 1];
      if (!b || b.type !== type) this.err(what + ' に対応する開始文がありません', 2);
      return b;
    }
    typeOf(name) {
      const l = name[name.length - 1];
      if (l === '$') return 'str';
      if (l === '%') return 'int';
      if (l === '!' || l === '#') return 'num';
      if (this.D.id === 'n88') return this.deftype[name[0]] || 'num';
      return 'num';
    }
    coercer(name) {
      const D = this.D, ty = this.typeOf(name);
      if (ty === 'str') return (v) => { if (typeof v !== 'string') throw typeErr(); return v; };
      if (D.intOnly) return (v) => { if (typeof v !== 'number') throw typeErr(); return v; };
      if (ty === 'int') return (v) => { if (typeof v !== 'number') throw typeErr(); const r = Math.round(v); if (r > 32767 || r < -32768) throw ovf(); return r; };
      if (D.id === 'smile') return (v) => { if (typeof v === 'number') return v; if (v instanceof BArray) return v.clone(); throw typeErr(); };
      return (v) => { if (typeof v !== 'number') throw typeErr(); return v; };
    }
    defaultOf(name) { return this.typeOf(name) === 'str' ? '' : 0; }
    arrKey(name) { return this.D.brackets ? name : name + '()'; }
    checkName(name) {
      if (this.D.id === 'tiny' && !/^[A-Z]$/.test(name)) this.err(`Tiny BASICの変数名は A〜Z の1文字です (${name})`, 2);
    }

    // ---------------------------------------------------------- 式
    expr() { return this.orExpr(); }
    cond() {
      const e = this.expr();
      return (vm) => { const v = e(vm); if (typeof v !== 'number') throw typeErr(); return v; };
    }
    isBinId(t, names) { return t.t === 'id' && names.indexOf(t.v) >= 0 && this.D.id !== 'tiny'; }
    orExpr() {
      let l = this.andExpr();
      for (;;) {
        const t = this.peek();
        if (this.isBinId(t, ['OR', 'XOR', 'EQV', 'IMP']) || (t.t === 'op' && t.v === '||')) {
          this.p++;
          const r = this.andExpr(), a = l;
          const f = t.v === 'XOR' ? (x, y) => nm(x) ^ nm(y)
            : t.v === 'EQV' ? (x, y) => ~(nm(x) ^ nm(y))
            : t.v === 'IMP' ? (x, y) => ~nm(x) | nm(y)
            : t.v === '||' ? (x, y) => (nm(x) || nm(y) ? 1 : 0)
            : (x, y) => nm(x) | nm(y);
          l = (vm) => f(a(vm), r(vm));
        } else return l;
      }
    }
    andExpr() {
      let l = this.notExpr();
      for (;;) {
        const t = this.peek();
        if (this.isBinId(t, ['AND']) || (t.t === 'op' && t.v === '&&')) {
          this.p++;
          const r = this.notExpr(), a = l;
          const f = t.v === '&&' ? (x, y) => (nm(x) && nm(y) ? 1 : 0) : (x, y) => nm(x) & nm(y);
          l = (vm) => f(a(vm), r(vm));
        } else return l;
      }
    }
    notExpr() {
      if (this.isBinId(this.peek(), ['NOT'])) {
        this.p++;
        const e = this.notExpr();
        return this.D.id === 'n88' ? (vm) => ~nm(e(vm)) : (vm) => (nm(e(vm)) ? 0 : 1);
      }
      return this.cmpExpr();
    }
    cmpExpr() {
      let l = this.shiftExpr();
      const T = this.D.trueVal;
      for (;;) {
        const t = this.peek();
        if (t.t !== 'op' || ['=', '==', '<>', '!=', '><', '<', '>', '<=', '>=', '=<', '=>'].indexOf(t.v) < 0) return l;
        this.p++;
        const r = this.shiftExpr(), a = l;
        const chk = (x, y) => { if (typeof x !== typeof y) throw typeErr(); };
        let f;
        switch (t.v) {
          case '=': case '==': f = (x, y) => { chk(x, y); return x === y ? T : 0; }; break;
          case '<>': case '!=': case '><': f = (x, y) => { chk(x, y); return x !== y ? T : 0; }; break;
          case '<': f = (x, y) => { chk(x, y); return x < y ? T : 0; }; break;
          case '>': f = (x, y) => { chk(x, y); return x > y ? T : 0; }; break;
          case '<=': case '=<': f = (x, y) => { chk(x, y); return x <= y ? T : 0; }; break;
          default: f = (x, y) => { chk(x, y); return x >= y ? T : 0; };
        }
        l = (vm) => f(a(vm), r(vm));
      }
    }
    shiftExpr() {
      let l = this.addExpr();
      for (;;) {
        const t = this.peek();
        if (t.t === 'op' && (t.v === '<<' || t.v === '>>')) {
          this.p++;
          const r = this.addExpr(), a = l;
          l = t.v === '<<' ? (vm) => nm(a(vm)) << nm(r(vm)) : (vm) => nm(a(vm)) >> nm(r(vm));
        } else return l;
      }
    }
    addExpr() {
      let l = this.modExpr();
      const ints = this.D.intOnly;
      for (;;) {
        const t = this.peek();
        if (t.t !== 'op' || (t.v !== '+' && t.v !== '-' && !(t.v === '&' && this.D.id === 'full'))) return l;
        this.p++;
        const r = this.modExpr(), a = l;
        if (t.v === '+') {
          l = (vm) => {
            const x = a(vm), y = r(vm);
            if (typeof x === 'number' && typeof y === 'number') return ints ? ck16(x + y) : x + y;
            if (typeof x === 'string' && typeof y === 'string') return x + y;
            throw typeErr();
          };
        } else if (t.v === '&') {
          l = (vm) => { const x = a(vm), y = r(vm); if (typeof x !== 'string' || typeof y !== 'string') throw typeErr(); return x + y; };
        } else l = ints ? (vm) => ck16(nm(a(vm)) - nm(r(vm))) : (vm) => nm(a(vm)) - nm(r(vm));
      }
    }
    modExpr() {
      let l = this.idivExpr();
      for (;;) {
        const t = this.peek();
        if (this.isBinId(t, ['MOD']) || (t.t === 'op' && t.v === '%' && this.D.id === 'smile')) {
          this.p++;
          const r = this.idivExpr(), a = l, n88 = this.D.id === 'n88';
          l = (vm) => {
            let x = nm(a(vm)), y = nm(r(vm));
            if (n88) { x = Math.round(x); y = Math.round(y); } else { x = Math.trunc(x); y = Math.trunc(y); }
            if (y === 0) throw div0();
            return x % y;
          };
        } else return l;
      }
    }
    idivExpr() {
      let l = this.mulExpr();
      for (;;) {
        const t = this.peek();
        if ((t.t === 'op' && t.v === '\\') || (this.D.id === 'smile' && this.isId('DIV'))) {
          this.p++;
          const r = this.mulExpr(), a = l;
          l = (vm) => { const x = Math.trunc(nm(a(vm))), y = Math.trunc(nm(r(vm))); if (y === 0) throw div0(); return Math.trunc(x / y); };
        } else return l;
      }
    }
    mulExpr() {
      let l = this.unary();
      const ints = this.D.intOnly;
      for (;;) {
        const t = this.peek();
        if (t.t !== 'op' || (t.v !== '*' && t.v !== '/')) return l;
        this.p++;
        const r = this.unary(), a = l;
        if (t.v === '*') l = ints ? (vm) => ck16(nm(a(vm)) * nm(r(vm))) : (vm) => fin(nm(a(vm)) * nm(r(vm)));
        else l = (vm) => {
          const x = nm(a(vm)), y = nm(r(vm));
          if (y === 0) throw div0();
          return ints ? Math.trunc(x / y) : x / y;
        };
      }
    }
    unary() {
      const t = this.peek();
      if (t.t === 'op' && t.v === '-') { this.p++; const e = this.unary(); return (vm) => -nm(e(vm)); }
      if (t.t === 'op' && t.v === '+') { this.p++; return this.unary(); }
      if (t.t === 'op' && t.v === '!' && this.D.id === 'smile') { this.p++; const e = this.unary(); return (vm) => (nm(e(vm)) ? 0 : 1); }
      return this.power();
    }
    power() {
      const b = this.primary();
      if (this.isOp('^')) {
        this.p++;
        const e = this.unary(), ints = this.D.intOnly;
        return (vm) => {
          const x = nm(b(vm)), y = nm(e(vm));
          const r = Math.pow(x, y);
          if (Number.isNaN(r)) throw illegal();
          return ints ? ck16(r) : fin(r);
        };
      }
      return b;
    }
    argList(close) {
      const args = [];
      if (this.eatOp(close)) return args;
      for (;;) {
        args.push(this.expr());
        if (this.eatOp(',')) continue;
        this.expectOp(close);
        return args;
      }
    }
    primary() {
      const t = this.next(), D = this.D;
      if (t.t === 'num') { const v = t.v; return () => v; }
      if (t.t === 'str') { const v = t.v; return () => v; }
      if (t.t === 'op') {
        if (t.v === '(') { const e = this.expr(); this.expectOp(')'); return e; }
        if (t.v === '[' && D.brackets) {
          const items = this.argList(']');
          return (vm) => {
            const d = items.map((f) => f(vm));
            const a = new BArray([0], [d.length - 1], 0); a.data = d; a.dims = [d.length]; return a;
          };
        }
        if (t.v === '@' && D.id === 'tiny') {
          this.expectOp('('); const ix = this.expr(); this.expectOp(')');
          return (vm) => vm.getArr('@()', 1).get([nm(ix(vm))]);
        }
      }
      if (t.t === 'id') return this.primaryId(t);
      this.p--;
      this.syntax('式が正しくありません');
    }
    primaryId(t) {
      const D = this.D, name = t.v;
      if (name[0] === '#') {
        const v = SMILE_CONST[name.slice(1)];
        if (v === undefined) this.err(`未定義の定数です: ${name}`, 2);
        return () => v;
      }
      const f = FN[name];
      if (f && f.d.indexOf(D.id) >= 0) {
        let args = [];
        if (this.isOp('(')) { this.p++; args = this.argList(')'); }
        else if (f.min > 0) this.syntax(`${name} には引数が必要です`);
        if (args.length < f.min || args.length > f.max) this.err(`${name} の引数の数が正しくありません`, 5);
        const fn = f.fn;
        if (args.length === 0) return (vm) => fn(vm);
        if (args.length === 1) { const a0 = args[0]; return (vm) => fn(vm, a0(vm)); }
        if (args.length === 2) { const a0 = args[0], a1 = args[1]; return (vm) => fn(vm, a0(vm), a1(vm)); }
        return (vm) => fn(vm, ...args.map((a) => a(vm)));
      }
      this.checkName(name);
      const open = D.brackets ? this.isOp('[') : this.isOp('(');
      if (D.brackets && this.isOp('(')) { // smile: ユーザー関数呼び出し
        this.p++;
        const args = this.argList(')');
        return (vm) => vm.callNamed(name, args.map((a) => a(vm)));
      }
      if (open) {
        this.p++;
        const ix = this.argList(D.brackets ? ']' : ')');
        const chain = [ix];
        while (D.brackets && this.isOp('[')) { this.p++; chain.push(this.argList(']')); }
        const key = this.arrKey(name);
        if (D.brackets) return (vm) => vm.indexChain(vm.getVarRaw(key, name), chain);
        return (vm) => {
          const r = vm.routines.get(name);
          if (r && !vm.hasVar(key)) return vm.callFn(r, ix.map((a) => a(vm)));
          if (!r && !vm.hasVar(key) && FN[name]) throw E(`${name} は${D.label}では使えません`, 5);
          return vm.getArr(key, ix.length).get(ix.map((a) => a(vm)));
        };
      }
      const dv = this.defaultOf(name);
      return (vm) => vm.getVar(name, dv);
    }

    // ---------------------------------------------------------- 左辺値
    lvalue() {
      const D = this.D;
      let t = this.next();
      if (t.t === 'op' && t.v === '@' && D.id === 'tiny') {
        this.expectOp('('); const ix = this.expr(); this.expectOp(')');
        return {
          name: '@', isStr: false,
          get: (vm) => vm.getArr('@()', 1).get([nm(ix(vm))]),
          set: (vm, v) => vm.getArr('@()', 1).set([nm(ix(vm))], ck16(nm(v))),
        };
      }
      if (t.t !== 'id') { this.p--; this.syntax('変数名が必要です'); }
      const name = t.v;
      this.checkName(name);
      if (FN[name] && FN[name].d.indexOf(D.id) >= 0 && !this.isOp(D.brackets ? '[' : '(')) this.syntax(`${name} は予約語です`);
      const isStr = this.typeOf(name) === 'str', co = this.coercer(name), dv = this.defaultOf(name);
      const open = D.brackets ? this.isOp('[') : this.isOp('(');
      if (!open) {
        return { name, isStr, get: (vm) => vm.getVar(name, dv), set: (vm, v) => vm.setVar(name, co(v)) };
      }
      this.p++;
      const chain = [this.argList(D.brackets ? ']' : ')')];
      while (D.brackets && this.isOp('[')) { this.p++; chain.push(this.argList(']')); }
      const key = this.arrKey(name), lastIx = chain[chain.length - 1], pre = chain.slice(0, -1);
      return {
        name, isStr, isArr: true,
        get: D.brackets ? (vm) => vm.indexChain(vm.getVarRaw(key, name), chain)
          : (vm) => vm.getArr(key, lastIx.length).get(lastIx.map((a) => a(vm))),
        set: (vm, v) => {
          const ix = lastIx.map((a) => a(vm));
          let container = D.brackets ? vm.getVarRaw(key, name) : vm.getArr(key, ix.length);
          if (pre.length) container = vm.indexChain(container, pre);
          if (!(container instanceof BArray)) throw typeErr();
          container.set(ix, co(v));
        },
      };
    }

    // ---------------------------------------------------------- 飛び先
    target() {
      const t = this.peek(), info = this.cur;
      if (t.t === 'num' || t.t === 'label') {
        this.p++;
        const tg = { pc: -1 };
        this.fix.push(() => {
          if (t.t === 'num') {
            if (!this.lineMap.has(t.v)) throw new BasicError(`未定義の行番号です: ${t.v} (Undefined line number)`, 8, info.line, info.src);
            tg.pc = this.lineMap.get(t.v);
          } else {
            if (!this.labels.has(t.v)) throw new BasicError(`未定義のラベルです: ${t.v}`, 8, info.line, info.src);
            tg.pc = this.labels.get(t.v);
          }
        });
        return tg;
      }
      return { fn: this.expr() };
    }
    go(vm, tg) { vm.pc = tg.fn ? vm.lookup(tg.fn(vm)) : tg.pc; }

    // ---------------------------------------------------------- 文
    parseStatements() {
      for (;;) {
        while (this.D.colon && this.eatOp(':')) { /* 空文 */ }
        const t = this.peek();
        if (t.t === 'eof') return;
        if (t.t === 'id' && t.v === 'ELSE' && this.inline > 0) return;
        this.statement();
        if (this.D.colon && this.isOp(':')) continue;
        if (this.peek().t === 'eof') return;
        if (this.isId('REM')) { this.p++; return; } // 行末コメント (' や !)
        if (this.isId('ELSE') && this.inline > 0) return;
        this.syntax('文の終わりに余分なものがあります');
      }
    }
    statement() {
      const t = this.peek(), D = this.D;
      if (t.t === 'label') {
        this.p++;
        this.labels.set(t.v, this.code.length);
        this.dataAt.set(t.v, this.data.length);
        return;
      }
      if (t.t === 'op' && t.v === '@' && D.id === 'tiny') return this.assignment();
      if (t.t !== 'id') this.syntax();
      const w = t.v, h = H[w];
      if (h && D.kw.has(w)) { this.p++; h.call(this, t); return; }
      const nx = this.peek(1);
      const looksAssign = nx.t === 'op' && (nx.v === '=' || nx.v === '(' || nx.v === '[' || nx.v === ',');
      if (h && !looksAssign) {
        const owners = KW_OWNERS[w];
        this.err(`${w} は${owners ? owners.join('・') : '他の方言'}のコマンドです (${D.label}では使えません)`, 2);
      }
      return this.assignment();
    }
    assignment() {
      const D = this.D;
      const save = this.p;
      const first = this.peek();
      // 代入か、(smile/full) ユーザー定義ルーチンの呼び出し
      if (first.t === 'id' && (D.id === 'smile' || D.id === 'full')) {
        const nx = this.peek(1);
        const isCallParen = nx.t === 'op' && nx.v === '(' && !(D.id === 'full' && this.looksLikeArrayAssign());
        const isBare = !(nx.t === 'op' && (nx.v === '=' || nx.v === '[' || nx.v === '('));
        if (isCallParen || isBare) {
          if (D.id === 'full' && this.routineCandidate(first.v) === false) { /* fallthrough to syntax */ }
          this.p++;
          const ca = this.callArgs(false);
          const name = first.v;
          this.emit((vm) => vm.callStmt(name, ca.es.map((a) => a(vm)), ca.lvs));
          return;
        }
      }
      this.p = save;
      const lv = this.lvalue();
      if (!this.eatOp('=') && !this.eatOp('==')) this.syntax('= が必要です');
      const e = this.expr();
      this.emit((vm) => lv.set(vm, e(vm)));
    }
    // 引数リスト。単純変数は参照渡し用に左辺値も保持する
    argRef() {
      const start = this.p, e = this.expr();
      let lv = null;
      const t = this.toks[start];
      if (this.p === start + 1 && t.t === 'id' && !FN[t.v] && t.v[0] !== '#') {
        const save = this.p; this.p = start; lv = this.lvalue(); this.p = save;
      }
      return { e, lv };
    }
    callArgs(requireParen) {
      const es = [], lvs = [];
      const push = () => { const a = this.argRef(); es.push(a.e); lvs.push(a.lv); };
      if (this.eatOp('(')) { if (!this.eatOp(')')) { do { push(); } while (this.eatOp(',')); this.expectOp(')'); } }
      else if (!requireParen && !this.atEnd()) { do { push(); } while (this.eatOp(',')); }
      return { es, lvs };
    }
    looksLikeArrayAssign() { // NAME ( ... ) = の形か
      let depth = 0, i = this.p + 1;
      for (; this.toks[i] && this.toks[i].t !== 'eof'; i++) {
        const k = this.toks[i];
        if (k.t === 'op' && k.v === '(') depth++;
        else if (k.t === 'op' && k.v === ')') { depth--; if (depth === 0) break; }
      }
      const n = this.toks[i + 1];
      return !!n && n.t === 'op' && n.v === '=';
    }
    routineCandidate() { return true; }

    // ---- 文字列/ブロックの汎用 ----
    ignoreRest() { while (!this.atEnd()) this.p++; }
    optArgs() { // カンマ区切り(空欄可)の引数
      const out = [];
      if (this.atEnd()) return out;
      for (;;) {
        if (this.isOp(',')) out.push(null);
        else out.push(this.expr());
        if (this.eatOp(',')) { if (this.atEnd()) { out.push(null); break; } continue; }
        break;
      }
      return out;
    }
    point() { // [STEP] (x, y)
      const step = this.eatId('STEP');
      this.expectOp('(');
      const x = this.expr(); this.expectOp(','); const y = this.expr(); this.expectOp(')');
      return { x, y, step };
    }
    ev(f, vm, d) { return f ? f(vm) : d; }
  }

  // =================================================================== 文ハンドラ
  const H = Object.create(null);

  H.REM = function () { /* コメント */ };
  H.LET = function () { this.assignment(); };

  // ---- PRINT ----
  H.PRINT = function () {
    const items = [];
    let using = null;
    if (this.isId('USING')) {
      this.p++; using = this.expr();
      if (!this.eatOp(';') && !this.eatOp(',')) this.eatOp(':');
    }
    for (;;) {
      if (this.atEnd()) break;
      const t = this.peek();
      if (t.t === 'op' && (t.v === ';' || t.v === ',')) { this.p++; items.push({ sep: t.v }); continue; }
      items.push({ e: this.expr() });
    }
    this.emit((vm) => vm.doPrint(items, using));
  };

  // ---- INPUT ----
  H.INPUT = function () {
    const D = this.D;
    let prompt = null, sepSemi = false;
    this.eatOp(';'); // INPUT;"..." (改行しない指定)
    if (this.isId('PROMPT')) { this.p++; prompt = this.expr(); sepSemi = false; this.eatOp(':') || this.eatOp(';') || this.eatOp(','); }
    else if (this.peek().t === 'str') {
      const nx = this.peek(1);
      if (nx.t === 'op' && (nx.v === ';' || nx.v === ',')) { prompt = this.expr(); sepSemi = this.next().v === ';'; }
    }
    const lvs = [];
    do { lvs.push(this.lvalue()); } while (this.eatOp(','));
    this.endStmt();
    const q = prompt ? (sepSemi ? '? ' : '') : '? ';
    this.emit((vm) => vm.doInput((prompt ? String(prompt(vm)) : '') + q, lvs, false));
  };
  H.LINPUT = function () {
    let prompt = null;
    if (this.peek().t === 'str') { prompt = this.expr(); this.eatOp(';') || this.eatOp(','); }
    const lv = this.lvalue();
    this.emit((vm) => vm.doInput(prompt ? String(prompt(vm)) : '', [lv], true));
  };

  // ---- GOTO / GOSUB / RETURN / ON ----
  H.GOTO = function () { const tg = this.target(); this.emit((vm) => this.go(vm, tg)); };
  H.GOSUB = function () {
    const tg = this.target();
    this.emit((vm) => {
      if (vm.callStack.length > 50000) throw E('GOSUB が深すぎます (Out of memory)', 7);
      vm.callStack.push({ k: 'g', ret: vm.pc }); this.go(vm, tg);
    });
  };
  H.RETURN = function () {
    const D = this.D;
    if (D.id === 'n88' && this.peek().t === 'num') {
      const tg = this.target();
      this.emit((vm) => { vm.doReturn(); this.go(vm, tg); });
      return;
    }
    let e = null;
    if ((D.id === 'smile' || D.id === 'full') && !this.atEnd()) e = this.expr();
    this.emit((vm) => { if (e) vm.retVal = e(vm); vm.doReturn(); });
  };
  H.ON = function () {
    const D = this.D;
    if (this.isId('ERROR')) {
      if (D.id !== 'n88') this.syntax();
      this.p++; this.expectId('GOTO');
      const n = this.next();
      if (n.t !== 'num') this.syntax('行番号が必要です');
      const info = this.cur;
      const tg = { pc: -1 };
      this.fix.push(() => {
        if (n.v === 0) { tg.pc = -1; return; }
        if (!this.lineMap.has(n.v)) throw new BasicError(`未定義の行番号です: ${n.v}`, 8, info.line, info.src);
        tg.pc = this.lineMap.get(n.v);
      });
      this.emit((vm) => { vm.errHandler = tg.pc; });
      return;
    }
    const e = this.expr();
    let gosub = false;
    if (this.eatId('GOSUB')) gosub = true; else this.expectId('GOTO');
    const tgs = [];
    do { tgs.push(this.target()); } while (this.eatOp(','));
    this.emit((vm) => {
      const v = Math.trunc(nm(e(vm)));
      if (v >= 1 && v <= tgs.length) {
        if (gosub) vm.callStack.push({ k: 'g', ret: vm.pc });
        this.go(vm, tgs[v - 1]);
      }
    });
  };
  H.RESUME = function () {
    let kind = 'retry', tg = null;
    if (this.eatId('NEXT')) kind = 'next';
    else if (this.peek().t === 'num') { kind = 'goto'; tg = this.target(); }
    this.emit((vm) => vm.doResume(kind, tg ? tg.pc : -1));
  };

  // ---- END / STOP / CLEAR ----
  H.END = function () {
    const D = this.D;
    const t = this.peek();
    if (t.t === 'id' && CLOSERS.has(t.v) && D.id !== 'tiny') {
      this.p++;
      const w = t.v;
      if (w === 'IF') return H.ENDIF.call(this);
      if (w === 'SELECT' || w === 'SWITCH') return H.ENDSELECT.call(this);
      if (w === 'SUB' || w === 'FUNCTION' || w === 'DEF') return endRoutine.call(this, w);
      if (w === 'PROGRAM') { this.emit((vm) => { vm.halted = true; vm.reason = 'end'; }); return; }
    }
    if (D.id === 'smile' && this.findBlock(['def'])) {
      if (this.blocks[this.blocks.length - 1].type !== 'def') this.err('DEF の中で END を使う前にブロックを閉じてください', 2);
      return endRoutine.call(this, 'DEF');
    }
    this.emit((vm) => { vm.halted = true; vm.reason = 'end'; });
  };
  H.ENDIF = function () {
    const b = this.topBlock('if', 'ENDIF');
    this.blocks.pop();
    if (b.jf) this.here(b.jf);
    for (const r of b.ends) this.here(r);
  };
  H.ENDSWITCH = function () { H.ENDSELECT.call(this); };
  H.STOP = function () { this.emit((vm) => { vm.halted = true; vm.reason = 'stop'; }); };
  H.CLEAR = function () {
    if (this.D.id === 'full') { this.emit((vm) => { vm.screen.cls(); vm.screen.gcls(); }); return; }
    if (this.D.id === 'n88') this.ignoreRest();
    this.emit((vm) => vm.clearVars());
  };

  // ---- IF ----
  H.IF = function () {
    const D = this.D;
    const cond = this.cond();
    if (!this.eatId('THEN')) {
      if (this.isId('GOTO')) { /* IF c GOTO n */ } else this.syntax('THEN が必要です');
    }
    const t = this.peek();
    if (t.t === 'eof' && this.toks[this.p - 1].v === 'THEN') {
      if (D.id !== 'full' && D.id !== 'smile') this.syntax('THEN の後に文が必要です');
      const b = { type: 'if', jf: this.ref(), ends: [], info: this.cur };
      this.jumpIfFalse(cond, b.jf);
      this.blocks.push(b);
      return;
    }
    // 単一行IF
    const rf = this.ref();
    this.jumpIfFalse(cond, rf);
    this.inline++;
    this.inlineBody();
    if (this.isId('ELSE')) {
      this.p++;
      const re = this.ref();
      this.jump(re);
      this.here(rf);
      this.inlineBody();
      this.here(re);
    } else this.here(rf);
    this.inline--;
  };
  Compiler.prototype.inlineBody = function () {
    if (this.peek().t === 'num') { const tg = this.target(); this.emit((vm) => this.go(vm, tg)); return; }
    this.parseStatements();
  };
  H.ELSEIF = function () {
    const b = this.topBlock('if', 'ELSEIF');
    if (b.hasElse) this.syntax('ELSE の後に ELSEIF は置けません');
    const re = this.ref(); b.ends.push(re); this.jump(re);
    this.here(b.jf);
    const cond = this.cond();
    this.eatId('THEN');
    b.jf = this.ref();
    this.jumpIfFalse(cond, b.jf);
  };
  H.ELSE = function () {
    if (this.inline > 0) this.syntax();
    const b = this.topBlock('if', 'ELSE');
    if (b.hasElse) this.syntax('ELSE が重複しています');
    const re = this.ref(); b.ends.push(re); this.jump(re);
    this.here(b.jf); b.jf = null; b.hasElse = true;
    if (this.isId('IF')) { // ELSE IF (Full BASIC)
      this.p++;
      b.hasElse = false;
      const cond = this.cond(); this.eatId('THEN');
      b.jf = this.ref(); this.jumpIfFalse(cond, b.jf);
    }
  };

  // ---- SELECT / SWITCH ----
  H.SELECT = function () {
    if (this.D.id === 'full') this.expectId('CASE');
    const id = ++this.selId, e = this.expr();
    this.emit((vm) => { vm.tmp[id] = e(vm); });
    this.blocks.push({ type: 'select', id, ends: [], nj: null, info: this.cur });
  };
  H.SWITCH = H.SELECT;
  H.CASE = function () {
    const b = this.topBlock('select', 'CASE');
    if (b.nj) { const re = this.ref(); b.ends.push(re); this.jump(re); this.here(b.nj); b.nj = null; }
    if (b.done) this.syntax('CASE ELSE の後に CASE は置けません');
    if (this.eatId('ELSE')) { b.done = true; return; }
    const tests = [], id = b.id;
    do {
      if (this.eatId('IS')) {
        const op = this.next().v, e = this.expr();
        tests.push((vm, v) => {
          const y = e(vm);
          switch (op) {
            case '<': return v < y; case '>': return v > y; case '<=': case '=<': return v <= y;
            case '>=': case '=>': return v >= y; case '<>': case '><': case '!=': return v !== y; default: return v === y;
          }
        });
      } else {
        const e1 = this.expr();
        if (this.eatId('TO')) { const e2 = this.expr(); tests.push((vm, v) => v >= e1(vm) && v <= e2(vm)); }
        else tests.push((vm, v) => v === e1(vm));
      }
    } while (this.eatOp(','));
    b.nj = this.ref();
    this.jumpIfFalse((vm) => { const v = vm.tmp[id]; for (const t of tests) if (t(vm, v)) return 1; return 0; }, b.nj);
  };
  H.DEFAULT = function () {
    const b = this.topBlock('select', 'DEFAULT');
    if (b.nj) { const re = this.ref(); b.ends.push(re); this.jump(re); this.here(b.nj); b.nj = null; }
    b.done = true;
  };
  H.ENDSELECT = function () {
    const b = this.topBlock('select', 'END SELECT');
    this.blocks.pop();
    if (b.nj) this.here(b.nj);
    for (const r of b.ends) this.here(r);
  };

  // ---- ループ ----
  H.FOR = function () {
    const lv = this.lvalue();
    if (lv.isArr || lv.isStr) this.syntax('FOR の変数が正しくありません');
    this.expectOp('=');
    const s = this.expr(); this.expectId('TO'); const e = this.expr();
    const st = this.eatId('STEP') ? this.expr() : null;
    const b = { type: 'for', name: lv.name, exit: this.ref(), cont: [], info: this.cur };
    this.emit((vm) => {
      const sv = nm(s(vm)), ev = nm(e(vm)), stv = st ? nm(st(vm)) : 1;
      lv.set(vm, sv);
      const stack = vm.forStack;
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].name === lv.name) { stack.length = i; break; }
      if (stv >= 0 ? sv > ev : sv < ev) { vm.pc = b.exit.pc; return; }
      stack.push({ name: lv.name, end: ev, step: stv, body: vm.pc, lv });
      if (stack.length > 5000) throw E('FOR の入れ子が深すぎます', 7);
    });
    this.blocks.push(b);
  };
  H.NEXT = function () {
    const names = [];
    if (!this.atEnd()) { do { names.push(this.lvalue().name); } while (this.eatOp(',')); }
    const doOne = (name) => {
      const b = this.blocks[this.blocks.length - 1];
      if (!b || b.type !== 'for') this.err('NEXT に対応する FOR がありません (NEXT without FOR)', 1);
      if (name && b.name !== name) this.err(`FOR ${b.name} と NEXT ${name} が対応していません`, 1);
      this.blocks.pop();
      const idx = this.code.length;
      for (const r of b.cont) r.pc = idx;
      this.emit((vm) => {
        const stack = vm.forStack;
        let i = stack.length - 1;
        if (name) while (i >= 0 && stack[i].name !== name) i--;
        else while (i >= 0 && stack[i].name !== b.name) i--;
        if (i < 0) throw E('NEXT に対応する FOR がありません (NEXT without FOR)', 1);
        stack.length = i + 1;
        const en = stack[i];
        const v = nm(en.lv.get(vm)) + en.step;
        en.lv.set(vm, v);
        if (en.step >= 0 ? v <= en.end : v >= en.end) vm.pc = en.body;
        else stack.pop();
      });
      this.here(b.exit);
    };
    if (names.length === 0) doOne(null); else for (const n of names) doOne(n);
  };
  H.WHILE = function () {
    const b = { type: 'while', exit: this.ref(), cont: [], top: this.code.length, info: this.cur };
    const cond = this.cond();
    this.jumpIfFalse(cond, b.exit);
    this.blocks.push(b);
  };
  H.WEND = function () {
    const b = this.topBlock('while', 'WEND');
    this.blocks.pop();
    const top = b.top;
    this.emit((vm) => { vm.pc = top; });
    this.here(b.exit);
    for (const r of b.cont) r.pc = top;
  };
  H.REPEAT = function () { this.blocks.push({ type: 'repeat', exit: this.ref(), cont: [], top: this.code.length, info: this.cur }); };
  H.UNTIL = function () {
    const b = this.topBlock('repeat', 'UNTIL');
    this.blocks.pop();
    for (const r of b.cont) r.pc = this.code.length;
    const cond = this.cond(), top = b.top;
    this.emit((vm) => { if (!cond(vm)) vm.pc = top; });
    this.here(b.exit);
  };
  H.DO = function () {
    const b = { type: 'do', exit: this.ref(), cont: [], top: this.code.length, info: this.cur };
    if (this.isId('WHILE') || this.isId('UNTIL')) {
      const until = this.next().v === 'UNTIL';
      const cond = this.cond();
      this.jumpIfFalse(until ? (vm) => (cond(vm) ? 0 : 1) : cond, b.exit);
    }
    this.blocks.push(b);
  };
  H.LOOP = function () {
    const b = this.topBlock('do', 'LOOP');
    this.blocks.pop();
    const top = b.top;
    for (const r of b.cont) r.pc = this.code.length;
    if (this.isId('WHILE') || this.isId('UNTIL')) {
      const until = this.next().v === 'UNTIL';
      const cond = this.cond();
      this.emit((vm) => { const c = cond(vm); if (until ? !c : c) vm.pc = top; });
    } else this.emit((vm) => { vm.pc = top; });
    this.here(b.exit);
  };
  function loopBlock(c) {
    const b = c.findBlock(['for', 'while', 'repeat', 'do']);
    if (!b) c.err('ループの外では使えません', 2);
    return b;
  }
  H.BREAK = function () {
    const b = loopBlock(this);
    const isFor = b.type === 'for', name = b.name;
    this.emit((vm) => {
      if (isFor) { const s = vm.forStack; for (let i = s.length - 1; i >= 0; i--) if (s[i].name === name) { s.length = i; break; } }
      vm.pc = b.exit.pc;
    });
  };
  H.CONTINUE = function () {
    const b = loopBlock(this);
    const r = this.ref();
    if (b.type === 'while') r.pc = b.top; else b.cont.push(r);
    this.jump(r);
  };
  H.EXIT = function () {
    const w = this.next();
    if (w.t !== 'id') this.syntax();
    if (w.v === 'FOR' || w.v === 'DO' || w.v === 'WHILE') {
      const b = this.findBlock([w.v === 'FOR' ? 'for' : w.v === 'DO' ? 'do' : 'while']);
      if (!b) this.err(`EXIT ${w.v} に対応するループがありません`, 2);
      const isFor = b.type === 'for', name = b.name;
      this.emit((vm) => {
        if (isFor) { const s = vm.forStack; for (let i = s.length - 1; i >= 0; i--) if (s[i].name === name) { s.length = i; break; } }
        vm.pc = b.exit.pc;
      });
    } else if (w.v === 'SUB' || w.v === 'FUNCTION' || w.v === 'DEF') {
      this.emit((vm) => vm.finishCall());
    } else this.syntax();
  };

  // ---- 変数/配列 ----
  H.DIM = function () {
    const D = this.D;
    do {
      const t = this.next();
      if (t.t !== 'id') this.syntax('配列名が必要です');
      const name = t.v; this.checkName(name);
      const close = D.brackets ? ']' : ')';
      this.expectOp(D.brackets ? '[' : '(');
      const los = [], his = [];
      do {
        const a = this.expr();
        if (this.eatId('TO')) { los.push(a); his.push(this.expr()); } else { los.push(null); his.push(a); }
      } while (this.eatOp(','));
      this.expectOp(close);
      const dv = this.defaultOf(name), key = this.arrKey(name), base = this.base, count = D.arrCount;
      this.emit((vm) => {
        const lo = [], hi = [];
        for (let k = 0; k < his.length; k++) {
          const h = Math.trunc(nm(his[k](vm)));
          if (count) { if (h < 1) throw illegal('配列の要素数は1以上'); lo.push(0); hi.push(h - 1); }
          else { const l = los[k] ? Math.trunc(nm(los[k](vm))) : base; if (h < l) throw illegal(); lo.push(l); hi.push(h); }
        }
        vm.declare(key, new BArray(lo, hi, dv), D.id !== 'smile');
      });
    } while (this.eatOp(','));
  };
  H.VAR = function () {
    const D = this.D;
    do {
      const t = this.peek();
      if (t.t !== 'id') this.syntax('変数名が必要です');
      if (this.isOp('[', 1)) { H.DIM.call(this); continue; }
      const lv = this.lvalue();
      if (this.eatOp('=')) { const e = this.expr(); this.emit((vm) => vm.declareVar(lv.name, this.coercer(lv.name)(e(vm)))); }
      else { const dv = this.defaultOf(lv.name); this.emit((vm) => vm.declareVar(lv.name, dv)); }
    } while (this.eatOp(','));
  };
  H.ERASE = function () {
    do { const t = this.next(); const key = this.arrKey(t.v); this.emit((vm) => vm.eraseVar(key)); } while (this.eatOp(','));
  };
  H.OPTION = function () {
    if (this.isId('BASE')) { this.p++; const n = this.next(); if (n.t !== 'num') this.syntax(); this.base = n.v; return; }
    this.ignoreRest(); // OPTION STRICT など
  };
  H.DEFINT = function () { defType.call(this, 'int'); };
  H.DEFSNG = function () { defType.call(this, 'num'); };
  H.DEFDBL = function () { defType.call(this, 'num'); };
  H.DEFSTR = function () { defType.call(this, 'str'); };
  function defType(ty) {
    do {
      const a = this.next(); if (a.t !== 'id') this.syntax();
      let z = a;
      if (this.eatOp('-')) z = this.next();
      for (let c = a.v.charCodeAt(0); c <= z.v.charCodeAt(0); c++) this.deftype[String.fromCharCode(c)] = ty;
    } while (this.eatOp(','));
  }
  H.SWAP = function () {
    const a = this.lvalue(); this.expectOp(','); const b = this.lvalue();
    this.emit((vm) => { const x = a.get(vm), y = b.get(vm); a.set(vm, y); b.set(vm, x); });
  };
  H.INC = function () {
    const lv = this.lvalue(); const n = this.eatOp(',') ? this.expr() : null;
    this.emit((vm) => lv.set(vm, nm(lv.get(vm)) + (n ? nm(n(vm)) : 1)));
  };
  H.DEC = function () {
    const lv = this.lvalue(); const n = this.eatOp(',') ? this.expr() : null;
    this.emit((vm) => lv.set(vm, nm(lv.get(vm)) - (n ? nm(n(vm)) : 1)));
  };
  function arrVar(c) { const lv = c.lvalue(); return lv; }
  H.PUSH = function () {
    const a = arrVar(this); this.expectOp(','); const e = this.expr();
    this.emit((vm) => { const ar = a.get(vm); if (!(ar instanceof BArray)) throw typeErr(); ar.data.push(e(vm)); ar.sync(); });
  };
  H.UNSHIFT = function () {
    const a = arrVar(this); this.expectOp(','); const e = this.expr();
    this.emit((vm) => { const ar = a.get(vm); if (!(ar instanceof BArray)) throw typeErr(); ar.data.unshift(e(vm)); ar.sync(); });
  };
  H.SORT = function () {
    const a = arrVar(this);
    this.emit((vm) => { const ar = a.get(vm); if (!(ar instanceof BArray)) throw typeErr(); ar.data.sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)); });
  };
  H.RSORT = function () {
    const a = arrVar(this);
    this.emit((vm) => { const ar = a.get(vm); if (!(ar instanceof BArray)) throw typeErr(); ar.data.sort((x, y) => (x < y ? 1 : x > y ? -1 : 0)); });
  };

  // ---- DATA / READ / RESTORE ----
  H.DATA = function (t) {
    const raw = t.raw || '';
    let i = 0;
    const n = raw.length;
    for (;;) {
      while (i < n && (raw[i] === ' ' || raw[i] === '\t')) i++;
      let item, quoted = false;
      if (raw[i] === '"') {
        quoted = true; let j = i + 1; item = '';
        while (j < n && raw[j] !== '"') item += raw[j++];
        i = j + 1;
        while (i < n && raw[i] !== ',') i++;
      } else {
        let j = i;
        while (j < n && raw[j] !== ',') j++;
        item = raw.slice(i, j).trim(); i = j;
      }
      if (!(n === 0)) this.data.push({ v: item, q: quoted });
      if (i < n && raw[i] === ',') { i++; continue; }
      break;
    }
  };
  H.READ = function () {
    const lvs = [];
    do { lvs.push(this.lvalue()); } while (this.eatOp(','));
    this.emit((vm) => {
      for (const lv of lvs) {
        if (vm.dataPtr >= vm.prog.data.length) throw E('DATAが足りません (Out of DATA)', 4);
        const d = vm.prog.data[vm.dataPtr++];
        if (lv.isStr) lv.set(vm, d.v);
        else {
          if (d.q || !/^[+-]?(\d+\.?\d*|\.\d+)([eEdD][+-]?\d+)?$|^&H[0-9A-Fa-f]+$/i.test(d.v)) {
            if (d.v === '' && !d.q) { lv.set(vm, 0); continue; }
            throw E(`DATAの型が一致しません: ${d.v}`, 13);
          }
          lv.set(vm, /^&H/i.test(d.v) ? parseInt(d.v.slice(2), 16) : parseFloat(d.v.replace(/[dD]/, 'e')));
        }
      }
    });
  };
  H.RESTORE = function () {
    if (this.atEnd()) { this.emit((vm) => { vm.dataPtr = 0; }); return; }
    const t = this.peek(), info = this.cur;
    this.p++;
    const key = t.v, box = { idx: 0 };
    this.fix.push(() => {
      if (!this.dataAt.has(key)) throw new BasicError('RESTORE の行がありません: ' + key, 8, info.line, info.src);
      box.idx = this.dataAt.get(key);
    });
    this.emit((vm) => { vm.dataPtr = box.idx; });
  };

  // ---- ルーチン (SUB / FUNCTION / DEF / CALL) ----
  function paramList(c) {
    const params = [];
    if (c.D.id === 'smile' && c.peek().t === 'id' && c.peek().v !== 'OUT') { // DEF SHOW A,B
      do { params.push({ name: c.next().v }); } while (c.eatOp(','));
      return params;
    }
    if (c.eatOp('(')) {
      if (!c.eatOp(')')) {
        do {
          const t = c.next(); if (t.t !== 'id') c.syntax('仮引数名が必要です');
          if (c.D.id !== 'smile' && c.isOp('(') && c.isOp(')', 1)) { c.p += 2; params.push({ name: t.v, arr: true }); }
          else params.push({ name: t.v });
        } while (c.eatOp(','));
        c.expectOp(')');
      }
    }
    return params;
  }
  function beginRoutine(c, kind, name, params, mode) {
    const skip = c.ref();
    c.jump(skip);
    const r = { name, params, kind, mode, addr: c.code.length, key: c.D.id === 'smile' ? null : null };
    if (c.routines.has(name)) c.err(`${name} は既に定義されています`, 10);
    c.routines.set(name, r);
    c.blocks.push({ type: 'def', kind, skip, r, info: c.cur });
    return r;
  }
  function endRoutine(w) {
    const b = this.topBlock('def', 'END ' + w);
    this.blocks.pop();
    this.emit((vm) => vm.finishCall());
    this.here(b.skip);
  }
  H.SUB = function () {
    const t = this.next(); if (t.t !== 'id') this.syntax();
    beginRoutine(this, 'sub', t.v, paramList(this), 'iso');
  };
  H.FUNCTION = function () {
    const t = this.next(); if (t.t !== 'id') this.syntax();
    beginRoutine(this, 'function', t.v, paramList(this), 'iso');
  };
  H.DECLARE = function () { this.ignoreRest(); };
  H.COMMON = function () {
    if (!this.isId('DEF')) this.syntax();
    this.p++; H.DEF.call(this);
  };
  H.DEF = function () {
    const D = this.D;
    let t = this.next();
    if (t.t !== 'id') this.syntax();
    if (D.id === 'smile') {
      const r = beginRoutine(this, 'def', t.v, paramList(this), 'smile');
      if (this.eatId('OUT')) { do { this.next(); } while (this.eatOp(',')); }
      return;
    }
    let name = t.v;
    if (D.id === 'n88') {
      if (name === 'FN' && this.peek().t === 'id') name += this.next().v;
      if (!name.startsWith('FN')) this.syntax('DEF の後は FN で始まる関数名です (例: DEF FNA(X)=X*2)');
    }
    const params = paramList(this);
    this.expectOp('=');
    const e = this.expr();
    if (this.routines.has(name)) this.err(`${name} は既に定義されています`, 10);
    this.routines.set(name, { name, params, kind: 'expr', expr: e, mode: D.id === 'n88' ? 'ov' : 'iso' });
  };
  H.CALL = function () {
    const t = this.next(); if (t.t !== 'id') this.syntax();
    const ca = this.callArgs(this.D.id !== 'smile');
    this.emit((vm) => vm.callStmt(t.v, ca.es.map((a) => a(vm)), ca.lvs));
  };

  // ---- 画面/テキスト ----
  H.CLS = function () {
    const D = this.D;
    if (!this.atEnd()) { const e = this.expr(); this.emit((vm) => { const m = e(vm); if (m === 0 || m === 2 || m === 3) vm.screen.cls(); if (m === 1 || m === 2 || m === 3) vm.screen.gcls(); }); return; }
    this.emit((vm) => { vm.screen.cls(); if (D.id !== 'smile') vm.screen.gcls(); });
  };
  H.LOCATE = function () {
    const a = this.optArgs();
    this.emit((vm) => {
      const x = a[0] ? nm(a[0](vm)) : vm.screen.cx, y = a[1] ? nm(a[1](vm)) : vm.screen.cy;
      vm.screen.locate(x, y);
    });
  };
  H.COLOR = function () {
    const a = this.optArgs(), D = this.D;
    this.emit((vm) => {
      const f = a[0] ? a[0](vm) : null, b = a[1] ? a[1](vm) : null;
      vm.setTextColor(f, b);
    });
  };
  H.SCREEN = function () { this.ignoreRest(); };
  H.CONSOLE = function () { this.ignoreRest(); };
  H.KEY = function () { this.ignoreRest(); };
  H.XSCREEN = function () { this.ignoreRest(); };
  H.DISPLAY = function () { this.ignoreRest(); };
  H.WIDTH = function () {
    const a = this.optArgs();
    this.emit((vm) => {
      const c = a[0] ? Math.trunc(nm(a[0](vm))) : vm.screen.cols, r = a[1] ? Math.trunc(nm(a[1](vm))) : vm.screen.rows;
      if (c < 10 || c > 200 || r < 5 || r > 100) throw illegal();
      vm.screen.setSize(c, r);
    });
  };
  H.BEEP = function () { this.ignoreRest(); this.emit((vm) => vm.env.tone && vm.env.tone(880, 150)); };
  H.SOUND = function () {
    const a = this.optArgs();
    this.emit((vm) => { const f = nm(a[0](vm)), d = a[1] ? nm(a[1](vm)) : 18; if (vm.env.tone) vm.env.tone(f, d * 1000 / 55); });
  };
  H.PLAY = function () {
    const e = this.expr();
    this.emit((vm) => vm.doPlay(String(e(vm))));
  };
  H.RANDOMIZE = function () {
    const e = this.atEnd() ? null : this.expr();
    this.emit((vm) => vm.seed(e ? nm(e(vm)) : Date.now()));
  };
  H.WAIT = function () {
    const D = this.D;
    if (D.id === 'full') { this.expectId('DELAY'); }
    const e = this.expr();
    this.emit((vm) => {
      const v = nm(e(vm));
      const ms = D.id === 'tiny' ? v * 10 : D.id === 'full' ? v * 1000 : v * 1000 / 60;
      return vm.env.sleep(ms);
    });
  };
  H.PAUSE = function () { H.WAIT.call(this); };
  H.VSYNC = function () {
    const e = this.atEnd() ? null : this.expr();
    this.emit((vm) => vm.vsync(e ? nm(e(vm)) : 1));
  };

  // ---- グラフィック: 共通 ----
  function colorOf(vm, c) { return c === null || c === undefined ? vm.gcolor : vm.toRGB(c); }

  // N88-BASIC
  function pt(vm, p) { // 点の評価 → 描画座標(論理)
    let x = nm(p.x(vm)), y = nm(p.y(vm));
    if (p.step) { x += vm.screen.lastX; y += vm.screen.lastY; }
    vm.screen.lastX = x; vm.screen.lastY = y;
    return [x, y];
  }
  H.PSET = function () {
    const p = this.point(); const a = this.eatOp(',') ? this.expr() : null;
    this.emit((vm) => { const q = pt(vm, p); vm.gPoint(q[0], q[1], colorOf(vm, a && a(vm))); });
  };
  H.PRESET = function () {
    const p = this.point(); const a = this.eatOp(',') ? this.expr() : null;
    this.emit((vm) => { const q = pt(vm, p); vm.gPoint(q[0], q[1], a ? colorOf(vm, a(vm)) : vm.screen.bg); });
  };
  H.LINE = function () {
    const D = this.D;
    if (this.isId('INPUT')) { // LINE INPUT
      this.p++;
      let prompt = null;
      this.eatOp(';');
      if (this.peek().t === 'str') { prompt = this.expr(); this.eatOp(';') || this.eatOp(','); }
      const lv = this.lvalue();
      this.emit((vm) => vm.doInput(prompt ? String(prompt(vm)) : '', [lv], true));
      return;
    }
    if (D.id === 'full') this.syntax('Full BASICの LINE は LINE INPUT だけです。線は PLOT LINES: x1,y1; x2,y2 で描きます');
    if (D.id === 'tiny') { // 拡張: LINE x1,y1,x2,y2
      const a = []; do { a.push(this.expr()); } while (this.eatOp(','));
      if (a.length !== 4) this.syntax('LINE x1,y1,x2,y2');
      this.emit((vm) => vm.gLine(nm(a[0](vm)), nm(a[1](vm)), nm(a[2](vm)), nm(a[3](vm)), vm.gcolor, 0));
      return;
    }
    let p1 = null;
    if (this.isOp('(') || this.isId('STEP')) p1 = this.point();
    this.expectOp('-');
    const p2 = this.point();
    let c = null, style = 0;
    if (this.eatOp(',')) {
      if (!this.isOp(',')) c = this.expr();
      if (this.eatOp(',')) { const s = this.next(); style = s.v === 'BF' ? 2 : s.v === 'B' ? 1 : 0; if (s.t !== 'id' || (s.v !== 'B' && s.v !== 'BF')) this.syntax('B または BF'); }
    }
    this.emit((vm) => {
      let a;
      if (p1) a = pt(vm, p1); else a = [vm.screen.lastX, vm.screen.lastY];
      const b = pt(vm, p2);
      vm.gLine(a[0], a[1], b[0], b[1], colorOf(vm, c && c(vm)), style);
    });
  };
  H.CIRCLE = function () {
    const D = this.D;
    if (D.id === 'tiny') {
      const a = []; do { a.push(this.expr()); } while (this.eatOp(','));
      if (a.length !== 3) this.syntax('CIRCLE x,y,r');
      this.emit((vm) => vm.gCircle(nm(a[0](vm)), nm(a[1](vm)), nm(a[2](vm)), vm.gcolor, null, null, 1, false));
      return;
    }
    const p = this.point();
    this.expectOp(',');
    const r = this.expr();
    const rest = [];
    while (this.eatOp(',')) rest.push(this.isOp(',') || this.atEnd() ? null : this.expr());
    this.emit((vm) => {
      const q = pt(vm, p), rv = nm(r(vm));
      const ev = (i) => (rest[i] ? rest[i](vm) : null);
      vm.gCircle(q[0], q[1], rv, colorOf(vm, ev(0)), ev(1), ev(2), ev(3) === null ? 1 : ev(3), false);
    });
  };
  H.PAINT = function () {
    const p = this.point();
    const rest = [];
    while (this.eatOp(',')) rest.push(this.isOp(',') || this.atEnd() ? null : this.expr());
    this.emit((vm) => {
      const q = pt(vm, p);
      const c = rest[0] ? vm.toRGB(rest[0](vm)) : vm.gcolor;
      const bd = rest[1] ? vm.toRGB(rest[1](vm)) : null;
      vm.gPaint(q[0], q[1], c, bd);
    });
  };

  // Tiny BASIC 拡張 / smile BASIC のグラフィック
  function numArgs(c, min, max, what) {
    const a = c.optArgs();
    if (a.length < min || a.length > max) c.syntax(what);
    return a;
  }
  H.PLOT = function () {
    const D = this.D;
    if (D.id === 'tiny') {
      const a = numArgs(this, 2, 2, 'PLOT x,y');
      this.emit((vm) => vm.gPoint(nm(a[0](vm)), nm(a[1](vm)), vm.gcolor));
      return;
    }
    // Full BASIC: PLOT POINTS/LINES/AREA/TEXT
    const w = this.next();
    if (w.t !== 'id') this.syntax();
    if (w.v === 'TEXT') {
      this.eatOp(','); this.expectId('AT');
      const x = this.expr(); this.expectOp(','); const y = this.expr(); this.expectOp(':');
      const s = this.expr();
      this.emit((vm) => vm.gText(nm(x(vm)), nm(y(vm)), String(s(vm))));
      return;
    }
    if (['POINTS', 'LINES', 'AREA'].indexOf(w.v) < 0) this.syntax('PLOT POINTS / LINES / AREA / TEXT');
    this.expectOp(':');
    const pts = [];
    do { const x = this.expr(); this.expectOp(','); const y = this.expr(); pts.push([x, y]); } while (this.eatOp(';'));
    const kind = w.v;
    this.emit((vm) => {
      const P = pts.map((p) => [nm(p[0](vm)), nm(p[1](vm))]);
      if (kind === 'POINTS') for (const q of P) vm.gPoint(q[0], q[1], vm.gcolor);
      else if (kind === 'LINES') for (let i = 0; i + 1 < P.length; i++) vm.gLine(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], vm.gcolor, 0);
      else vm.gPolygon(P, vm.gcolor);
    });
  };
  H.BOX = function () {
    const w = this.next();
    if (w.t !== 'id' || ['LINES', 'AREA', 'CIRCLE', 'ELLIPSE', 'DISK'].indexOf(w.v) < 0) this.syntax('BOX LINES / AREA / CIRCLE / ELLIPSE / DISK');
    const a = []; do { a.push(this.expr()); } while (this.eatOp(','));
    if (a.length !== 4) this.syntax('BOX 種別 x1,x2,y1,y2');
    const kind = w.v;
    this.emit((vm) => {
      const x1 = nm(a[0](vm)), x2 = nm(a[1](vm)), y1 = nm(a[2](vm)), y2 = nm(a[3](vm));
      vm.gBox(kind, x1, y1, x2, y2);
    });
  };
  H.SET = function () {
    const w = this.next();
    if (w.t !== 'id') this.syntax();
    if (w.v === 'WINDOW') {
      const a = []; do { a.push(this.expr()); } while (this.eatOp(','));
      if (a.length !== 4) this.syntax('SET WINDOW 左,右,下,上');
      this.emit((vm) => vm.setWindow(nm(a[0](vm)), nm(a[1](vm)), nm(a[2](vm)), nm(a[3](vm))));
    } else if (w.v === 'COLOR' || (w.v === 'POINT' || w.v === 'LINE' || w.v === 'AREA') && this.isId('COLOR')) {
      if (w.v !== 'COLOR') this.p++;
      const e = this.expr();
      this.emit((vm) => { vm.gcolor = vm.toRGB(e(vm)); });
    } else if (w.v === 'CURSOR') {
      const r = this.expr(); this.expectOp(','); const c = this.expr();
      this.emit((vm) => vm.screen.locate(nm(c(vm)) - 1, nm(r(vm)) - 1));
    } else this.ignoreRest();
  };

  // smile BASIC のグラフィック
  H.ACLS = function () { this.emit((vm) => { vm.screen.cls(); vm.screen.gcls(); vm.screen.color(vm.D.fg, -1); }); };
  H.GCLS = function () {
    const e = this.atEnd() ? null : this.expr();
    this.emit((vm) => vm.screen.gcls(e ? vm.toRGB(e(vm)) : vm.D.bg));
  };
  H.GCOLOR = function () { const e = this.expr(); this.emit((vm) => { vm.gcolor = vm.toRGB(e(vm)); }); };
  H.GPSET = function () {
    const a = numArgs(this, 2, 3, 'GPSET x,y[,color]');
    this.emit((vm) => vm.gPoint(nm(a[0](vm)), nm(a[1](vm)), colorOf(vm, a[2] && a[2](vm))));
  };
  H.GLINE = function () {
    const a = numArgs(this, 4, 5, 'GLINE x1,y1,x2,y2[,color]');
    this.emit((vm) => vm.gLine(nm(a[0](vm)), nm(a[1](vm)), nm(a[2](vm)), nm(a[3](vm)), colorOf(vm, a[4] && a[4](vm)), 0));
  };
  H.GBOX = function () {
    const a = numArgs(this, 4, 5, 'GBOX x1,y1,x2,y2[,color]');
    this.emit((vm) => vm.gLine(nm(a[0](vm)), nm(a[1](vm)), nm(a[2](vm)), nm(a[3](vm)), colorOf(vm, a[4] && a[4](vm)), 1));
  };
  H.GFILL = function () {
    const a = numArgs(this, 4, 5, 'GFILL x1,y1,x2,y2[,color]');
    this.emit((vm) => vm.gLine(nm(a[0](vm)), nm(a[1](vm)), nm(a[2](vm)), nm(a[3](vm)), colorOf(vm, a[4] && a[4](vm)), 2));
  };
  H.GCIRCLE = function () {
    const a = numArgs(this, 3, 8, 'GCIRCLE x,y,r[,color]');
    this.emit((vm) => {
      const x = nm(a[0](vm)), y = nm(a[1](vm)), r = nm(a[2](vm));
      if (a.length >= 6) { // x,y,r,start,end,flag[,color] (角度は度)
        vm.gCircle(x, y, r, colorOf(vm, a[6] && a[6](vm)), nm(a[3](vm)) * Math.PI / 180, nm(a[4](vm)) * Math.PI / 180, 1, nm(a[5](vm)) === 1);
      } else vm.gCircle(x, y, r, colorOf(vm, a[3] && a[3](vm)), null, null, 1, false);
    });
  };
  H.GPAINT = function () {
    const a = numArgs(this, 2, 4, 'GPAINT x,y[,color]');
    this.emit((vm) => vm.gPaint(nm(a[0](vm)), nm(a[1](vm)), colorOf(vm, a[2] && a[2](vm)), a[3] ? vm.toRGB(a[3](vm)) : null));
  };
  H.GPRINT = function () {
    const a = numArgs(this, 3, 3, 'GPRINT x,y,text');
    this.emit((vm) => vm.gText(nm(a[0](vm)), nm(a[1](vm)), String(a[2](vm))));
  };
  function outStmt(fnName) {
    return function () {
      const pre = [];
      while (!this.isId('OUT') && !this.atEnd()) { pre.push(this.expr()); if (!this.eatOp(',')) break; }
      this.expectId('OUT');
      const lvs = []; do { lvs.push(this.lvalue()); } while (this.eatOp(','));
      this.emit((vm) => {
        const r = fnName === 'TOUCH' ? vm.env.touch() : vm.env.stick();
        lvs.forEach((lv, i) => lv.set(vm, r[i] === undefined ? 0 : r[i]));
      });
    };
  }
  H.STICK = outStmt('STICK');
  H.TOUCH = outStmt('TOUCH');

  // 方言外のコマンドを使ったときのメッセージ用に、ハンドラが無いキーワードも登録
  for (const w of ['RUN', 'NEW', 'LIST', 'CONT']) H[w] = function () { this.err(`${w} はエディタ操作用のコマンドです。「実行」ボタンを使ってください`, 2); };

  // ================================================================== 構築
  function compile(src, dialectId) {
    const D = DIALECTS[dialectId];
    if (!D) throw new Error('unknown dialect ' + dialectId);
    const c = new Compiler(D);
    const raw = String(src).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
    let lines = [];
    const numRe = /^\s*(\d+)\s?(.*)$/;
    raw.forEach((text, i) => {
      if (/^\s*$/.test(text)) return;
      let num = null, body = text;
      if (D.lineNo !== 'none') {
        const m = numRe.exec(text);
        if (m) { num = parseInt(m[1], 10); body = m[2]; }
        else if (D.lineNo === 'req') {
          throw new BasicError('行番号がありません。' + D.label + 'ではすべての行の先頭に行番号が必要です (例: 10 PRINT "HELLO")', 2, i + 1, i + 1);
        }
      }
      lines.push({ num, body, src: i + 1 });
    });
    // 行番号順に並べ替え (すべて番号付きのとき)
    if (lines.length && lines.every((l) => l.num !== null)) {
      const m = new Map();
      for (const l of lines) { if (/^\s*$/.test(l.body)) m.delete(l.num); else m.set(l.num, l); }
      lines = [...m.values()].sort((a, b) => a.num - b.num);
    }
    for (const l of lines) {
      c.cur = { line: l.num !== null ? l.num : l.src, src: l.src };
      if (l.num !== null) { c.lineMap.set(l.num, c.code.length); c.dataAt.set(l.num, c.data.length); }
      try {
        c.toks = tokenize(l.body, D); c.p = 0;
      } catch (e) {
        if (e instanceof BasicError && e.line === undefined) { e.line = c.cur.line; e.srcLine = c.cur.src; }
        throw e;
      }
      c.parseStatements();
    }
    if (c.blocks.length) {
      const b = c.blocks[c.blocks.length - 1];
      const names = { if: 'ENDIF (END IF)', for: 'NEXT', while: 'WEND', repeat: 'UNTIL', do: 'LOOP', select: 'END SELECT', def: 'END' };
      throw new BasicError(`${names[b.type] || '終わり'} がありません (ブロックが閉じられていません)`, 2, b.info.line, b.info.src);
    }
    c.cur = { line: 0, src: 0 };
    c.emit((vm) => { vm.halted = true; vm.reason = 'end'; });
    for (const f of c.fix) f();
    return {
      D, code: c.code, info: c.info, lineMap: c.lineMap, labels: c.labels, routines: c.routines,
      data: c.data, dataAt: c.dataAt,
    };
  }
  NS.compile = compile;
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
