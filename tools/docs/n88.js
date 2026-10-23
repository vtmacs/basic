module.exports = {
  title: 'N88互換BASIC マニュアル',
  lead: 'NEC の PC-8801 / PC-9801 シリーズ向けBASICの文法を参考にした、非公式の互換実装です。行番号つきの手軽な書き方に、色・図形・音・文字列処理がそろった、日本のパソコン黎明期の定番です。',
  sections: (h) => [
    {
      id: 'about', title: 'N88互換BASIC とは',
      html: `
<p>N88互換BASIC が参考にしている N88-BASIC は、NEC のパソコン PC-8801 シリーズ(のちに PC-9801 シリーズ)に搭載された BASIC で、マイクロソフト社の BASIC を元にしています。このシミュレータは、その文法や使い方を参考に独自に作った<b>非公式の互換実装</b>で、NEC やマイクロソフト社とは関係がありません。行番号で書くスタイルは <a href="manual-tiny.html">Tiny BASIC</a> と同じですが、変数の型、配列、文字列、FOR/WHILE、ON GOTO、DATA/READ、グラフィック命令などが加わっています。</p>
${h.tip('このシミュレータの N88互換BASIC は、よく使われる命令を中心に再現した学習用のものです(実機のソフトウェアや画像は含みません)。ディスクやカセットの命令、スプライト、PEEK/POKE などの機種依存の機能は含みません。')}`,
    },
    {
      id: 'start', title: '画面とはじめかた',
      html: `
<ul>
<li>文字は <b>80桁 × 25行</b>(<code>WIDTH 40,25</code> で40桁)。グラフィックは <b>640 × 400 ドット、8色</b>で、文字の下に重なって表示されます。</li>
<li>全角文字(日本語)は2桁ぶんを使います。</li>
<li>実行は <b>「▶ 実行」</b>(<kbd>Ctrl</kbd>+<kbd>Enter</kbd>)。<code>INPUT</code> の入力は画面下の入力欄に打ち込んで <kbd>Enter</kbd>。</li>
<li><code>INKEY$</code> でキー入力を読むときは、画面をクリックしてからキーを押します。</li>
<li>すべての行は行番号で始めます(「行番号をふる」ボタンで自動で付けられます)。</li>
</ul>
${h.ex(`10 CLS
20 PRINT "Hello, World!"
30 PRINT "こんにちは N88互換BASIC"
40 END`, 'Hello, World')}`,
    },
    {
      id: 'program', title: 'プログラムの書き方',
      html: `
<ul>
<li>各行は <b>行番号</b> で始めます。実行は番号の小さい順で、入力順は関係ありません。</li>
<li>1行に複数の文を書くときは <code>:</code> で区切ります(<code>10 A=1:B=2:PRINT A+B</code>)。</li>
<li>コメントは <code>REM</code> か <code>'</code>(アポストロフィ)。<code>'</code> は文の途中からでも書けます。</li>
<li>大文字・小文字は区別されません。<code>?</code> は <code>PRINT</code> の省略形です。</li>
<li>ブロックの <code>IF…END IF</code> はありません。<code>IF 条件 THEN 文 ELSE 文</code> を1行で書きます。</li>
</ul>`,
    },
    {
      id: 'data', title: '変数・型・演算子',
      html: `
<h3>変数と型</h3>
<p>変数名は英字で始まる英数字(長さは自由)。名前の最後の記号で型が決まります。</p>
${h.table(['型', '記号', '例', '説明'], [
  ['単精度実数', '<code>!</code> (省略可)', '<code>A</code> <code>X!</code>', '標準の型。表示は7桁まで。'],
  ['倍精度実数', '<code>#</code>', '<code>PI#</code>', '桁数の多い実数(表示は同じ規則)。'],
  ['整数', '<code>%</code>', '<code>N%</code>', '-32768〜32767。代入のとき四捨五入されます。'],
  ['文字列', '<code>$</code>', '<code>A$</code> <code>NAME$</code>', '文字の並び。<code>"..."</code> で書きます。'],
])}
<p><code>DEFINT A-Z</code> のように宣言すると、記号なしの変数もその型になります。型が合わない代入(<code>A$=5</code> など)は「型が一致しません」エラーです。</p>
<h3>配列</h3>
<p><code>DIM A(10)</code> で <code>A(0)</code>〜<code>A(10)</code> の11個。<code>DIM B(3,3)</code> のように多次元も可能です。宣言なしで使うと、各次元 0〜10 の配列が自動で作られます。<code>OPTION BASE 1</code> で添字を1から始められます。</p>
<h3>演算子(強さの順)</h3>
${h.table(['演算子', '意味'], [
  ['<code>^</code>', 'べき乗(<code>2^10</code> = 1024)'],
  ['<code>-</code> (単項)', '符号'],
  ['<code>* /</code>', 'かけ算・割り算'],
  ['<code>\\</code>', '整数の割り算(<code>7\\2</code> = 3)'],
  ['<code>MOD</code>', '余り(<code>7 MOD 3</code> = 1)'],
  ['<code>+ -</code>', '足し算・引き算(<code>+</code> は文字列の連結にも使う)'],
  ['<code>= &lt;&gt; &lt; &gt; &lt;= &gt;=</code>', '比較。真は <b>-1</b>、偽は 0。文字列は辞書順で比較'],
  ['<code>NOT</code>', 'ビット反転(<code>NOT 0</code> = -1)'],
  ['<code>AND</code>', 'ビットごとの論理積'],
  ['<code>OR XOR EQV IMP</code>', '論理和・排他的論理和・同値・包含'],
])}
<p>16進数は <code>&amp;HFF</code>、8進数は <code>&amp;O17</code>、2進数は <code>&amp;B101</code> と書けます。</p>
${h.ex(`10 PRINT 7/2;7\\2;7 MOD 3;2^10
20 PRINT (3>2);(2>3);(5 AND 3);(5 OR 2)
30 A$="ABC"+"DEF": PRINT A$
40 PRINT &HFF;&B101
50 END`, '演算子')}`,
    },
    {
      id: 'io', title: '入出力の命令',
      html: `
${h.cmds([
  ['PRINT', 'PRINT 項目 [; | , 項目 ...]', '画面に表示。<code>;</code> は続けて、<code>,</code> は14桁ごとの位置へ。行末の <code>;</code> で改行なし。数は前後に空白がつきます。'],
  ['PRINT USING', 'PRINT USING "書式"; 項目...', '書式つき表示。<code>#</code> が数字1桁、<code>.</code> で小数点、<code>,</code> で3桁区切り、<code>+</code> で符号、<code>!</code> 文字列の先頭1文字、<code>\\ \\</code> 固定幅の文字列、<code>&amp;</code> 文字列全体。'],
  ['TAB / SPC', 'TAB(n)  SPC(n)', 'PRINT の中で使います。n 桁目まで空白、n 個の空白。'],
  ['INPUT', 'INPUT ["メッセージ";] 変数 [, 変数...]', 'キー入力。<code>;</code> のときは「メッセージ?」、<code>,</code> のときは「メッセージ」だけを表示。複数の変数にはカンマ区切りで入力。'],
  ['LINE INPUT', 'LINE INPUT ["メッセージ";] 文字列変数', '1行をそのまま(カンマも含めて)文字列として受け取ります。'],
  ['INKEY$', 'A$ = INKEY$', '押されたキーを1文字返す関数(なければ空文字列)。矢印キー: → 28、← 29、↑ 30、↓ 31。'],
  ['CLS', 'CLS [n]', '画面を消去(文字・図形とも)。'],
  ['LOCATE', 'LOCATE x, y', '文字の表示位置(左上が 0,0)。'],
  ['COLOR', 'COLOR 文字色 [, 背景色]', '色番号 0〜7(下の表)。以後の文字と図形の標準色になります。'],
  ['WIDTH', 'WIDTH 桁, 行', '文字画面の大きさを変えます。'],
  ['SCREEN', 'SCREEN モード...', '互換のため受け付けます(何もしません)。図形は常に使えます。'],
  ['BEEP', 'BEEP', 'ビープ音。'],
  ['SOUND', 'SOUND 周波数, 長さ', '指定の周波数(Hz)の音を、長さ(1/55秒単位)だけ鳴らします。'],
  ['PLAY', 'PLAY "MML"', '音楽を演奏。<code>C D E F G A B</code>(<code>#</code> <code>-</code> 付き)、<code>R</code>(休符)、<code>O n</code>(音域)、<code>L n</code>(音の長さ)、<code>T n</code>(テンポ)、<code>&lt; &gt;</code>(音域上下)、音名のあとの数字・<code>.</code>(長さ)。'],
])}
${h.table(['色番号', '0', '1', '2', '3', '4', '5', '6', '7'], [['色', '黒', '青', '赤', '紫', '緑', '水色', '黄', '白']])}
${h.ex(`10 CLS
20 FOR I=1 TO 5
30   PRINT USING "###番 ###,###円";I;I*12345
40 NEXT I
50 PRINT TAB(10);"ここは10桁目"
60 LOCATE 20,12:COLOR 6:PRINT "LOCATE と COLOR"
70 END`, 'PRINT USING / TAB / LOCATE / COLOR')}
${h.ex(`10 INPUT "お名前は";N$
20 INPUT "年齢は";A
30 PRINT N$;"さんは来年";A+1;"歳です"
40 END`, 'INPUT')}`,
    },
    {
      id: 'control', title: '制御の命令',
      html: `
${h.cmds([
  ['IF', 'IF 条件 THEN 文 [ELSE 文]', '条件が真(0以外)のとき THEN の文を、そうでなければ ELSE の文を実行。THEN の後に行番号だけを書くと、その行へ飛びます。'],
  ['GOTO', 'GOTO 行番号', '指定の行へ飛びます。'],
  ['GOSUB / RETURN', 'GOSUB 行番号 … RETURN', 'サブルーチンを呼び出して戻ります。'],
  ['ON … GOTO / GOSUB', 'ON 式 GOTO 行1,行2,…', '式の値が 1 なら行1、2 なら行2…へ飛びます。範囲外なら次の文へ。'],
  ['FOR / NEXT', 'FOR 変数=初期値 TO 終了値 [STEP 増分] … NEXT [変数]', '決まった回数のくり返し。<code>NEXT J,I</code> のように複数を閉じることもできます。'],
  ['WHILE / WEND', 'WHILE 条件 … WEND', '条件が真の間くり返し。'],
  ['END / STOP', 'END', 'プログラムを終了します。'],
  ['ON ERROR GOTO', 'ON ERROR GOTO 行番号', 'エラーが起きたとき、その行へ飛びます(<code>0</code> で解除)。'],
  ['RESUME', 'RESUME [NEXT | 行番号]', 'エラー処理から戻ります。そのまま <code>RESUME</code> でやり直し、<code>NEXT</code> で次の文から。'],
  ['ERR / ERL', 'ERR  ERL', '直前のエラーの番号と、エラーの起きた行番号。'],
])}
${h.ex(`10 FOR I=1 TO 15
20   IF I MOD 15=0 THEN PRINT "FizzBuzz" ELSE IF I MOD 3=0 THEN PRINT "Fizz" ELSE IF I MOD 5=0 THEN PRINT "Buzz" ELSE PRINT I
30 NEXT I
40 N=0
50 WHILE N<3
60   N=N+1: PRINT "N=";N
70 WEND
80 END`, 'IF / FOR / WHILE')}
${h.ex(`10 ON ERROR GOTO 100
20 INPUT "割る数は";D
30 PRINT 100/D
40 END
100 PRINT "エラー番号";ERR;" 行";ERL
110 RESUME 20`, 'ON ERROR GOTO / RESUME')}`,
    },
    {
      id: 'vars', title: 'データと変数の命令',
      html: `
${h.cmds([
  ['LET', 'LET 変数 = 式', '代入。<code>LET</code> は省略できます。'],
  ['DIM', 'DIM 配列(要素数)[, …]', '配列を作ります。'],
  ['ERASE', 'ERASE 配列', '配列を消します。'],
  ['CLEAR', 'CLEAR', 'すべての変数をクリアします。'],
  ['DEFINT / DEFSNG / DEFDBL / DEFSTR', 'DEFINT A-C, X', '頭文字の範囲で型を宣言します。'],
  ['DATA', 'DATA 値, 値, …', '読み込み用のデータ。文字列はそのまま(カンマや空白を含むときは <code>"..."</code>)。'],
  ['READ', 'READ 変数, …', 'DATA の値を順に読み込みます。足りないと「DATAが足りません」。'],
  ['RESTORE', 'RESTORE [行番号]', '読み込み位置を先頭(または指定行)へ戻します。'],
  ['SWAP', 'SWAP 変数1, 変数2', '2つの変数の値を入れ替えます。'],
  ['RANDOMIZE', 'RANDOMIZE [種]', '乱数の種を決めます。省略すると毎回ちがう乱数になります。'],
  ['OPTION BASE', 'OPTION BASE 0|1', '配列の添字の最小値。'],
  ['DEF FN', 'DEF FNA(X)=式', '1行の関数を定義。<code>FNA(3)</code> のように使います。名前は <code>FN</code> で始めます。'],
])}
${h.ex(`10 DATA 3,1,4,1,5,9,2,6
20 DIM A(7)
30 FOR I=0 TO 7: READ A(I): NEXT I
40 FOR I=0 TO 6
50   FOR J=0 TO 6-I
60     IF A(J)>A(J+1) THEN SWAP A(J),A(J+1)
70   NEXT J
80 NEXT I
90 FOR I=0 TO 7: PRINT A(I);: NEXT I: PRINT
100 DEF FNSQ(X)=X*X
110 PRINT FNSQ(12)
120 END`, 'DATA / READ / DIM / SWAP / DEF FN')}`,
    },
    {
      id: 'functions', title: '関数',
      html: `
<h3>数値の関数</h3>
${h.funcs([
  ['ABS', 'ABS(x)', '絶対値'], ['SGN', 'SGN(x)', '符号(-1, 0, 1)'], ['INT', 'INT(x)', 'x を超えない最大の整数(<code>INT(-1.5)</code> = -2)'],
  ['FIX', 'FIX(x)', '小数点以下を切り捨て(<code>FIX(-1.5)</code> = -1)'], ['CINT', 'CINT(x)', '四捨五入して整数に'],
  ['SQR', 'SQR(x)', '平方根'], ['SIN COS TAN', 'SIN(x)', '三角関数(ラジアン)'], ['ATN', 'ATN(x)', 'アークタンジェント'],
  ['EXP LOG', 'EXP(x) LOG(x)', '指数関数・自然対数'],
  ['RND', 'RND(1)', '0以上1未満の乱数。<code>RND(0)</code> は直前の値、負の数で乱数列を初期化。整数の乱数は <code>INT(RND(1)*6)+1</code>。'],
  ['TIMER', 'TIMER', '実行開始からの秒数'],
  ['POINT', 'POINT(x,y)', '画面上の点の色番号'],
])}
<h3>文字列の関数</h3>
${h.funcs([
  ['LEN', 'LEN(a$)', '文字数'], ['LEFT$', 'LEFT$(a$,n)', '左から n 文字'], ['RIGHT$', 'RIGHT$(a$,n)', '右から n 文字'],
  ['MID$', 'MID$(a$,p[,n])', 'p 文字目(1から数える)から n 文字'],
  ['INSTR', 'INSTR([開始,]a$,b$)', 'a$ の中で b$ が最初に現れる位置(なければ 0)'],
  ['STR$', 'STR$(x)', '数を文字列に(正の数は先頭に空白)'], ['VAL', 'VAL(a$)', '文字列を数に(数でなければ 0)'],
  ['CHR$', 'CHR$(n)', '文字コードから文字'], ['ASC', 'ASC(a$)', '先頭文字の文字コード'],
  ['HEX$ OCT$ BIN$', 'HEX$(n)', '16進・8進・2進の文字列'],
  ['SPACE$ STRING$', 'SPACE$(n)  STRING$(n,c)', 'n 個の空白、n 個の同じ文字'],
  ['TIME$ DATE$', 'TIME$  DATE$', '現在の時刻・日付'],
])}
${h.ex(`10 A$="MY-BASIC"
20 PRINT LEN(A$);LEFT$(A$,3);RIGHT$(A$,5);MID$(A$,5,2)
30 PRINT INSTR(A$,"-");STR$(3);VAL("12")+1
40 PRINT CHR$(65);ASC("a");HEX$(255);STRING$(5,"*")
50 FOR I=LEN(A$) TO 1 STEP -1: PRINT MID$(A$,I,1);: NEXT I: PRINT
60 END`, '文字列関数')}`,
    },
    {
      id: 'graphics', title: 'グラフィック',
      html: `
<p>座標は<b>左上が (0,0)</b>で、右へ x、下へ y が増えます(640 × 400)。色は色番号(0〜7)。色を省略すると <code>COLOR</code> で決めた色になります。</p>
${h.cmds([
  ['PSET', 'PSET (x,y)[,色]', '点を打ちます。<code>PSET STEP(dx,dy)</code> で直前の位置からの相対位置。'],
  ['PRESET', 'PRESET (x,y)', '点を背景色で消します。'],
  ['LINE', 'LINE [(x1,y1)]-(x2,y2)[,色[,B|BF]]', '線。<code>B</code> で四角形の枠、<code>BF</code> で塗りつぶした四角形。始点を省略すると直前の位置から。'],
  ['CIRCLE', 'CIRCLE (x,y),半径[,色[,開始角,終了角[,比率]]]', '円・円弧・楕円。角度はラジアン(右が0、反時計回り)。比率が1より小さいと横長の楕円。角度に負の符号を付けると中心への線も引きます。'],
  ['PAINT', 'PAINT (x,y)[,塗り色[,境界色]]', '(x,y) をふくむ閉じた領域を塗ります。境界色を指定した場合は、その色の線まで塗ります。'],
  ['POINT', 'POINT(x,y)', '(x,y) の色番号を返す関数。'],
])}
${h.ex(`10 SCREEN 3: CLS
20 FOR I=0 TO 7
30   LINE (I*80,0)-(I*80+79,60),I,BF
40 NEXT I
50 CIRCLE (320,230),120,6
60 PAINT (320,230),2,6
70 CIRCLE (320,230),60,5
80 LINE (100,150)-(540,390),7,B
90 LOCATE 30,12: COLOR 7: PRINT "N88互換BASIC GRAPHICS"
100 END`, '図形')}
${h.ex(`10 SCREEN 3: CLS
20 LINE (0,200)-(639,200),7
30 FOR X=0 TO 639
40   Y=200-SIN(X/639*4*3.14159)*150
50   PSET (X,Y),6
60 NEXT X
70 END`, 'サインカーブ')}
${h.ex(`10 SCREEN 3: CLS
20 CIRCLE (320,200),100,2,0,3.14159
30 CIRCLE (320,200),100,4,3.14159,6.28318
40 CIRCLE (320,200),150,5,,,0.5
50 END`, '円弧と楕円')}`,
    },
    {
      id: 'file', title: 'ファイル',
      html: `
<p>データをファイルに保存して、あとで読み込めます。ファイルは<b>お使いのブラウザの中</b>(このサイト用の保存領域)に保存されるので、ページを閉じても残ります。別のパソコンや別のブラウザとは共有されません(ブラウザのサイトデータを消すと一緒に消えます)。</p>
<ul>
<li>ファイル名は英数字と <code>_ - .</code> で32文字まで(大文字小文字は区別しません)。<code>"A:DATA.DAT"</code> のようなドライブ名は書いても無視されます。</li>
<li>ファイル番号は <code>#1</code>〜<code>#15</code>。同時に開けるのは別々の番号・別々のファイルです。</li>
<li>プログラムが終了(<code>END</code>・エラー・停止)すると、開いているファイルは自動で閉じて保存されます。(実機のように <code>CLOSE</code> を忘れて失う心配はありません。それでも <code>CLOSE</code> を書く習慣をつけましょう。)</li>
</ul>
<h3>順番に読み書きする(シーケンシャルファイル)</h3>
${h.cmds([
  ['OPEN', 'OPEN "名前" FOR INPUT|OUTPUT|APPEND AS #n', '読み込み(INPUT)、新規書き込み(OUTPUT、同名があれば上書き)、追加書き込み(APPEND)で開きます。古い書き方 <code>OPEN "I",#1,"名前"</code>(モードは <code>I</code> <code>O</code> <code>A</code>)も使えます。'],
  ['CLOSE', 'CLOSE [#n, #m …]', 'ファイルを閉じて保存します。番号を省くとすべて閉じます。'],
  ['PRINT #', 'PRINT #n, 項目 [; | , 項目 …]', '画面の <code>PRINT</code> と同じ書式でファイルに書きます(<code>USING</code> も使えます)。'],
  ['WRITE #', 'WRITE #n, 項目, 項目 …', '<code>INPUT #</code> で読み戻しやすい形(文字列は <code>"…"</code> で囲み、項目はカンマ区切り、数は空白なし)で書きます。'],
  ['INPUT #', 'INPUT #n, 変数, 変数 …', 'ファイルから項目を読みます。項目はカンマか改行で区切られます。'],
  ['LINE INPUT #', 'LINE INPUT #n, 文字列変数', '1行をそのまま読みます。'],
  ['INPUT$', 'INPUT$(文字数, #n)', '指定した文字数だけ読みます。'],
  ['EOF', 'EOF(n)', 'ファイルの終わりまで読んだら -1(真)。<code>WHILE NOT EOF(1) … WEND</code> で全部読めます。'],
  ['LOF', 'LOF(n)', 'ファイルの大きさ(文字数)。'],
  ['LOC', 'LOC(n)', 'ランダムファイルでは最後に読み書きしたレコード番号。'],
])}
${h.ex(`10 ' 点数をファイルに保存して、読み出して平均を出す
20 OPEN "SCORE.DAT" FOR OUTPUT AS #1
30 FOR I=1 TO 5
40   WRITE #1,"生徒"+STR$(I),50+I*7
50 NEXT I
60 CLOSE #1
70 OPEN "SCORE.DAT" FOR INPUT AS #1
80 S=0:N=0
90 WHILE NOT EOF(1)
100   INPUT #1,NM$,P
110   PRINT NM$;P
120   S=S+P:N=N+1
130 WEND
140 CLOSE #1
150 PRINT "平均=";S/N
160 END`, 'WRITE # と INPUT #')}
${h.ex(`10 ' メモを1行ずつ追加していく(何度実行しても増えていく)
20 OPEN "MEMO.TXT" FOR APPEND AS #1
30 PRINT #1,"実行した時刻 ";TIME$
40 CLOSE #1
50 OPEN "MEMO.TXT" FOR INPUT AS #1
60 WHILE NOT EOF(1)
70   LINE INPUT #1,A$
80   PRINT A$
90 WEND
100 CLOSE #1`, 'APPEND と LINE INPUT #')}
<h3>番号で出し入れする(ランダムファイル)</h3>
<p>1件ぶんの長さ(レコード長)を決め、<b>何番目のレコード</b>かを指定して読み書きします。<code>OPEN "名前" AS #n LEN=レコード長</code>(または <code>OPEN "R",#n,"名前",レコード長</code>)で開き、<code>FIELD</code> でレコードの中身を文字列変数に割り当てます。</p>
${h.cmds([
  ['FIELD', 'FIELD #n, 幅 AS 変数$, 幅 AS 変数$ …', 'レコードを、幅ごとの文字列変数に割り当てます(幅の合計はレコード長以下)。'],
  ['LSET / RSET', 'LSET 変数$ = 式  /  RSET 変数$ = 式', 'FIELD した変数に、左そろえ(LSET)・右そろえ(RSET)で値を入れます(足りない分は空白、あふれた分は切り捨て)。ふつうの <code>=</code> では書き込めません。'],
  ['PUT', 'PUT #n[, レコード番号]', 'いまのレコードの内容をファイルへ書きます。番号を省くと前回の次のレコード。'],
  ['GET', 'GET #n[, レコード番号]', 'レコードを読んで、FIELD の変数に入れます。'],
  ['MKI$ MKS$ MKD$', 'MKI$(整数)  MKS$(単精度)  MKD$(倍精度)', '数を 2・4・8 文字の文字列に変換します(レコードに数を入れるとき用)。'],
  ['CVI CVS CVD', 'CVI(文字列)  CVS(文字列)  CVD(文字列)', '上の逆(文字列から数に戻す)。'],
])}
${h.ex(`10 ' 1件24文字のレコードで保存する
20 OPEN "ADDR.DAT" AS #1 LEN=24
30 FIELD #1,12 AS N$,10 AS T$,2 AS A$
40 DATA 山田,0901111111,20,鈴木,0902222222,31,佐藤,0903333333,45
50 FOR I=1 TO 3
60   READ NM$,TL$,AG
70   LSET N$=NM$:LSET T$=TL$:LSET A$=MKI$(AG)
80   PUT #1,I
90 NEXT I
100 PRINT "レコード数=";LOF(1)/24
110 FOR I=3 TO 1 STEP -1
120   GET #1,I
130   PRINT I;N$;T$;CVI(A$);"歳"
140 NEXT I
150 CLOSE #1
160 FILES
170 END`, 'ランダムファイル(住所録)')}
<h3>ファイルの管理</h3>
${h.cmds([
  ['FILES', 'FILES ["パターン"]', 'ファイルの一覧を表示します(<code>FILES "*.DAT"</code> のように <code>*</code> と <code>?</code> が使えます)。'],
  ['KILL', 'KILL "名前"', 'ファイルを削除します。'],
  ['NAME', 'NAME "旧" AS "新"', 'ファイル名を変更します。'],
])}
<p>よくあるエラー: 「ファイルが見つかりません」(読み込み用に開いたのに無い)、「ファイルの終わりを過ぎて読もうとしました」(<code>EOF</code> を確かめずに読んだ)、「ファイルは既に開かれています」(<code>CLOSE</code> せずに同じ番号・同じファイルを開いた)、「ファイル #n ではこの操作はできません」(書き込み用に開いたファイルを <code>INPUT #</code> した、など)。</p>`,
    },
    {
      id: 'samples', title: 'もう少し大きなプログラム',
      html: `
${h.ex(`10 RANDOMIZE
20 N=INT(RND(1)*100)+1
30 C=0
40 INPUT "1〜100の数は";G
50 C=C+1
60 IF G=N THEN 100
70 IF G<N THEN PRINT "もっと大きい" ELSE PRINT "もっと小さい"
80 GOTO 40
100 PRINT C;"回で当たりました!"
110 END`, '数当てゲーム')}
${h.ex(`10 CLS: SCREEN 3
20 X=320: Y=200
30 FOR T=0 TO 3000
40   X=X+INT(RND(1)*7)-3
50   Y=Y+INT(RND(1)*7)-3
60   IF X<0 OR X>639 OR Y<0 OR Y>399 THEN 90
70   PSET (X,Y),(T MOD 7)+1
80 NEXT T
90 PRINT "おわり"
100 END`, 'ランダムウォーク')}`,
    },
    {
      id: 'errors', title: 'エラーメッセージ',
      html: `
${h.table(['メッセージ', '番号', '原因'], [
  ['構文エラー (Syntax error)', '2', '文の書き方が違います。'],
  ['RETURN に対応する GOSUB がありません', '3', 'GOSUB なしで RETURN を実行しました。'],
  ['DATAが足りません (Out of DATA)', '4', 'READ の数が DATA より多い。'],
  ['不正な関数呼び出しです (Illegal function call)', '5', '関数の引数の範囲が不正(<code>SQR(-1)</code> など)。'],
  ['オーバーフロー (Overflow)', '6', '数が大きすぎる / 整数変数の範囲(-32768〜32767)を超えた。'],
  ['未定義の行番号です', '8', 'GOTO などで存在しない行を指定した。'],
  ['添字が範囲外です (Subscript out of range)', '9', '配列の範囲を超えた。'],
  ['0で割りました (Division by zero)', '11', '0 で割った。'],
  ['型が一致しません (Type mismatch)', '13', '文字列と数を混ぜた。'],
  ['行番号がありません', '2', '行番号のない行がある。'],
])}
<p>エラーが起きるとプログラムは止まり、エラー内容と行番号が表示され、エディタの該当行が選択されます。<code>ON ERROR GOTO</code> で自分で処理することもできます。</p>`,
    },
    {
      id: 'limits', title: '制限事項',
      html: `
<ul>
<li>プログラム自体の SAVE/LOAD/MERGE(エディタの「保存」「読み込み」を使ってください)、PEEK/POKE、OUT/INP、スプライト、GET@/PUT@(図形の取り込み)、VIEW/WINDOW、KEY・割り込み(ON KEY/ON TIMER)は未対応です。<code>KEY</code> と <code>CONSOLE</code> は書いても何も起きません。</li>
<li>ファイルはブラウザの中に保存されます。ディスクやカセットなどの装置名は無視され、<code>LOF</code> や <code>LOC</code> の値は実機と少し違います。ランダムファイルの文字列は、日本語も1文字を1つと数えます。</li>
<li>グラフィックは 640 × 400 ドット・8色固定で、文字層とグラフィック層は別です。<code>CLS</code> は両方を消します。</li>
<li>単精度/倍精度の違いは表示桁数にだけ現れ、内部では倍精度で計算します(<code>PRINT 1/3</code> は <code>.3333333</code>)。</li>
<li>キーワードの途中に空白がなくても読める「<code>FORI=1TO10</code>」のような書き方は、キーワードの前後に空白が必要です。</li>
<li>音は Web Audio による簡易再生です。PLAY は同時に1音ずつです。</li>
</ul>
<p>他の方言との違いは <a href="compare.html">方言の比較</a> をご覧ください。</p>`,
    },
  ],
};
