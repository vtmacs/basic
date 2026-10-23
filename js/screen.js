/* MACS BASIC Simulator - Screen (text grid + pixel framebuffer). DOM非依存、描画時のみcanvasを使う */
(function (root) {
  'use strict';
  const NS = (root.MacsBasic = root.MacsBasic || {});

  function isWide(ch) {
    const c = ch.codePointAt(0);
    if (c < 0x2E80) return false;
    if (c >= 0xFF61 && c <= 0xFF9F) return false; // 半角カナ
    return true;
  }
  const toABGR = (rgb) => (0xff000000 | ((rgb & 0xff) << 16) | (rgb & 0xff00) | ((rgb >> 16) & 0xff)) >>> 0;
  const fromABGR = (v) => ((v & 0xff) << 16) | (v & 0xff00) | ((v >>> 16) & 0xff);
  const css = (rgb) => '#' + (rgb & 0xffffff).toString(16).padStart(6, '0');

  class Screen {
    constructor(o) {
      this.cols = o.cols; this.rows = o.rows; this.gw = o.gw; this.gh = o.gh;
      this.gw0 = o.gw; this.gh0 = o.gh;
      this.bg = o.bg; this.fg = o.fg;
      this.transparent = !!o.transparent; // true: グラフィック面の初期色は透明(smile BASIC)
      this.reset();
    }
    reset() {
      const N = this.cols * this.rows;
      this.ch = new Array(N).fill(' ');
      this.fgc = new Int32Array(N).fill(this.fg);
      this.bgc = new Int32Array(N).fill(-1);
      this.cx = 0; this.cy = 0;
      this.curFg = this.fg; this.curBg = -1;
      this.gw = this.dispW = this.gw0; this.gh = this.dispH = this.gh0;
      // グラフィックページ: 0 は表示面、1〜5 は 512x512 (必要になったときに作る)
      this.pages = { 0: { fb: new Uint32Array(this.gw * this.gh).fill(this.transparent ? 0 : toABGR(this.bg)), w: this.gw, h: this.gh } };
      this.fb = this.pages[0].fb;
      this.drawPage = 0; this.dispPage = 0;
      this.spr = null; // スプライト/BG (sprites.js)
      this.lastX = 0; this.lastY = 0;
      this.dirtyT = true; this.dirtyG = true;
      this.cursorOn = false;
    }
    setSize(cols, rows) {
      this.cols = cols; this.rows = rows;
      const N = cols * rows;
      this.ch = new Array(N).fill(' ');
      this.fgc = new Int32Array(N).fill(this.curFg);
      this.bgc = new Int32Array(N).fill(-1);
      this.cx = 0; this.cy = 0; this.dirtyT = true;
    }
    // ---------- text ----------
    cls() {
      this.ch.fill(' '); this.fgc.fill(this.curFg); this.bgc.fill(-1);
      this.cx = 0; this.cy = 0; this.dirtyT = true;
    }
    locate(x, y) {
      this.cx = Math.max(0, Math.min(this.cols - 1, x | 0));
      this.cy = Math.max(0, Math.min(this.rows - 1, y | 0));
    }
    color(fg, bg) {
      if (fg !== undefined && fg !== null) this.curFg = fg;
      if (bg !== undefined && bg !== null) this.curBg = bg;
    }
    scroll() {
      const c = this.cols, N = this.cols * this.rows;
      this.ch.copyWithin(0, c, N); this.fgc.copyWithin(0, c, N); this.bgc.copyWithin(0, c, N);
      this.ch.fill(' ', N - c); this.fgc.fill(this.curFg, N - c); this.bgc.fill(-1, N - c);
      this.dirtyT = true;
    }
    newline() {
      this.cx = 0; this.cy++;
      if (this.cy >= this.rows) { this.scroll(); this.cy = this.rows - 1; }
      this.dirtyT = true;
    }
    write(s) {
      s = String(s);
      for (const chr of s) {
        if (chr === '\n') { this.newline(); continue; }
        if (chr === '\r') { this.cx = 0; continue; }
        if (chr === '\b') { if (this.cx > 0) this.cx--; continue; }
        if (chr < ' ') continue;
        const w = isWide(chr) ? 2 : 1;
        if (this.cx + w > this.cols) this.newline();
        const i = this.cy * this.cols + this.cx;
        this.ch[i] = chr; this.fgc[i] = this.curFg; this.bgc[i] = this.curBg;
        if (w === 2) { this.ch[i + 1] = ''; this.fgc[i + 1] = this.curFg; this.bgc[i + 1] = this.curBg; }
        this.cx += w;
      }
      this.dirtyT = true;
    }
    charAt(x, y) { return this.ch[y * this.cols + x] || ''; }
    textLines() {
      const out = [];
      for (let y = 0; y < this.rows; y++) out.push(this.ch.slice(y * this.cols, (y + 1) * this.cols).join('').replace(/\s+$/, ''));
      return out;
    }
    text() { return this.textLines().join('\n').replace(/\n+$/, ''); }

    // ---------- graphics ----------
    gcls(rgb) { this.fb.fill(rgb === undefined ? (this.transparent ? 0 : toABGR(this.bg)) : toABGR(rgb)); this.dirtyG = true; }
    getPage(n) {
      if (!this.pages[n]) this.pages[n] = { fb: new Uint32Array(512 * 512), w: 512, h: 512 };
      return this.pages[n];
    }
    usePage(n) { const p = this.getPage(n); this.fb = p.fb; this.gw = p.w; this.gh = p.h; this.drawPage = n; }
    withPage(n, fn) { const keep = this.drawPage; this.usePage(n); try { return fn(); } finally { this.usePage(keep); } }
    gcopy(sp, x1, y1, x2, y2, dx, dy, all) {
      const src = this.getPage(sp), dst = this.pages[this.drawPage];
      const ax = Math.round(Math.min(x1, x2)), bx = Math.round(Math.max(x1, x2));
      const ay = Math.round(Math.min(y1, y2)), by = Math.round(Math.max(y1, y2));
      dx = Math.round(dx); dy = Math.round(dy);
      const tmp = [];
      for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) tmp.push(x >= 0 && y >= 0 && x < src.w && y < src.h ? src.fb[y * src.w + x] : 0);
      let k = 0;
      for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++, k++) {
        const X = x - ax + dx, Y = y - ay + dy, v = tmp[k];
        if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
        if (all || (v >>> 24)) dst.fb[Y * dst.w + X] = v;
      }
      this.dirtyG = true;
    }
    // 表示用に合成した画面(透明部分を背景色にし、BGとスプライトを重ねる)
    needsCompose() { return this.transparent || !!this.spr; }
    compose() {
      const W = this.dispW, H = this.dispH;
      if (!this._out || this._out.length !== W * H) this._out = new Uint32Array(W * H);
      const out = this._out, pg = this.getPage(this.dispPage), bgv = toABGR(this.bg);
      for (let y = 0; y < H; y++) {
        let si = y * pg.w, di = y * W;
        for (let x = 0; x < W; x++) { const v = pg.fb[si++]; out[di++] = (v >>> 24) ? v : bgv; }
      }
      if (this.spr) this.spr.compose(out, W, H);
      return out;
    }
    needsGfx() { return this.dirtyG || !!(this.spr && this.spr.dirty); }
    pset(x, y, rgb) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= this.gw || y >= this.gh) return;
      this.fb[y * this.gw + x] = toABGR(rgb); this.dirtyG = true;
    }
    point(x, y) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= this.gw || y >= this.gh) return -1;
      return fromABGR(this.fb[y * this.gw + x]);
    }
    line(x1, y1, x2, y2, rgb) {
      x1 = Math.round(x1); y1 = Math.round(y1); x2 = Math.round(x2); y2 = Math.round(y2);
      const dx = Math.abs(x2 - x1), dy = -Math.abs(y2 - y1);
      const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
      let err = dx + dy, guard = 0;
      for (;;) {
        this.pset(x1, y1, rgb);
        if (x1 === x2 && y1 === y2) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x1 += sx; }
        if (e2 <= dx) { err += dx; y1 += sy; }
        if (++guard > 100000) break;
      }
    }
    hline(x1, x2, y, rgb) {
      y = Math.round(y); if (y < 0 || y >= this.gh) return;
      let a = Math.round(Math.min(x1, x2)), b = Math.round(Math.max(x1, x2));
      a = Math.max(a, 0); b = Math.min(b, this.gw - 1);
      const v = toABGR(rgb);
      for (let x = a; x <= b; x++) this.fb[y * this.gw + x] = v;
      this.dirtyG = true;
    }
    box(x1, y1, x2, y2, rgb, fill) {
      if (fill) {
        const a = Math.round(Math.min(y1, y2)), b = Math.round(Math.max(y1, y2));
        for (let y = a; y <= b; y++) this.hline(x1, x2, y, rgb);
      } else {
        this.line(x1, y1, x2, y1, rgb); this.line(x2, y1, x2, y2, rgb);
        this.line(x2, y2, x1, y2, rgb); this.line(x1, y2, x1, y1, rgb);
      }
    }
    arc(cx, cy, rx, ry, a0, a1, rgb) {
      const n = Math.max(24, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry, 1) / 2));
      let px = null, py = null;
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * i / n;
        const x = cx + rx * Math.cos(a), y = cy - ry * Math.sin(a);
        if (px !== null) this.line(px, py, x, y, rgb); else this.pset(x, y, rgb);
        px = x; py = y;
      }
    }
    ellipse(cx, cy, rx, ry, rgb, fill) {
      if (fill) {
        for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
          const t = ry === 0 ? 0 : (y - cy) / ry;
          const w = rx * Math.sqrt(Math.max(0, 1 - t * t));
          this.hline(cx - w, cx + w, y, rgb);
        }
      } else this.arc(cx, cy, rx, ry, 0, Math.PI * 2, rgb);
    }
    polygon(pts, rgb) { // 偶奇規則の塗りつぶし
      if (pts.length < 3) return;
      let minY = Infinity, maxY = -Infinity;
      for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
      minY = Math.max(0, Math.ceil(minY)); maxY = Math.min(this.gh - 1, Math.floor(maxY));
      for (let y = minY; y <= maxY; y++) {
        const xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        xs.sort((p, q) => p - q);
        for (let i = 0; i + 1 < xs.length; i += 2) this.hline(xs[i], xs[i + 1], y, rgb);
      }
    }
    paint(x, y, rgb, border) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= this.gw || y >= this.gh) return;
      const W = this.gw, H = this.gh, fb = this.fb;
      const fillV = toABGR(rgb);
      const seed = fb[y * W + x];
      const bv = border === null || border === undefined ? null : toABGR(border);
      const ok = (px, py) => { const v = fb[py * W + px]; return bv === null ? v === seed && v !== fillV : v !== bv && v !== fillV; };
      if (bv === null && seed === fillV) return;
      if (bv !== null && seed === bv) return;
      const stack = [[x, y]]; let guard = 0;
      while (stack.length && guard++ < 2000000) {
        let [sx, sy] = stack.pop();
        if (!ok(sx, sy)) continue;
        let l = sx, r = sx;
        while (l > 0 && ok(l - 1, sy)) l--;
        while (r < W - 1 && ok(r + 1, sy)) r++;
        for (let i = l; i <= r; i++) fb[sy * W + i] = fillV;
        for (const ny of [sy - 1, sy + 1]) {
          if (ny < 0 || ny >= H) continue;
          let inRun = false;
          for (let i = l; i <= r; i++) {
            if (ok(i, ny)) { if (!inRun) { stack.push([i, ny]); inRun = true; } } else inRun = false;
          }
        }
      }
      this.dirtyG = true;
    }
    // canvasが使える環境ではグラフィック面へ文字を描く
    gtext(x, y, s, rgb, size) {
      if (typeof document === 'undefined') return;
      size = size || 16;
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      ctx.font = size + 'px "Courier New","Noto Sans Mono CJK JP","MS Gothic",monospace';
      const w = Math.max(1, Math.ceil(ctx.measureText(s).width)) + 2;
      c.width = w; c.height = size + 4;
      ctx.font = size + 'px "Courier New","Noto Sans Mono CJK JP","MS Gothic",monospace';
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.fillText(s, 0, 1);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
        if (d[(j * c.width + i) * 4 + 3] > 110) this.pset(x + i, y + j, rgb);
      }
    }

    // ---------- 描画(ブラウザ) ----------
    renderGfx(ctx) {
      const W = this.dispW, H = this.dispH;
      if (!this._img || this._img.width !== W || this._img.height !== H) this._img = ctx.createImageData(W, H);
      new Uint32Array(this._img.data.buffer).set(this.needsCompose() ? this.compose() : this.pages[0].fb);
      ctx.putImageData(this._img, 0, 0);
      this.dirtyG = false;
      if (this.spr) this.spr.dirty = false;
    }
    renderText(ctx, W, H, fontFamily) {
      ctx.clearRect(0, 0, W, H);
      const cw = W / this.cols, chh = H / this.rows;
      const fs = Math.floor(chh * 0.82);
      ctx.font = fs + 'px ' + (fontFamily || 'monospace');
      ctx.textBaseline = 'middle';
      const mw = ctx.measureText('M').width || fs * 0.6;
      const sxN = Math.min(2.2, Math.max(1, cw / mw));
      const sxW = Math.min(2.2, Math.max(1, (2 * cw) / fs));
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          const i = y * this.cols + x;
          const bg = this.bgc[i];
          if (bg >= 0) { ctx.fillStyle = css(bg); ctx.fillRect(x * cw, y * chh, cw * (this.ch[i + 1] === '' ? 2 : 1), chh); }
          const c = this.ch[i];
          if (c === ' ' || c === '') continue;
          ctx.fillStyle = css(this.fgc[i]);
          const wide = this.ch[i + 1] === '';
          const sx = wide ? sxW : sxN;
          if (sx > 1.08) {
            ctx.setTransform(sx, 0, 0, 1, x * cw + (wide ? 0 : 0), y * chh + chh / 2);
            ctx.fillText(c, 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          } else ctx.fillText(c, x * cw, y * chh + chh / 2, wide ? cw * 2 : cw);
        }
      }
      if (this.cursorOn) {
        ctx.fillStyle = css(this.curFg); ctx.globalAlpha = 0.6;
        ctx.fillRect(Math.min(this.cx, this.cols - 1) * cw, this.cy * chh + chh * 0.85, cw, Math.max(2, chh * 0.12));
        ctx.globalAlpha = 1;
      }
      this.dirtyT = false;
    }
  }
  Screen.fromABGR = fromABGR; Screen.toABGR = toABGR; Screen.css = css; Screen.isWide = isWide;
  NS.Screen = Screen;
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
