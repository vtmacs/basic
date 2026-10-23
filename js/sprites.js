/* MACS BASIC Simulator - スプライト / BG (smile BASIC)。DOM非依存で、表示用ピクセルへ直接合成する。
 *  スプライトの絵: グラフィックページ4 (GRP4)、BGタイルの絵: グラフィックページ5 (GRP5)
 *  どちらも 16x16 の升目に 左上から右へ 32個ずつ番号が付く(番号 n → u=(n%32)*16, v=floor(n/32)*16)。 */
(function (root) {
  'use strict';
  const NS = (root.MacsBasic = root.MacsBasic || {});
  const { E, illegal } = NS;
  const toABGR = NS.Screen.toABGR;

  const MAX_SP = 512, CELL = 16, PER_ROW = 32;
  const notUsed = (id) => E(`スプライト ${id} は使われていません (SPSET が必要です)`, 5);

  // ------------------------------------------------------------ 標準のスプライト/タイルの絵
  function pointInPoly(x, y, pts) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  const STAR = (() => {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 3.2 : 7.6, a = -Math.PI / 2 + i * Math.PI / 5;
      p.push([7.5 + r * Math.cos(a), 8.2 + r * Math.sin(a)]);
    }
    return p;
  })();
  const SHAPES = [
    (fx, fy) => fx * fx + fy * fy <= 49,                                   // 0 円
    (fx, fy) => Math.abs(fx) <= 6.5 && Math.abs(fy) <= 6.5,               // 1 四角
    (fx, fy) => Math.abs(fx) + Math.abs(fy) <= 7.5,                       // 2 ひし形
    (fx, fy, x, y) => y >= 1 && y <= 14 && Math.abs(fx) <= (y - 1) * 0.55, // 3 三角
    (fx, fy, x, y) => pointInPoly(x + 0.5, y + 0.5, STAR),                // 4 星
    (fx, fy) => { const a = fx / 6.6, b = -(fy - 0.5) / 6.6 + 0.15; return Math.pow(a * a + b * b - 1, 3) - a * a * b * b * b <= 0; }, // 5 ハート
    (fx, fy) => fx * fx + fy * fy <= 49,                                   // 6 顔 (目と口は別に抜く)
    (fx, fy) => { const d = fx * fx + fy * fy; return d <= 49 && d >= 22; }, // 7 輪
  ];
  const COLORS = [0xff3030, 0x3080ff, 0x30c040, 0xffd020];

  function initDefaults(screen) {
    const sp = screen.getPage(4), bg = screen.getPage(5);
    sp.fb.fill(0); bg.fb.fill(0);
    const put = (page, cell, x, y, rgb) => {
      const u = (cell % PER_ROW) * CELL + x, v = Math.floor(cell / PER_ROW) * CELL + y;
      page.fb[v * page.w + u] = toABGR(rgb);
    };
    for (let s = 0; s < 8; s++) {
      for (let c = 0; c < 4; c++) {
        const cell = s * 4 + c;
        for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
          const fx = x - 7.5, fy = y - 7.5;
          if (!SHAPES[s](fx, fy, x, y)) continue;
          let col = COLORS[c];
          if (s === 6) { // 顔
            if ((y >= 4 && y <= 6) && (x === 5 || x === 6 || x === 9 || x === 10)) col = 0x202020;
            else if (y >= 9 && y <= 11 && Math.abs(fx) <= 4 && (y === 11 || Math.abs(fx) >= 3)) col = 0x202020;
          }
          put(sp, cell, x, y, col);
        }
      }
    }
    // BGタイル
    const solid = (cell, f) => { for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) { const c = f(x, y); if (c !== null) put(bg, cell, x, y, c); } };
    solid(1, (x, y) => (x === 0 || y === 0 ? 0xf0f0f0 : x === 15 || y === 15 ? 0x808080 : 0xc8c8c8)); // ブロック
    solid(2, (x, y) => (y % 8 === 7 || (x + (y >> 3) * 8) % 16 === 15 ? 0xe0c8b8 : 0xc04030));       // れんが
    solid(3, (x, y) => (y < 4 ? 0x30a030 : 0x805020));                                                 // 草地
    solid(4, (x, y) => (((x + Math.round(2 * Math.sin(y * 0.8))) & 7) < 2 ? 0x60a0ff : 0x2060d0));     // 水
    solid(5, () => 0xe0c070);                                                                           // 砂
    solid(6, (x, y) => ((x * 7 + y * 13) % 11 < 2 ? 0x909090 : 0x707070));                              // 石
    solid(7, () => 0x60b0ff);                                                                           // 空
    solid(8, () => 0x000000);                                                                           // 黒
    solid(9, (x, y) => (((x >> 2) + (y >> 2)) & 1 ? 0xa0a0a0 : 0xe0e0e0));                              // 市松
    [0xff0000, 0x00c000, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff].forEach((c, i) => solid(10 + i, () => c));
  }

  // ------------------------------------------------------------ Sprites
  class Sprites {
    constructor(screen) {
      this.s = screen; this.dirty = true;
      this.reset();
    }
    reset() {
      this.sp = new Map(); this.defs = new Map();
      this.bg = [null, null, null, null];
      this.dirty = true;
    }
    static attach(screen) {
      const sp = new Sprites(screen);
      screen.spr = sp;
      initDefaults(screen);
      return sp;
    }
    acls() { this.reset(); initDefaults(this.s); }

    // ---- 定義
    resolve(n) {
      const d = this.defs.get(n);
      if (d) return d;
      if (Number.isInteger(n) && n >= 0 && n < 1024) return { u: (n % PER_ROW) * CELL, v: Math.floor(n / PER_ROW) * CELL, w: CELL, h: CELL, hx: 0, hy: 0 };
      throw illegal('スプライト定義番号は 0〜1023');
    }
    spdef(n, u, v, w, h, hx, hy) {
      n = Math.trunc(n);
      if (n < 0 || n > 4095 || w < 1 || h < 1) throw illegal();
      this.defs.set(n, { u: Math.trunc(u), v: Math.trunc(v), w: Math.trunc(w), h: Math.trunc(h), hx: hx || 0, hy: hy || 0 });
    }
    get(id) {
      const sp = this.sp.get(Math.trunc(id));
      if (!sp) throw notUsed(id);
      return sp;
    }
    checkId(id) {
      id = Math.trunc(id);
      if (!(id >= 0 && id < MAX_SP)) throw illegal(`スプライト番号は 0〜${MAX_SP - 1}`);
      return id;
    }
    spset(a) { // [id, def] または [id, u, v, w, h[, attr]]
      const id = this.checkId(a[0]);
      let d, attr = 1;
      if (a.length === 2) d = this.resolve(Math.trunc(a[1]));
      else if (a.length >= 5) { d = { u: a[1], v: a[2], w: a[3], h: a[4], hx: 0, hy: 0 }; if (a.length >= 6) attr = a[5]; }
      else throw illegal('SPSET id,定義番号  または  SPSET id,u,v,w,h[,属性]');
      const old = this.sp.get(id);
      this.sp.set(id, {
        id, u: d.u, v: d.v, w: d.w, h: d.h, x: 0, y: 0, z: 0, rot: 0, sx: 1, sy: 1, hx: d.hx, hy: d.hy,
        show: !!(attr & 1), tint: 0xffffff, col: null, vars: [0, 0, 0, 0, 0, 0, 0, 0], anim: {},
      });
      void old; this.dirty = true;
    }
    spclr(id) {
      if (id === undefined || id === null) this.sp.clear(); else { this.checkId(id); this.sp.delete(Math.trunc(id)); }
      this.dirty = true;
    }
    spchr(id, n) {
      const sp = this.get(id), d = this.resolve(Math.trunc(n));
      sp.u = d.u; sp.v = d.v; sp.w = d.w; sp.h = d.h; sp.hx = d.hx; sp.hy = d.hy; this.dirty = true;
    }
    spofs(id, x, y, z) { const sp = this.get(id); sp.x = x; sp.y = y; if (z !== undefined && z !== null) sp.z = z; this.dirty = true; }
    spofsGet(id) { const sp = this.get(id); return [sp.x, sp.y, sp.z]; }
    sprot(id, deg) { this.get(id).rot = deg; this.dirty = true; }
    sprotGet(id) { return [this.get(id).rot]; }
    spscale(id, sx, sy) { const sp = this.get(id); sp.sx = sx; sp.sy = sy; this.dirty = true; }
    spscaleGet(id) { const sp = this.get(id); return [sp.sx, sp.sy]; }
    sphome(id, x, y) { const sp = this.get(id); sp.hx = x; sp.hy = y; this.dirty = true; }
    spcolor(id, rgb) { this.get(id).tint = rgb & 0xffffff; this.dirty = true; }
    spshow(id, on) { this.get(id).show = on; this.dirty = true; }
    spcol(id, x, y, w, h) { this.get(id).col = { x, y, w, h }; }
    spvar(id, n) { n = Math.trunc(n); if (!(n >= 0 && n < 8)) throw illegal('SPVAR の番号は 0〜7'); return this.get(id).vars[n]; }
    spvarSet(id, n, v) { n = Math.trunc(n); if (!(n >= 0 && n < 8)) throw illegal('SPVAR の番号は 0〜7'); this.get(id).vars[n] = v; }
    used(id) { return this.sp.has(Math.trunc(id)) ? 1 : 0; }

    // ---- 当たり判定(回転は無視した外接の四角形で判定)
    rect(sp) {
      const c = sp.col || { x: 0, y: 0, w: sp.w, h: sp.h };
      const ax = sp.x + (c.x - sp.hx) * sp.sx, bx = ax + c.w * sp.sx;
      const ay = sp.y + (c.y - sp.hy) * sp.sy, by = ay + c.h * sp.sy;
      return [Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by)];
    }
    overlap(a, b) { return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]; }
    hitsp(a, b) {
      const A = this.get(a);
      if (b !== undefined) return this.overlap(this.rect(A), this.rect(this.get(b))) ? 1 : 0;
      const ra = this.rect(A);
      const ids = [...this.sp.keys()].sort((p, q) => p - q);
      for (const id of ids) if (id !== A.id && this.sp.get(id).show && this.overlap(ra, this.rect(this.sp.get(id)))) return id;
      return -1;
    }
    hitrc(id, x, y, w, h) { return this.overlap(this.rect(this.get(id)), [x, y, x + w, y + h]) ? 1 : 0; }

    // ---- アニメーション
    // XY:(時間,x,y) R:(時間,角度) S:(時間,sx,sy) C:(時間,色) I:(時間,定義番号) ... [,くり返し回数]  (時間の単位はフレーム=1/60秒)
    spanim(id, target, a) {
      const sp = this.get(id);
      target = String(target).toUpperCase();
      const n = { XY: 3, R: 2, S: 3, C: 2, I: 2 }[target];
      if (!n) throw illegal('SPANIM の対象は "XY" "R" "S" "C" "I"');
      let loop = 1;
      a = a.slice();
      if (a.length % n === 1) loop = Math.trunc(a.pop());
      if (a.length === 0 || a.length % n) throw illegal(`SPANIM "${target}" は ${n} 個ずつの値の並びです`);
      const keys = [];
      for (let i = 0; i < a.length; i += n) keys.push({ t: Math.max(1, Math.trunc(a[i])), v: a.slice(i + 1, i + n) });
      const from = target === 'XY' ? [sp.x, sp.y] : target === 'R' ? [sp.rot] : target === 'S' ? [sp.sx, sp.sy] : target === 'C' ? [sp.tint] : null;
      sp.anim[target] = { keys, loop, from, el: 0, total: keys.reduce((s, k) => s + k.t, 0) };
      this.dirty = true;
    }
    tick(frames) {
      if (!frames) return;
      for (const sp of this.sp.values()) {
        for (const tg of Object.keys(sp.anim)) {
          const an = sp.anim[tg];
          an.el += frames;
          let el = an.el, done = false;
          if (an.loop === 0 || an.loop > 1) {
            if (an.loop === 0) el %= an.total;
            else if (el >= an.total * an.loop) { el = an.total; done = true; } else el %= an.total;
          } else if (el >= an.total) { el = an.total; done = true; }
          this.applyAnim(sp, tg, an, el, done);
          if (done) delete sp.anim[tg];
        }
      }
      this.dirty = true;
    }
    applyAnim(sp, tg, an, el, done) {
      let acc = 0, prev = an.from;
      for (let i = 0; i < an.keys.length; i++) {
        const k = an.keys[i];
        if (el <= acc + k.t || i === an.keys.length - 1) {
          const f = Math.min(1, Math.max(0, (el - acc) / k.t));
          if (tg === 'I') { sp.anim.I = an; const d = this.resolve(Math.trunc(k.v[0])); sp.u = d.u; sp.v = d.v; sp.w = d.w; sp.h = d.h; return; }
          const lerp = (j) => prev[j] + (k.v[j] - prev[j]) * f;
          if (tg === 'XY') { sp.x = lerp(0); sp.y = lerp(1); }
          else if (tg === 'R') sp.rot = lerp(0);
          else if (tg === 'S') { sp.sx = lerp(0); sp.sy = lerp(1); }
          else if (tg === 'C') {
            const a = prev[0], b = k.v[0], mix = (sh) => Math.round(((a >> sh) & 255) + (((b >> sh) & 255) - ((a >> sh) & 255)) * f);
            sp.tint = (mix(16) << 16) | (mix(8) << 8) | mix(0);
          }
          return;
        }
        acc += k.t;
        prev = tg === 'I' ? null : k.v;
      }
    }

    // ---- BG
    layer(n) {
      n = Math.trunc(n);
      if (!(n >= 0 && n < 4)) throw illegal('BGの番号は 0〜3');
      return n;
    }
    bgscreen(n, w, h) {
      n = this.layer(n); w = Math.trunc(w); h = Math.trunc(h);
      if (w < 1 || h < 1 || w > 256 || h > 256) throw illegal('BGの大きさは 1〜256 マス');
      this.bg[n] = { w, h, data: new Uint16Array(w * h), ox: 0, oy: 0, show: true };
      this.dirty = true;
    }
    lay(n) {
      n = this.layer(n);
      if (!this.bg[n]) this.bgscreen(n, 64, 64);
      return this.bg[n];
    }
    bgput(n, x, y, chr) {
      const b = this.lay(n); x = Math.trunc(x); y = Math.trunc(y);
      if (!(x >= 0 && x < b.w && y >= 0 && y < b.h)) throw illegal('BGの座標が範囲外です');
      b.data[y * b.w + x] = chr & 0xffff; this.dirty = true;
    }
    bgfill(n, x1, y1, x2, y2, chr) {
      const b = this.lay(n);
      const ax = Math.max(0, Math.trunc(Math.min(x1, x2))), bx = Math.min(b.w - 1, Math.trunc(Math.max(x1, x2)));
      const ay = Math.max(0, Math.trunc(Math.min(y1, y2))), by = Math.min(b.h - 1, Math.trunc(Math.max(y1, y2)));
      for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) b.data[y * b.w + x] = chr & 0xffff;
      this.dirty = true;
    }
    bgget(n, x, y) {
      const b = this.lay(n); x = Math.trunc(x); y = Math.trunc(y);
      if (!(x >= 0 && x < b.w && y >= 0 && y < b.h)) throw illegal('BGの座標が範囲外です');
      return b.data[y * b.w + x];
    }
    bgofs(n, x, y) { const b = this.lay(n); b.ox = x; b.oy = y; this.dirty = true; }
    bgofsGet(n) { const b = this.lay(n); return [b.ox, b.oy]; }
    bgclr(n) {
      if (n === undefined || n === null) this.bg = [null, null, null, null]; else this.bg[this.layer(n)] = null;
      this.dirty = true;
    }
    bgshow(n, on) { this.lay(n).show = on; this.dirty = true; }

    // ---- 合成(奥から: BG3 → BG0 → スプライト(zの大きい順))
    compose(out, W, H) {
      for (let n = 3; n >= 0; n--) if (this.bg[n] && this.bg[n].show) this.drawBG(out, W, H, this.bg[n]);
      const list = [...this.sp.values()].filter((s) => s.show).sort((a, b) => b.z - a.z || a.id - b.id);
      for (const s of list) this.drawSprite(out, W, H, s);
    }
    drawBG(out, W, H, b) {
      const pg = this.s.getPage(5), PW = b.w * CELL, PH = b.h * CELL;
      const ox = Math.round(b.ox), oy = Math.round(b.oy);
      for (let y = 0; y < H; y++) {
        const ly = (((y + oy) % PH) + PH) % PH, cy = (ly / CELL) | 0, iy = ly % CELL;
        for (let x = 0; x < W; x++) {
          const lx = (((x + ox) % PW) + PW) % PW, cx = (lx / CELL) | 0;
          const cell = b.data[cy * b.w + cx];
          const chr = cell & 0xfff;
          if (chr === 0) continue;
          let ix = lx % CELL, jy = iy;
          if (cell & 0x8000) ix = CELL - 1 - ix;   // 左右反転
          if (cell & 0x4000) jy = CELL - 1 - jy;   // 上下反転
          const v = pg.fb[((((chr / PER_ROW) | 0) * CELL) + jy) * pg.w + (chr % PER_ROW) * CELL + ix];
          if (v >>> 24) out[y * W + x] = v;
        }
      }
    }
    drawSprite(out, W, H, s) {
      const pg = this.s.getPage(4);
      const th = (s.rot * Math.PI) / 180, c = Math.cos(th), sn = Math.sin(th);
      if (s.sx === 0 || s.sy === 0) return;
      // 外接する範囲を求める
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const [px, py] of [[0, 0], [s.w, 0], [0, s.h], [s.w, s.h]]) {
        const ax = (px - s.hx) * s.sx, ay = (py - s.hy) * s.sy;
        const X = s.x + ax * c - ay * sn, Y = s.y + ax * sn + ay * c;
        minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, Y); maxY = Math.max(maxY, Y);
      }
      const x0 = Math.max(0, Math.floor(minX)), x1 = Math.min(W - 1, Math.ceil(maxX));
      const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(H - 1, Math.ceil(maxY));
      const tr = (s.tint >> 16) & 255, tg = (s.tint >> 8) & 255, tb = s.tint & 255, tinted = s.tint !== 0xffffff;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - s.x, dy = y + 0.5 - s.y;
          const rx = dx * c + dy * sn, ry = -dx * sn + dy * c; // 逆回転
          const u = Math.floor(rx / s.sx + s.hx), v = Math.floor(ry / s.sy + s.hy);
          if (u < 0 || v < 0 || u >= s.w || v >= s.h) continue;
          const U = s.u + u, V = s.v + v;
          if (U >= pg.w || V >= pg.h) continue;
          let p = pg.fb[V * pg.w + U];
          if (!(p >>> 24)) continue;
          if (tinted) { // ABGR: 下位から R,G,B
            p = (0xff000000 | (((((p >> 16) & 255) * tb / 255) | 0) << 16) | (((((p >> 8) & 255) * tg / 255) | 0) << 8) | ((((p & 255) * tr / 255) | 0))) >>> 0;
          }
          out[y * W + x] = p;
        }
      }
    }
  }

  NS.Sprites = Sprites;
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
