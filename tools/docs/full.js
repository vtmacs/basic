module.exports = {
  title: 'Full BASIC マニュアル',
  lead: 'JIS X 3003 / ISO 10279 で標準化された構造化BASIC。行番号なしで、IF…END IF・SELECT CASE・DO…LOOP・SUB / FUNCTION を使ってスッキリ書けます。',
  sections: (h) => [
    {
      id: 'about', title: 'Full BASIC とは',
      html: `
<p>Full BASIC は、各社バラバラだったBASICを整理するために国際規格(ANSI/ISO)と日本工業規格(JIS)として定められた BASIC です。<b>構造化プログラミング</b>(ブロックを使って見通しよく書く)を前提にしていて、行番号に頼らずに書けるのが大きな特徴です。日本では教育用に使われてきました。</p>
<p>このシミュレータでは、規格にある基本構文と、グラフィックス(<code>SET WINDOW</code>・<code>PLOT</code>・<code>BOX</code>)を中心に再現しています。</p>
${h.tip('規格の Full BASIC では行番号が必須ですが、このシミュレータでは<b>行番号は省略できます</b>。')}
<p><b>行番号を1つも書かなかったとき</b>は、プログラムの上から数えた番号(コメント行も数え、空行は数えません)が自動で付きます。この番号が <code>GOTO</code> / <code>GOSUB</code> の飛び先になり、エラーの場所の表示にも使われます。画面左の「行番号つきリスト」で確認できます。自分で行番号を書いたときは、その番号が使われます。</p>
${h.ex(`! コメントの行も数えるので、この行が1番、LET n = 1 が2番、PRINT n が3番
LET n = 1
PRINT n
LET n = n + 1
IF n <= 3 THEN GOTO 3
END`, '自動の行番号と GOTO')}`,
    },
    {
      id: 'start', title: '画面とはじめかた',
      html: `
<ul>
<li>画面は正方形の <b>400 × 400 ドット</b>のグラフィック面と、<b>50桁 × 25行</b>の文字画面です(白い紙のような見た目)。</li>
<li>実行は <b>「▶ 実行」</b>(<kbd>Ctrl</kbd>+<kbd>Enter</kbd>)。<code>INPUT</code> の入力は画面下の入力欄から。</li>
<li>変数や命令は大文字・小文字を区別しません。変数名は英字で始まる英数字と <code>_</code>、文字列変数は末尾に <code>$</code> を付けます。</li>
</ul>
${h.ex(`! はじめての Full BASIC
PRINT "Hello, World!"
PRINT "こんにちは Full BASIC"
END`, 'Hello, World')}`,
    },
    {
      id: 'program', title: 'プログラムの書き方',
      html: `
<ul>
<li>1行に1つの文が基本です。複数書くときは <code>:</code> で区切ります(<code>LET a = 1 : LET b = 2</code>)。</li>
<li>コメントは <code>!</code> から行末まで、または <code>REM</code>。</li>
<li>変数への代入は <code>LET 変数 = 式</code>。<code>LET</code> は省略もできます。</li>
<li>文字列の連結は <code>&amp;</code>(<code>+</code> でも連結できます)。</li>
<li>サブプログラム(<code>SUB</code> / <code>FUNCTION</code>)は、メインの <code>END</code> のあとに書くのが普通です。メインとして実行される途中にあっても、呼び出されるまで実行されません。</li>
</ul>
${h.ex(`LET a = 3
LET b$ = "abc"
LET c$ = b$ & "def"
PRINT a * 2; c$      ! コメント
END`, '代入と文字列')}`,
    },
    {
      id: 'data', title: '変数・演算子',
      html: `
<h3>型</h3>
${h.table(['型', '名前の例', '説明'], [
  ['数値', '<code>total</code> <code>x1</code>', '実数(倍精度)。整数も実数も同じ数値として扱います。'],
  ['文字列', '<code>name$</code>', '名前の最後に <code>$</code>。'],
  ['配列', '<code>a(10)</code> <code>m(3,4)</code>', '<code>DIM</code> で宣言。宣言なしで使うと 0〜10 になります。'],
])}
<h3>演算子(強さの順)</h3>
${h.table(['演算子', '意味'], [
  ['<code>^</code>', 'べき乗'], ['<code>-</code>(単項)', '符号'], ['<code>* /</code>', 'かけ算・割り算'],
  ['<code>+ - &amp;</code>', '足し算・引き算・文字列の連結'],
  ['<code>= &lt;&gt; &lt; &gt; &lt;= &gt;=</code>', '比較。真は <b>1</b>、偽は 0'],
  ['<code>NOT</code> <code>AND</code> <code>OR</code>', '論理演算(条件を組み合わせる)'],
])}
<p>剰余(あまり)は演算子ではなく関数 <code>MOD(a,b)</code> を使います。</p>
<h3>配列</h3>
<p><code>DIM a(10)</code> は <code>a(0)</code>〜<code>a(10)</code>。<code>DIM a(-2 TO 2)</code> のように下限も指定できます。<code>OPTION BASE 1</code> で下限の標準を 1 にできます。</p>
${h.ex(`OPTION BASE 1
DIM a(5), n$(3)
FOR i = 1 TO 5
   LET a(i) = i ^ 2
NEXT i
LET n$(1) = "赤"
PRINT a(3); n$(1)
PRINT MOD(17, 5); MAX(3, 9, 4); INT(-2.5); IP(-2.5)
END`, '配列と関数')}`,
    },
    {
      id: 'io', title: '入出力',
      html: `
${h.cmds([
  ['PRINT', 'PRINT 項目 [; | , 項目 ...]', '表示。<code>;</code> は続けて、<code>,</code> は16桁ごとの位置へ。行末の <code>;</code> で改行なし。数は前後に空白がつきます(正の数は先頭に空白)。'],
  ['PRINT USING', 'PRINT USING "書式": 項目, …', '書式つき表示(<code>#</code> が数字、<code>.</code> が小数点)。'],
  ['TAB', 'TAB(n)', 'PRINT の中で n 桁目へ移動。'],
  ['INPUT', 'INPUT [PROMPT "メッセージ":] 変数, …', 'キー入力。複数の変数はカンマ区切りで入力。'],
  ['LINE INPUT', 'LINE INPUT [PROMPT "…":] 文字列変数', '1行をそのまま文字列で受け取ります。'],
  ['SET CURSOR', 'SET CURSOR 行, 桁', '文字の表示位置(1から数えます)。'],
  ['CLEAR', 'CLEAR', '画面(文字・図形)を消去します。'],
  ['WAIT DELAY', 'WAIT DELAY 秒', '指定の秒数だけ待ちます。'],
  ['RANDOMIZE', 'RANDOMIZE', '乱数の種を現在時刻で変えます。'],
  ['DATA / READ / RESTORE', 'DATA 値, … / READ 変数, …', 'データの埋め込みと読み込み。'],
])}
${h.ex(`INPUT PROMPT "人数は? ": n
LET total = 0
FOR i = 1 TO n
   INPUT PROMPT "点数? ": x
   LET total = total + x
NEXT i
IF n > 0 THEN PRINT "平均点 ="; total / n
END`, 'INPUT')}`,
    },
    {
      id: 'control', title: '制御構造',
      html: `
${h.cmds([
  ['IF … END IF', 'IF 条件 THEN … [ELSEIF 条件 THEN …] [ELSE …] END IF', '条件による分岐。1行形式 <code>IF 条件 THEN 文</code> も使えます。'],
  ['SELECT CASE', 'SELECT CASE 式 / CASE 値, 値 / CASE a TO b / CASE IS &gt;= 値 / CASE ELSE / END SELECT', '値による多分岐。'],
  ['FOR … NEXT', 'FOR 変数 = 初期値 TO 終了値 [STEP 増分] … NEXT 変数', 'くり返し。<code>EXIT FOR</code> で途中で抜けます。'],
  ['DO … LOOP', 'DO [WHILE|UNTIL 条件] … LOOP [WHILE|UNTIL 条件]', '条件によるくり返し。<code>EXIT DO</code> で抜けます。'],
  ['GOTO / GOSUB / RETURN', 'GOTO 行番号', '行番号を付けたときだけ使えます。'],
  ['ON … GOTO / GOSUB', 'ON 式 GOTO 行1, 行2, …', '式の値(1,2,…)で飛び先を選びます。'],
  ['END / STOP', 'END', 'プログラムの終了。'],
])}
${h.ex(`FOR i = 1 TO 15
   IF MOD(i, 15) = 0 THEN
      PRINT "FizzBuzz"
   ELSEIF MOD(i, 3) = 0 THEN
      PRINT "Fizz"
   ELSEIF MOD(i, 5) = 0 THEN
      PRINT "Buzz"
   ELSE
      PRINT i
   END IF
NEXT i
END`, 'IF / ELSEIF')}
${h.ex(`FOR score = 40 TO 100 STEP 15
   SELECT CASE score
   CASE IS >= 90
      LET g$ = "A"
   CASE 70 TO 89
      LET g$ = "B"
   CASE 50, 60
      LET g$ = "C"
   CASE ELSE
      LET g$ = "D"
   END SELECT
   PRINT score; " -> "; g$
NEXT score
END`, 'SELECT CASE')}
${h.ex(`LET n = 100
LET count = 0
DO WHILE n > 1
   IF MOD(n, 2) = 0 THEN
      LET n = n / 2
   ELSE
      LET n = 3 * n + 1
   END IF
   LET count = count + 1
LOOP
PRINT "ステップ数 ="; count
END`, 'DO WHILE(コラッツ予想)')}`,
    },
    {
      id: 'sub', title: 'サブプログラム(SUB / FUNCTION)',
      html: `
<ul>
<li><code>SUB 名前(仮引数, …)</code> … <code>END SUB</code> は <code>CALL 名前(実引数, …)</code> で呼び出します。</li>
<li><code>FUNCTION 名前(仮引数, …)</code> … <code>END FUNCTION</code> は式の中から呼び出せます。<b>関数の値は、関数名に代入</b>します(<code>LET 名前 = 値</code>)。</li>
<li>引数に<b>変数だけ</b>を渡すと、SUB の中での変更が呼び出し元に反映されます(参照渡し)。式を渡したときは値だけが渡されます。</li>
<li>配列は仮引数に <code>a()</code> と書いて渡せます。</li>
<li>サブプログラムの内部は独立していて、<b>外側の変数は見えません</b>。必要な値は引数で渡します。再帰呼び出しもできます。</li>
<li><code>EXIT SUB</code> / <code>EXIT FUNCTION</code> でその場で戻ります。<code>DEF 名前(仮引数) = 式</code> で1行の関数も定義できます。</li>
</ul>
${h.ex(`PRINT "5! ="; fact(5)
PRINT "半径2の円の面積 ="; area(2)
LET a = 10
LET b = 20
CALL swap(a, b)
PRINT "a ="; a; " b ="; b
END

FUNCTION fact(n)
   IF n <= 1 THEN
      LET fact = 1
   ELSE
      LET fact = n * fact(n - 1)
   END IF
END FUNCTION

DEF area(r) = PI * r ^ 2

SUB swap(x, y)
   LET t = x
   LET x = y
   LET y = t
END SUB`, 'FUNCTION / SUB / DEF')}`,
    },
    {
      id: 'functions', title: '関数',
      html: `
<h3>数値</h3>
${h.funcs([
  ['ABS SGN', 'ABS(x)', '絶対値・符号'], ['INT', 'INT(x)', 'x を超えない最大の整数'], ['IP FP', 'IP(x)  FP(x)', '整数部分・小数部分(<code>IP(-2.5)</code> = -2)'],
  ['CEIL', 'CEIL(x)', '切り上げ'], ['ROUND', 'ROUND(x[,n])', '四捨五入(n は小数点以下の桁数)'], ['TRUNCATE', 'TRUNCATE(x[,n])', '切り捨て'],
  ['SQR', 'SQR(x)', '平方根'], ['SIN COS TAN ATN', 'SIN(x)', '三角関数(ラジアン)'], ['ACOS ASIN SINH COSH TANH', 'ACOS(x)', '逆三角関数・双曲線関数'],
  ['EXP LOG LOG10 LOG2', 'LOG(x)', '指数・対数(LOG は自然対数)'], ['DEG RAD', 'DEG(x)  RAD(x)', 'ラジアン⇔度'], ['PI', 'PI', '円周率'],
  ['MAX MIN', 'MAX(a,b,…)', '最大・最小'], ['MOD', 'MOD(a,b)', '剰余(結果は b と同じ符号)'], ['REMAINDER', 'REMAINDER(a,b)', '剰余(結果は a と同じ符号)'],
  ['RND', 'RND', '0以上1未満の乱数'], ['TIME', 'TIME', '真夜中からの秒数'],
])}
<h3>文字列</h3>
${h.funcs([
  ['LEN', 'LEN(a$)', '文字数'], ['LEFT$ RIGHT$', 'LEFT$(a$,n)', '左・右から n 文字'], ['MID$', 'MID$(a$,p[,n])', 'p 文字目(1から)から n 文字'],
  ['POS', 'POS(a$,b$[,開始])', 'a$ の中の b$ の位置(なければ 0)'], ['STR$ VAL', 'STR$(x)  VAL(a$)', '数⇔文字列'],
  ['CHR$ ORD', 'CHR$(n)  ORD(a$)', '文字コード'], ['UCASE$ LCASE$', 'UCASE$(a$)', '大文字・小文字に'],
  ['LTRIM$ RTRIM$', 'LTRIM$(a$)', '前・後ろの空白を取る'], ['RPT$', 'RPT$(a$,n)', 'n 回くり返す'], ['TIME$ DATE$', 'TIME$  DATE$', '現在の時刻・日付'],
])}`,
    },
    {
      id: 'graphics', title: 'グラフィック',
      html: `
<p>Full BASIC のグラフィックは、まず <code>SET WINDOW</code> で<b>自分の好きな座標系</b>を決めてから描きます。座標は<b>数学と同じ向き(右が x、上が y)</b>で、画面全体(正方形)が窓になります。窓を決めないと (0,0)〜(1,1) になります。</p>
${h.cmds([
  ['SET WINDOW', 'SET WINDOW 左, 右, 下, 上', '座標系を決めます。<code>SET WINDOW -5, 5, -5, 5</code> なら中心が (0,0)。'],
  ['SET COLOR', 'SET COLOR 色', '描く色。0〜7、色名(<code>"RED"</code>)、<code>MIX(r,g,b)</code>。'],
  ['PLOT POINTS', 'PLOT POINTS: x,y; x,y; …', '点を打ちます。'],
  ['PLOT LINES', 'PLOT LINES: x,y; x,y; …', '点を順につないだ折れ線を描きます。'],
  ['PLOT AREA', 'PLOT AREA: x,y; x,y; …', '多角形を塗りつぶします。'],
  ['PLOT TEXT', 'PLOT TEXT, AT x,y: "文字"', '図形画面に文字を描きます。'],
  ['BOX LINES', 'BOX LINES 左, 右, 下, 上', '四角形の枠。'],
  ['BOX AREA', 'BOX AREA 左, 右, 下, 上', '塗りつぶした四角形。'],
  ['BOX CIRCLE / ELLIPSE', 'BOX CIRCLE 左, 右, 下, 上', '四角形にぴったり入る円・楕円の枠。'],
  ['BOX DISK', 'BOX DISK 左, 右, 下, 上', '塗りつぶした円・楕円(このシミュレータの拡張)。'],
  ['CLEAR', 'CLEAR', '画面を消します。'],
])}
${h.table(['色', '0', '1', '2', '3', '4', '5', '6', '7'], [['番号', '黒', '青', '赤', '紫', '緑', '水色', '黄', '白'], ['色名', '"BLACK"', '"BLUE"', '"RED"', '"MAGENTA"', '"GREEN"', '"CYAN"', '"YELLOW"', '"WHITE"']])}
<p><code>MIX(r,g,b)</code> は赤・緑・青の割合(0〜1)で色を作ります(<code>MIX(1,0.5,0)</code> はオレンジ)。</p>
${h.ex(`SET WINDOW -7, 7, -1.5, 1.5
SET COLOR "BLUE"
PLOT LINES: -7, 0; 7, 0
PLOT LINES: 0, -1.5; 0, 1.5
SET COLOR "RED"
FOR x = -6.5 TO 6.5 STEP 0.05
   PLOT LINES: x, SIN(x); x + 0.05, SIN(x + 0.05)
NEXT x
END`, 'グラフ')}
${h.ex(`SET WINDOW 0, 10, 0, 10
SET COLOR "YELLOW"
BOX AREA 1, 4, 1, 4
SET COLOR "RED"
BOX LINES 1, 4, 1, 4
SET COLOR "BLUE"
BOX CIRCLE 5, 9, 1, 5
SET COLOR "GREEN"
PLOT AREA: 2, 6; 5, 9; 8, 6
PLOT TEXT, AT 1, 9.5: "Full BASIC"
END`, '図形')}
${h.ex(`SET WINDOW -1.2, 1.2, -1.2, 1.2
FOR k = 0 TO 12
   SET COLOR MOD(k, 6) + 1
   LET t = k * 3.14159265 / 6
   PLOT LINES: 0, 0; COS(t), SIN(t)
NEXT k
SET COLOR "BLACK"
BOX CIRCLE -1, 1, -1, 1
END`, '放射状の線')}`,
    },
    {
      id: 'errors', title: 'エラーメッセージ',
      html: `
${h.table(['メッセージ', '原因'], [
  ['構文エラー (Syntax error)', '文の書き方が違います。'],
  ['〜がありません (ブロックが閉じられていません)', '<code>END IF</code>、<code>NEXT</code>、<code>LOOP</code>、<code>END SELECT</code>、<code>END SUB</code> などの閉じ忘れ。'],
  ['〜は定義されていません', '<code>CALL</code> / 関数呼び出しの名前が見つかりません。'],
  ['引数の数が合いません', 'SUB / FUNCTION の仮引数と実引数の数がちがう。'],
  ['型が一致しません (Type mismatch)', '文字列と数を混ぜた(<code>LET a = "x"</code> など)。'],
  ['添字が範囲外です (Subscript out of range)', '配列の範囲を超えた。'],
  ['0で割りました (Division by zero)', '0 で割った。'],
  ['不正な関数呼び出しです', '<code>SQR(-1)</code> や <code>LOG(0)</code> など、関数の範囲外。'],
])}`,
    },
    {
      id: 'limits', title: '制限事項',
      html: `
<ul>
<li>規格にある MAT 文(行列演算)、PICTURE / DRAW、ファイル入出力、EXTYPE(例外処理)、文字列の SET TEXT 系の命令、<code>OPTION ARITHMETIC DECIMAL</code> などは未対応です。</li>
<li>数値はすべて倍精度で計算します(規格の10進演算は行いません)。</li>
<li>行番号は省略可能で(省略時は上から数えた番号が自動で付きます)、規格より緩くしています。変数は宣言なしで使え、未代入の数値は 0、文字列は空です。</li>
<li>グラフィックの窓は画面全体(正方形)に固定で、<code>SET VIEWPORT</code> は未対応です。</li>
</ul>
<p>他の方言との違いは <a href="compare.html">方言の比較</a> をご覧ください。</p>`,
    },
  ],
};
