module.exports = {
  title: 'Tiny BASIC マニュアル',
  lead: '1975年ごろに生まれた、数KBのメモリでも動く最小のBASIC。行番号・整数・IF/GOTO/GOSUB だけで、プログラミングの原点を体験できます。',
  sections: (h) => [
    {
      id: 'about', title: 'Tiny BASIC とは',
      html: `
<p>Tiny BASIC は、まだパソコンのメモリが 4KB 前後しかなかった 1975 年ごろ、「小さなマイコンでも動くBASIC」として考えられた言語です。多くの処理系が作られ、その後の <a href="manual-n88.html">N88互換BASIC</a> などパソコン用BASICの先祖にあたります。</p>
<p>機能をぎりぎりまで削っているので、<b>FOR も、文字列変数も、小数もありません</b>。そのかわり、覚えることが少なく、「プログラムは上から順に実行され、IF と GOTO で流れが変わる」という基本がそのまま見えます。</p>
${h.tip('Tiny BASIC は実装ごとに細部が違います。このシミュレータは、よく知られた Tiny BASIC の文法(PRINT / IF / GOTO / GOSUB / RETURN / INPUT / LET / END / REM / RND)に、描画用の拡張命令を加えたものです。')}`,
    },
    {
      id: 'start', title: '画面とはじめかた',
      html: `
<ul>
<li>画面は緑色の文字画面(<b>80桁 × 25行</b>)と、重ねて表示される <b>640 × 400 ドット</b> のグラフィック面です。</li>
<li>左のエディタにプログラムを書き、<b>「▶ 実行」</b>(<kbd>Ctrl</kbd>+<kbd>Enter</kbd>)で実行します。</li>
<li><code>INPUT</code> で入力待ちになると、画面の下に入力欄が出ます。入力して <kbd>Enter</kbd> を押してください。</li>
<li>行番号のない行があると、「行番号がありません」というエラーになります。<b>「行番号をふる」</b>ボタンで10ずつ自動で付けられます。</li>
</ul>
${h.ex(`10 REM はじめてのTiny BASIC
20 PRINT "Hello, World!"
30 END`, 'Hello, World')}`,
    },
    {
      id: 'program', title: 'プログラムの書き方',
      html: `
<ul>
<li>すべての行は <b>行番号</b>(正の整数)で始めます。実行は行番号の小さい順です。入力順は関係ありません。</li>
<li>同じ行番号を2回書いたときは、あとの行が有効になります。<code>20</code> のように番号だけの行は、その行の削除を意味します。</li>
<li><b>1行に書ける文は1つ</b>だけです(<code>:</code> で区切って複数の文を書くことはできません)。</li>
<li>大文字・小文字は区別されません。</li>
<li>プログラムの最後は <code>END</code> を書くか、最終行まで実行すると終了します。</li>
<li>文字列(<code>"..."</code>)は <code>PRINT</code> と <code>INPUT</code> のメッセージとして使います。</li>
</ul>
${h.ex(`10 REM 行番号は飛び飛びに付けると、あとで間に追加できる
20 PRINT "B"
10 PRINT "A"
30 END`, '入力の順序と実行の順序')}`,
    },
    {
      id: 'data', title: '変数・数・演算子',
      html: `
<h3>変数</h3>
<p>変数名は <code>A</code>〜<code>Z</code> の<b>1文字だけ</b>(26個)。値は<b>整数</b>(-32767〜32767)です。文字列変数・小数はありません。</p>
<p>配列は <code>@(0)</code>〜<code>@(1023)</code> の1本だけ(<code>@(I)</code> のように添字に式が書けます)。</p>
${h.table(['種類', '例', '説明'], [
  ['数の定数', '<code>0</code> <code>123</code> <code>-5</code>', '整数のみ'],
  ['変数', '<code>A</code> <code>X</code> <code>Z</code>', 'A〜Z の1文字'],
  ['配列', '<code>@(1)</code> <code>@(I+1)</code>', '共通の1次元配列(0〜1023)'],
])}
<h3>演算子</h3>
${h.table(['演算子', '意味', '例'], [
  ['<code>+ - * /</code>', '足し算・引き算・かけ算・割り算(<b>小数点以下は切り捨て</b>)', '<code>7/2</code> → 3、<code>-7/2</code> → -3'],
  ['<code>( )</code>', '計算の順序を決める', '<code>(2+3)*4</code> → 20'],
  ['<code>= &lt;&gt; &gt;&lt; &lt; &gt; &lt;= &gt;=</code>', '比較(IF の条件に使う)。真は 1、偽は 0', '<code>A&lt;&gt;B</code>'],
])}
<p>計算結果が <b>-32767〜32767</b> を超えると「オーバーフロー」エラーになります(昔の16ビット整数と同じです)。</p>
${h.ex(`10 PRINT 7/2;" ";-7/2;" ";2+3*4;" ";(2+3)*4
20 PRINT 100/7*7
30 END`, '整数の計算')}`,
    },
    {
      id: 'statements', title: '命令リファレンス',
      html: `
${h.cmds([
  ['REM', 'REM コメント', '注釈。実行されません。'],
  ['LET', 'LET 変数 = 式', '変数に値を入れます。<code>LET</code> は省略できます(<code>A=5</code>)。'],
  ['PRINT', 'PRINT 項目 [; または , 項目 ...]', '画面に表示します。項目は式か <code>"文字列"</code>。くわしくは下の説明。'],
  ['INPUT', 'INPUT 変数 [, 変数 ...]', 'キーボードから数を入力します。複数のときは <code>3,4</code> のようにカンマで区切って入力。数以外を入れると「再入力」になります。'],
  ['IF', 'IF 式 比較 式 THEN 文', '条件が成り立つときだけ、THEN の後ろの文を実行します。THEN の後に行番号を書くと GOTO と同じ意味になります(<code>IF A=1 THEN 100</code>)。'],
  ['GOTO', 'GOTO 式', '指定の行へ飛びます。行番号は式でも構いません(<code>GOTO A*100</code>)。'],
  ['GOSUB', 'GOSUB 式', 'サブルーチン(指定の行から RETURN まで)を呼び出します。'],
  ['RETURN', 'RETURN', 'GOSUB の次の文へもどります。'],
  ['END', 'END', 'プログラムを終了します。'],
  ['STOP', 'STOP', 'プログラムを止めます。'],
  ['CLEAR', 'CLEAR', 'すべての変数と配列を 0 にします。'],
])}
<h3>PRINT の書き方</h3>
<ul>
<li><code>;</code> で区切ると、すき間なく続けて表示します。<code>,</code> で区切ると、次の 8 桁ごとの位置に揃えます。</li>
<li>行末に <code>;</code> や <code>,</code> を付けると、改行しません。</li>
<li>数は余計な空白なしで表示されます(<code>PRINT 5</code> → <code>5</code>)。</li>
<li>何も書かない <code>PRINT</code> は改行だけを行います。</li>
</ul>
${h.ex(`10 PRINT "A=";5;" B=";6
20 PRINT 1,2,3
30 PRINT "AB";
40 PRINT "CD"
50 END`, 'PRINT の区切り')}
<h3>くり返し(FOR がないので IF と GOTO で)</h3>
${h.ex(`10 LET S=0
20 LET I=1
30 LET S=S+I
40 LET I=I+1
50 IF I<=10 THEN GOTO 30
60 PRINT "1から10の合計は ";S
70 END`, '1から10の合計')}
<h3>サブルーチン</h3>
${h.ex(`10 LET N=1
20 GOSUB 100
30 LET N=N+1
40 IF N<=5 THEN GOTO 20
50 END
100 REM N の2乗を表示するサブルーチン
110 PRINT N;" の2乗は ";N*N
120 RETURN`, 'GOSUB / RETURN')}
<h3>入力</h3>
${h.ex(`10 PRINT "2つの数を入力してください (例: 3,4)"
20 INPUT A,B
30 PRINT A;" + ";B;" = ";A+B
40 PRINT A;" * ";B;" = ";A*B
50 END`, 'INPUT')}`,
    },
    {
      id: 'functions', title: '関数',
      html: `
${h.funcs([
  ['RND', 'RND(n)', '1〜n のランダムな整数。<code>RND(6)</code> でサイコロ。n は 1 以上。'],
  ['ABS', 'ABS(n)', '絶対値。'],
  ['SIZE', 'SIZE', '使える配列の大きさ(1024)。'],
])}
<p>SIN や SQR などの関数はありません。必要なときは、自分で計算するプログラムを書きます。</p>
${h.ex(`10 REM サイコロを5回ふる
20 LET I=1
30 PRINT RND(6);" ";
40 LET I=I+1
50 IF I<=5 THEN GOTO 30
60 PRINT
70 END`, 'RND')}
${h.ex(`10 REM 配列 @() の使い方
20 LET I=0
30 LET @(I)=I*I
40 LET I=I+1
50 IF I<=5 THEN GOTO 30
60 LET I=0
70 PRINT @(I);" ";
80 LET I=I+1
90 IF I<=5 THEN GOTO 70
100 PRINT
110 END`, '配列 @()')}`,
    },
    {
      id: 'graphics', title: 'グラフィック(このシミュレータの拡張)',
      html: `
<p>本来の Tiny BASIC にはグラフィックの命令はありません。このシミュレータでは、「できる限り描ける」ように、次の<b>拡張命令</b>を用意しています。座標は <b>左上が (0,0)</b>、右へ x、下へ y が増え、画面は 640 × 400 ドットです。</p>
${h.cmds([
  ['CLS', 'CLS', '文字画面とグラフィック画面を消去します。'],
  ['COLOR', 'COLOR n', '文字と図形の色を決めます(下の色表)。'],
  ['PLOT', 'PLOT x,y', '点を1つ打ちます。'],
  ['LINE', 'LINE x1,y1,x2,y2', '線を引きます。'],
  ['CIRCLE', 'CIRCLE x,y,r', '中心 (x,y)、半径 r の円をかきます。'],
  ['WAIT', 'WAIT n', 'n × 0.01 秒 待ちます(アニメーション用)。'],
])}
${h.table(['n', '0', '1', '2', '3', '4', '5', '6', '7'], [['色', '黒', '青', '赤', '紫', '緑', '水色', '黄', '白']])}
${h.ex(`10 REM 線で曲線のように見せる(ストリングアート)
20 CLS
30 LET I=0
40 COLOR 6
50 LINE 0,I,I,399
60 LET I=I+20
70 IF I<=400 THEN GOTO 50
80 COLOR 2
90 CIRCLE 320,200,120
100 END`, '線と円')}
${h.ex(`10 REM 動く点(WAIT でゆっくり)
20 CLS
30 LET X=0
40 PLOT X,200
50 WAIT 2
60 LET X=X+4
70 IF X<640 THEN GOTO 40
80 END`, 'WAIT')}`,
    },
    {
      id: 'errors', title: 'エラーメッセージ',
      html: `
${h.table(['メッセージ', '原因と対処'], [
  ['行番号がありません', 'すべての行の先頭に行番号が必要です。「行番号をふる」を使うと便利です。'],
  ['Tiny BASICの変数名は A〜Z の1文字です', '<code>AB</code> や <code>SUM</code> は使えません。1文字の変数にします。'],
  ['〜は N88互換BASIC・… のコマンドです', 'FOR、WHILE、DIM などは Tiny BASIC にはありません。<code>IF</code> と <code>GOTO</code> で書き換えます。'],
  ['オーバーフロー (Overflow)', '計算結果が -32767〜32767 を超えました。'],
  ['0で割りました (Division by zero)', '0 で割っています。'],
  ['未定義の行番号です', '<code>GOTO</code> / <code>GOSUB</code> で存在しない行を指定しています。'],
  ['RETURN に対応する GOSUB がありません', 'GOSUB を通らずに RETURN を実行しました。<code>END</code> を忘れていないか確認してください。'],
  ['再入力してください (Redo from start)', '<code>INPUT</code> に数でないものを入力した場合のメッセージです(エラーではなく再入力になります)。'],
])}`,
    },
    {
      id: 'limits', title: '制限事項・他の方言との違い',
      html: `
<ul>
<li>FOR / NEXT、文字列変数、小数、ELSE、論理演算(AND / OR)、SIN などの数学関数はありません。</li>
<li>複数文を <code>:</code> で区切って書くことはできません。</li>
<li>整数は -32767〜32767 の範囲です。</li>
<li>PLOT / LINE / CIRCLE / COLOR / CLS / WAIT はこのシミュレータの拡張で、実機の Tiny BASIC にはありません。</li>
</ul>
<p>各BASICの違いは <a href="compare.html">方言の比較</a> にまとめています。もっと機能がほしくなったら <a href="manual-n88.html">N88互換BASIC</a> や <a href="manual-full.html">Full BASIC</a> へ進みましょう。</p>`,
    },
  ],
};
