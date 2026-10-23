#!/usr/bin/env node
/* マニュアル/比較ページ(静的HTML)を生成する:  node tools/build-docs.js
 * 内容は tools/docs/*.js にあり、本文中のサンプルは tests/doc-examples.js で実際に実行して検証される。 */
const fs = require('fs');
const path = require('path');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LABEL = { tiny: 'Tiny BASIC', n88: 'N88-BASIC', full: 'Full BASIC', smile: 'smile BASIC' };
const ORDER = ['tiny', 'n88', 'full', 'smile'];

function makeHelpers(dialect, collected) {
  const h = {};
  h.esc = esc;
  h.ex = (code, title, opts) => {
    code = code.replace(/^\n/, '');
    if (collected) collected.push({ dialect, title: title || '', code, opts: opts || {} });
    const href = `index.html?d=${dialect}&code=${encodeURIComponent(code)}`;
    return `<div class="ex"><div class="ex-title"><span>${esc(title || '例')}</span><a class="try" href="${href}">シミュレータで試す ▶</a></div><pre class="code">${esc(code)}</pre></div>`;
  };
  h.code = (code) => `<pre class="code">${esc(code.replace(/^\n/, ''))}</pre>`;
  h.table = (head, rows) =>
    `<table class="doc"><thead><tr>${head.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  h.cmds = (rows) =>
    h.table(['命令', '書式', '説明'], rows.map(([n, s, d]) => [`<code>${esc(n)}</code>`, s ? `<code>${esc(s)}</code>` : '', d]));
  h.funcs = (rows) =>
    h.table(['関数', '書式', '説明'], rows.map(([n, s, d]) => [`<code>${esc(n)}</code>`, `<code>${esc(s)}</code>`, d]));
  h.note = (t) => `<div class="note">${t}</div>`;
  h.tip = (t) => `<div class="note tip">${t}</div>`;
  return h;
}

function shell({ dialect, title, desc, nav, body, toc }) {
  const links = ORDER.map((d) => `<a href="manual-${d}.html"${nav === 'manual-' + d ? ' aria-current="page"' : ''}>${LABEL[d]}</a>`).join('');
  const dattr = dialect ? ` data-dialect="${dialect}"` : '';
  return `<!doctype html>
<html lang="ja"${dattr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | MACS Project</title>
<meta name="description" content="${esc(desc)}">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html">MACS Project<small>BASIC シミュレータ</small></a>
    <nav class="site-nav" aria-label="サイト内メニュー">
      <a href="index.html${dialect ? '#' + dialect : ''}">シミュレータ</a>
      <a href="manual-${dialect || 'n88'}.html"${nav && nav.startsWith('manual') ? ' aria-current="page"' : ''}>マニュアル</a>
      <a href="compare.html"${nav === 'compare' ? ' aria-current="page"' : ''}>方言の比較</a>
    </nav>
  </div>
  <div class="strip"></div>
</header>
<main class="wrap">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <span>© MACS Project</span>
    <span>マニュアル: ${links}</span>
    <span><a href="compare.html">方言の比較</a> / <a href="index.html">シミュレータ</a></span>
  </div>
</footer>
</body>
</html>
`;
}

function manualPage(d, doc, h) {
  const sections = doc.sections(h);
  const toc = sections.map((s) => `<a href="#${s.id}">${s.title}</a>`).join('');
  const body = `
<h1>${esc(doc.title)}</h1>
<p class="lead">${doc.lead}</p>
<div class="doc-layout">
  <nav class="toc" aria-label="目次"><b>目次</b>${toc}<a href="compare.html">▶ 方言の比較</a><a href="index.html#${d}">▶ シミュレータで試す</a></nav>
  <article>
${sections.map((s) => `<section id="${s.id}"><h2>${s.title}</h2>\n${s.html}\n</section>`).join('\n')}
  </article>
</div>`;
  return shell({ dialect: d, title: doc.title, desc: doc.lead.replace(/<[^>]+>/g, ''), nav: 'manual-' + d, body });
}

function buildAll(opts) {
  opts = opts || {};
  const collected = opts.collect ? [] : null;
  const out = {};
  for (const d of ORDER) {
    const doc = require(`./docs/${d}.js`);
    out[`manual-${d}.html`] = manualPage(d, doc, makeHelpers(d, collected));
  }
  const cmp = require('./docs/compare.js');
  const hh = (dd) => makeHelpers(dd, collected);
  out['compare.html'] = shell({ dialect: null, title: '方言の比較', desc: 'Tiny BASIC・N88-BASIC・Full BASIC・smile BASIC の違いを一覧で比較', nav: 'compare', body: cmp.page(hh, esc, LABEL) });
  return { files: out, examples: collected };
}

if (require.main === module) {
  const { files } = buildAll();
  const root = path.join(__dirname, '..');
  for (const [name, html] of Object.entries(files)) {
    fs.writeFileSync(path.join(root, name), html);
    console.log('wrote', name, (html.length / 1024).toFixed(1) + 'KB');
  }
}
module.exports = { buildAll };
