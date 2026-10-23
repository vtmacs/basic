# MACS BASIC シミュレータ

Tiny BASIC / N88互換BASIC / Full BASIC / SmileBASIC互換 の4つの方言をブラウザで動かせる、依存ライブラリなしの静的サイトです。
`index.html` を開く(または `/basic/` に配置する)だけで動きます。ビルド不要。

| ページ | 内容 |
| --- | --- |
| `index.html` | シミュレータ本体(方言タブ・エディタ・文字/グラフィック画面・サンプル・保存/読込) |
| `manual-tiny.html` `manual-n88.html` `manual-full.html` `manual-smile.html` | 方言ごとのマニュアル |
| `compare.html` | 方言の比較(一覧表・同じプログラムの4方言版・移植のポイント) |

## 構成

```
index.html, manual-*.html, compare.html   ページ(manual/compare は tools/ から生成)
css/style.css                             共通CSS。<html data-dialect="..."> で方言ごとに配色が変わる
js/screen.js                              文字グリッド+ピクセルフレームバッファ(DOM非依存)
js/basic-core.js                          方言定義・字句解析・組込み関数・PRINT USING
js/basic-compiler.js                      ソース → 命令列(クロージャ)へのコンパイラ
js/basic-vm.js                            実行系(変数/配列/呼び出し/INPUT/グラフィック/エラー処理/ファイル)
js/sprites.js                             SmileBASIC互換 のスプライト・BG・標準の絵・合成
js/samples.js                             サンプルプログラム
js/app.js                                 UI(エディタ・入力欄・キー/マウス・音)
tools/build-docs.js, tools/docs/*.js      マニュアル・比較ページの生成元
tests/                                    テスト
```

## マニュアルの更新

本文は `tools/docs/*.js` にあります。編集したら次で HTML を作り直します。

```
node tools/build-docs.js
```

本文中のサンプルプログラムはすべて `tests/doc-examples.js` で実際に実行され、エラーにならないことが確認されます。

## テスト

```
npm test                 # 言語仕様の回帰テスト + サンプル + マニュアル内サンプル
node tests/ui-test.js    # ブラウザ操作テスト(Playwright が必要)
```

## 方言の追加

`js/basic-core.js` の `DIALECTS` に定義を足し、`js/basic-compiler.js` の `H`(文ハンドラ)と `js/basic-core.js` の `FN`(関数表)で使えるキーワードを増やします。

## GitHub Pages で公開する

`.github/workflows/pages.yml` が、`main` への push のたびにテストを実行し、公開に必要なファイル(`index.html`・`manual*.html`・`compare.html`・`css/`・`js/`)だけを GitHub Pages にデプロイします。ビルドや外部サービスは不要です。

1. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする。
2. **Settings → Branches** で、デフォルトブランチを `main` にする(`github-pages` 環境はデフォルトブランチからのデプロイしか許可しないため)。
3. PR を `main` にマージする(または Actions タブの「Deploy to GitHub Pages」を手動実行する)。
4. 公開URL: `https://<ユーザー名>.github.io/<リポジトリ名>/`(例: https://vtmacs.github.io/basic/)。

`.github/workflows/ci.yml` は、PR と `main` で `npm test` と「生成済みHTMLが `tools/docs` と一致しているか」を確認します。

## 商標・権利について

- 「N88-BASIC」「PC-8801」「PC-9801」は日本電気株式会社の、「SmileBASIC」は株式会社スマイルブームの、「Microsoft」は Microsoft Corporation の商標または登録商標です。
- このプロジェクトは非公式で、これらの会社とは関係がなく、承認・提携を受けていません。このサイトの「N88互換BASIC」「SmileBASIC互換」は、それらの文法や使い方を参考にした**互換実装**であることを示す名前です(表示名は `js/app.js` の `LABELS`、`tools/build-docs.js` の `LABEL` と、`tools/docs/*.js` の本文にあります)。
- 各社の製品・ROM・フォント・画像・マニュアルの文章は一切含みません。標準のスプライト/タイルの絵(`js/sprites.js`)、サンプル、マニュアルの文章はすべてこのプロジェクト独自のものです。
- 同じ注記は、全ページのフッターに表示されます(`index.html` と `tools/build-docs.js` の `LEGAL`)。
