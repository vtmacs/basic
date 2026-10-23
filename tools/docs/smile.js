module.exports = {
  title: 'smile BASIC マニュアル',
  lead: 'ゲームを作りたくなる現代的なBASIC(SmileBASIC風)。行番号なし、ラベル、関数(DEF)、配列、スプライトとBG、VSYNC でのフレーム同期、RGB() での色指定、ファイル保存。',
  sections: (h) => [
    {
      id: 'about', title: 'smile BASIC とは',
      html: `
<p>smile BASIC は、ニンテンドー3DS/Switch の「SmileBASIC」のように、<b>ゲームやグラフィックを手軽に作れる</b>ことを目指した現代的なBASICです。行番号は使わず、飛び先には <code>@LOOP</code> のような<b>ラベル</b>を使い、<code>DEF</code> で関数を作り、配列は <code>A[3]</code> のように <code>[ ]</code> で書きます。</p>
${h.tip('このシミュレータの smile BASIC は SmileBASIC の文法を参考にした再現です。文字画面(コンソール)・図形・<b>スプライト・BG</b>・<b>ファイル保存</b>に対応しています。音楽・ネットワーク・実機の細かい仕様は含みません。')}`,
    },
    {
      id: 'start', title: '画面とはじめかた',
      html: `
<ul>
<li>グラフィック画面は <b>400 × 240 ドット</b>(左上が (0,0))。その上に <b>50桁 × 30行</b>の文字画面(コンソール)が重なります。</li>
<li>実行は <b>「▶ 実行」</b>(<kbd>Ctrl</kbd>+<kbd>Enter</kbd>)。ずっと動き続けるプログラムは「■ 停止」で止めます。</li>
<li>キー操作: <kbd>←↑↓→</kbd> が十字キー、<kbd>Z</kbd><kbd>X</kbd><kbd>A</kbd><kbd>S</kbd> が A/B/X/Y ボタン、<kbd>Q</kbd><kbd>W</kbd> が L/R ボタン。画面をマウスでさわると <code>TOUCH</code> で座標が分かります。</li>
</ul>
${h.ex(`' はじめての smile BASIC
PRINT "Hello, World!"
COLOR 6
PRINT "COLOR で文字の色を変えます"
COLOR 15`, 'Hello, World')}`,
    },
    {
      id: 'program', title: 'プログラムの書き方',
      html: `
<ul>
<li><b>行番号は使いません</b>。1行に1つの文が基本で、<code>:</code> で区切れば複数書けます。</li>
<li>コメントは <code>'</code> から行末まで(または <code>REM</code>)。<code>?</code> は <code>PRINT</code> の省略形です。</li>
<li>飛び先のラベルは <code>@名前</code>。<code>GOTO @LOOP</code>、<code>GOSUB @SUB1</code> のように使います。</li>
<li>大文字・小文字は区別されません。文字列は <code>"..."</code>。</li>
<li>ブロックは <code>IF … ENDIF</code>、<code>FOR … NEXT</code>、<code>WHILE … WEND</code>、<code>REPEAT … UNTIL</code>、<code>DEF … END</code> など。</li>
</ul>`,
    },
    {
      id: 'data', title: '変数・配列・演算子',
      html: `
<h3>変数</h3>
<p>変数名は英字で始まる英数字と <code>_</code>。名前の最後に <code>$</code> を付けると文字列です。<code>VAR</code> で宣言できます(<code>VAR A=3, B$="x"</code>)。宣言しなくても代入すれば使えます。数値は整数でも小数でも構いません(<code>5/2</code> は 2.5)。</p>
<h3>定数</h3>
<p><code>#TRUE</code>(1) <code>#FALSE</code>(0) <code>#PI</code>、色 <code>#RED</code> <code>#GREEN</code> <code>#BLUE</code> <code>#YELLOW</code> <code>#CYAN</code> <code>#MAGENTA</code> <code>#WHITE</code> <code>#BLACK</code> <code>#GRAY</code> <code>#ORANGE</code> <code>#PURPLE</code> <code>#PINK</code> <code>#LIME</code> <code>#NAVY</code> <code>#MAROON</code> <code>#OLIVE</code> <code>#TEAL</code> <code>#SILVER</code>、ボタン <code>#UP</code> <code>#DOWN</code> <code>#LEFT</code> <code>#RIGHT</code> <code>#A</code> <code>#B</code> <code>#X</code> <code>#Y</code> <code>#L</code> <code>#R</code>。</p>
<h3>配列</h3>
<p><code>DIM A[10]</code> で要素数 10(<code>A[0]</code>〜<code>A[9]</code>)。<code>DIM B[3,4]</code> は2次元。配列リテラル <code>A=[3,1,2]</code> でも作れます。<code>LEN(A)</code> で要素数。範囲外は「添字が範囲外です」エラー。文字列も <code>A$[0]</code> のように1文字を取り出せます。</p>
<h3>演算子(強さの順)</h3>
${h.table(['演算子', '意味'], [
  ['<code>[ ]</code> <code>( )</code>', '添字・関数呼び出し・かっこ'],
  ['<code>-</code> <code>!</code>(単項)', '符号・論理否定(<code>!0</code> は 1)'],
  ['<code>* / %</code> <code>DIV</code> <code>MOD</code>', 'かけ算・割り算、<code>DIV</code> は整数の割り算、<code>MOD</code> と <code>%</code> は余り'],
  ['<code>+ -</code>', '足し算・引き算(<code>+</code> は文字列の連結にも)'],
  ['<code>&lt;&lt; &gt;&gt;</code>', 'ビットシフト'],
  ['<code>== != &lt; &gt; &lt;= &gt;=</code>', '比較。真は <b>1</b>、偽は 0。(<code>=</code> でも比較できます)'],
  ['<code>NOT</code> <code>AND</code> <code>OR</code> <code>XOR</code>', 'ビット演算(0と1の論理演算としても使えます)'],
  ['<code>&amp;&amp;</code> <code>||</code>', '論理積・論理和(結果は 0 か 1)'],
])}
${h.ex(`VAR A=7,B=2
PRINT A/B, A DIV B, A MOD B, A%B
PRINT A==7, A!=7, A>3 AND B<3
PRINT 1<<4, 255 AND 15
DIM T[3]
T[0]=10:T[1]=20:T[2]=30
PRINT T[1]+T[2], LEN(T)
S$="HELLO"
PRINT S$[1], LEN(S$)`, '演算子と配列')}`,
    },
    {
      id: 'io', title: '入出力・文字画面',
      html: `
${h.cmds([
  ['PRINT', 'PRINT 項目 [; | , 項目 ...]', '表示。<code>;</code> は続けて、<code>,</code> は4桁ごとの位置へ。行末の <code>;</code> で改行なし。'],
  ['INPUT', 'INPUT ["メッセージ";] 変数, …', 'キー入力。<code>;</code> のときは「メッセージ?」、<code>,</code> のときは「メッセージ」だけ。'],
  ['LINPUT', 'LINPUT ["メッセージ";] 文字列変数', '1行をそのまま受け取ります。'],
  ['INKEY$', 'A$ = INKEY$()', '押されたキーを1文字返します(なければ空文字列)。'],
  ['BUTTON', 'B = BUTTON()', '押されているボタンのビット(<code>#UP</code> <code>#DOWN</code> <code>#LEFT</code> <code>#RIGHT</code> <code>#A</code> <code>#B</code> <code>#X</code> <code>#Y</code> <code>#L</code> <code>#R</code>)。<code>IF B AND #LEFT THEN …</code>'],
  ['STICK', 'STICK OUT X,Y', '十字キーを -1〜1 の値で取得(右・上が +)。'],
  ['TOUCH', 'TOUCH OUT T,X,Y', 'マウス(タッチ)の状態。T は押している間のフレーム数、X,Y は座標。'],
  ['CLS', 'CLS', '文字画面を消します(図形は消えません)。'],
  ['LOCATE', 'LOCATE x, y', '文字の表示位置(左上が 0,0)。'],
  ['COLOR', 'COLOR 文字色 [, 背景色]', '文字の色(0〜15。下の表。背景の 0 は透明)。'],
  ['VSYNC / WAIT', 'VSYNC [n]  WAIT n', '画面の更新(1/60秒)を n 回待ちます。アニメーションの基本。'],
  ['BEEP', 'BEEP', 'ビープ音。'],
  ['RANDOMIZE', 'RANDOMIZE [種]', '乱数の種を決めます。'],
])}
${h.table(['COLOR', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'], [['色', '黒', '栗', '赤', '紫', '緑', '黄緑', 'オリーブ', '黄', '紺', '青', '青緑', '水色', '灰', '銀', '白']])}
${h.ex(`INPUT "お名前は";N$
LOCATE 0,3
FOR I=1 TO 15
  COLOR I
  PRINT N$;" ";
NEXT
COLOR 15
PRINT
PRINT "こんにちは、";N$;"さん"`, 'INPUT / COLOR')}`,
    },
    {
      id: 'control', title: '制御構造',
      html: `
${h.cmds([
  ['IF', 'IF 条件 THEN 文 [ELSE 文]', '1行形式。<code>THEN</code> のあとに文を書きます。'],
  ['IF … ENDIF', 'IF 条件 THEN … ELSEIF 条件 THEN … ELSE … ENDIF', 'ブロック形式(<code>THEN</code> のあとで改行)。'],
  ['SWITCH', 'SWITCH 式 / CASE 値,値 / DEFAULT / ENDSWITCH', '値による多分岐(上から順に1つだけ実行)。'],
  ['FOR / NEXT', 'FOR 変数=初期値 TO 終了値 [STEP 増分] … NEXT', 'くり返し。<code>BREAK</code> で抜ける、<code>CONTINUE</code> で次へ。'],
  ['WHILE / WEND', 'WHILE 条件 … WEND', '条件が真の間くり返し。'],
  ['REPEAT / UNTIL', 'REPEAT … UNTIL 条件', '先に実行して、条件が真になるまでくり返し。'],
  ['GOTO / GOSUB', 'GOTO @ラベル  GOSUB @ラベル … RETURN', 'ラベルへ飛ぶ・サブルーチンを呼ぶ。'],
  ['ON … GOTO / GOSUB', 'ON 式 GOTO @A,@B,@C', '式の値(1,2,…)で飛び先を選ぶ。'],
  ['END / STOP', 'END', 'プログラムの終了(DEF の中の <code>END</code> は DEF の終わり)。'],
])}
${h.ex(`FOR I=1 TO 20
  IF I MOD 15==0 THEN
    PRINT "FizzBuzz"
  ELSEIF I MOD 3==0 THEN
    PRINT "Fizz"
  ELSEIF I MOD 5==0 THEN
    PRINT "Buzz"
  ELSE
    PRINT I
  ENDIF
NEXT`, 'IF ブロック')}
${h.ex(`FOR I=1 TO 6
  SWITCH I
  CASE 1,2
    PRINT I;" は小さい"
  CASE 3
    PRINT I;" は真ん中"
  DEFAULT
    PRINT I;" は大きい"
  ENDSWITCH
NEXT`, 'SWITCH')}`,
    },
    {
      id: 'def', title: 'DEF(関数・手続き)',
      html: `
<ul>
<li><code>DEF 名前(仮引数, …)</code> … <code>END</code> で定義します。<code>RETURN 値</code> で値を返し、<code>RETURN</code> だけなら値なしで戻ります。</li>
<li>値を返す関数は式の中で <code>名前(引数)</code>、値を返さない手続きは文として <code>名前 引数, …</code> と呼び出せます(括弧は付けても構いません)。</li>
<li>DEF の中の変数は<b>その DEF だけのもの</b>(ローカル)です。外側(グローバル)で作った変数は<b>読む</b>ことはできますが、代入すると DEF の中だけの新しい変数になります。外へ値を返したいときは <code>RETURN</code> を使います。</li>
<li>配列は参照で渡されます(DEF の中で変更すると呼び出し元にも反映)。再帰呼び出しもできます。</li>
</ul>
${h.ex(`DEF FACT(N)
  IF N<=1 THEN RETURN 1
  RETURN N*FACT(N-1)
END

DEF SHOW A
  VAR I
  FOR I=0 TO LEN(A)-1
    PRINT A[I];" ";
  NEXT
  PRINT
END

DIM A[5]
VAR I
FOR I=0 TO 4:A[I]=FACT(I+1):NEXT
SHOW A
PUSH A,720
PRINT "要素数=";LEN(A)
RSORT A
SHOW A`, 'DEF と配列')}`,
    },
    {
      id: 'arrays', title: '配列の命令・データ',
      html: `
${h.cmds([
  ['DIM', 'DIM A[n]  DIM B[n,m]', '配列を作ります(要素数 n)。'],
  ['VAR', 'VAR A=値, B$=値', '変数の宣言と初期値。'],
  ['PUSH / POP', 'PUSH A,値  X=POP(A)', '配列の最後に追加 / 最後を取り出す。'],
  ['UNSHIFT / SHIFT', 'UNSHIFT A,値  X=SHIFT(A)', '配列の先頭に追加 / 先頭を取り出す。'],
  ['SORT / RSORT', 'SORT A  RSORT A', '昇順・降順に並べ替えます。'],
  ['INC / DEC', 'INC 変数[,n]  DEC 変数[,n]', '変数を増やす・減らす(省略時は 1)。'],
  ['SWAP', 'SWAP A,B', '2つの変数(配列の要素でも可)を入れ替えます。'],
  ['DATA / READ / RESTORE', 'DATA 値,…  READ 変数,…  RESTORE @ラベル', 'データの埋め込みと読み込み。'],
])}
${h.ex(`@LOOP
READ N$,P
IF N$=="END" THEN GOTO @OWARI
PRINT N$;"は";P;"円"
GOTO @LOOP
@OWARI
PRINT "おしまい"
DATA "りんご",120,"みかん",80,"ぶどう",450,"END",0`, 'ラベルと DATA / READ')}`,
    },
    {
      id: 'functions', title: '関数',
      html: `
<h3>数値</h3>
${h.funcs([
  ['ABS SGN', 'ABS(x)', '絶対値・符号'], ['FLOOR CEIL ROUND', 'FLOOR(x)', '切り捨て(小さい方へ)・切り上げ・四捨五入'],
  ['SQR POW', 'SQR(x)  POW(x,y)', '平方根・べき乗'], ['SIN COS TAN', 'SIN(x)', '三角関数(ラジアン)'], ['ASIN ACOS ATAN', 'ATAN(y[,x])', '逆三角関数'],
  ['SINH COSH TANH', 'SINH(x)', '双曲線関数'], ['EXP LOG', 'LOG(x[,底])', '指数・対数'], ['DEG RAD', 'DEG(x)', 'ラジアン⇔度'], ['PI', 'PI()', '円周率'],
  ['MAX MIN', 'MAX(a,b,…)', '最大・最小(配列も渡せます)'], ['CLAMP', 'CLAMP(x,min,max)', '範囲に収める'],
  ['RND', 'RND(n)', '0〜n-1 のランダムな整数'], ['RNDF', 'RNDF()', '0以上1未満のランダムな実数'],
  ['MAINCNT / MILLISEC', 'MAINCNT', '開始からのフレーム数(1/60秒)/ ミリ秒'],
])}
<h3>文字列</h3>
${h.funcs([
  ['LEN', 'LEN(a$)', '文字数(配列なら要素数)'], ['LEFT$ RIGHT$', 'LEFT$(a$,n)', '左・右から n 文字'], ['MID$', 'MID$(a$,開始,n)', '<b>0から数えて</b>、開始位置から n 文字'],
  ['INSTR', 'INSTR([開始,]a$,b$)', 'a$ の中の b$ の位置(0から数え、なければ -1)'], ['SUBST$', 'SUBST$(a$,開始,n,b$)', '一部を置きかえる'],
  ['STR$ VAL', 'STR$(x)  VAL(a$)', '数⇔文字列(<code>VAL("&amp;HFF")</code> も可)'], ['CHR$ ASC', 'CHR$(n)  ASC(a$)', '文字コード'],
  ['HEX$ BIN$', 'HEX$(n[,桁])', '16進・2進の文字列'], ['FORMAT$', 'FORMAT$("%05d|%.2f|%s", 7, 3.14159, "a")', '書式つき文字列(<code>%d %f %s %x %c</code>)'],
  ['TIME$ DATE$', 'TIME$  DATE$', '現在の時刻・日付'],
])}
${h.ex(`A$="HELLO WORLD"
PRINT LEN(A$);" ";MID$(A$,6,5);" ";INSTR(A$,"WORLD")
PRINT SUBST$(A$,0,5,"HI")
PRINT FORMAT$("%05d|%6.2f|%s|%x",42,3.14159,"ok",255)
PRINT RND(6)+1, RNDF()
PRINT FLOOR(-1.5), CEIL(1.2), ROUND(2.5), POW(2,8)`, '文字列と数値の関数')}`,
    },
    {
      id: 'graphics', title: 'グラフィック',
      html: `
<p>グラフィックは 400 × 240 ドット。座標は<b>左上が (0,0)</b>で、右へ x、下へ y が増えます。色は <code>RGB(赤,緑,青)</code>(各 0〜255)か、<code>#RED</code> などの定数で指定します。色を省略すると <code>GCOLOR</code> で決めた色(最初は白)になります。</p>
${h.cmds([
  ['RGB', 'RGB(r,g,b)', '色を作る関数。'],
  ['GCOLOR', 'GCOLOR 色', '図形の標準の色。'],
  ['GCLS', 'GCLS [色]', 'グラフィック画面を指定の色(省略時は黒)で塗りつぶします。'],
  ['GPSET', 'GPSET x,y[,色]', '点を打ちます。'],
  ['GLINE', 'GLINE x1,y1,x2,y2[,色]', '線を引きます。'],
  ['GBOX', 'GBOX x1,y1,x2,y2[,色]', '四角形の枠。'],
  ['GFILL', 'GFILL x1,y1,x2,y2[,色]', '塗りつぶした四角形。'],
  ['GCIRCLE', 'GCIRCLE x,y,r[,色]', '円。<code>GCIRCLE x,y,r,開始角,終了角,フラグ[,色]</code> で円弧(角度は度)。'],
  ['GPAINT', 'GPAINT x,y[,色]', 'その点とつながった同じ色の領域を塗りつぶします。'],
  ['GPRINT', 'GPRINT x,y,"文字"', 'グラフィック画面の座標に文字を描きます。'],
  ['GSPOIT', 'GSPOIT(x,y)', '点の色を返す関数。'],
  ['ACLS', 'ACLS', '文字画面とグラフィック画面を初期状態に戻します。'],
  ['XSCREEN / DISPLAY', 'XSCREEN …', '互換のために受け付けます(何もしません)。'],
])}
${h.ex(`GCLS RGB(0,0,64)
FOR I=0 TO 11
  GCIRCLE 200,120,10+I*9,RGB(255-I*20,128+I*10,I*20)
NEXT
GFILL 10,10,60,40,#RED
GBOX 10,10,60,40,#WHITE
GLINE 0,0,399,239,#YELLOW
GLINE 0,239,399,0,#YELLOW
LOCATE 2,28
PRINT "GRAPHICS"`, '図形')}
${h.ex(`GCLS RGB(0,0,30)
VAR I,X,Y,C
FOR I=0 TO 300
  X=RND(400):Y=RND(240):C=RND(200)+55
  GPSET X,Y,RGB(C,C,C)
NEXT
GCIRCLE 320,60,25,#YELLOW
GPAINT 320,60,#YELLOW
GPRINT 10,10,"STARS"`, '星空')}`,
    },
    {
      id: 'game', title: '動かしてみよう(VSYNC・ボタン)',
      html: `
<p>画面を1コマずつ描き直し、<code>VSYNC</code> で次のフレームまで待つのが、アニメーションとゲームの基本の形です。</p>
${h.ex(`' 実行すると跳ね続けます。←→キーで操作。「停止」で終了
VAR X=200,Y=40,VX=3,VY=0,B
WHILE 1
  B=BUTTON()
  IF B AND #LEFT THEN VX=VX-0.3
  IF B AND #RIGHT THEN VX=VX+0.3
  VY=VY+0.4
  X=X+VX:Y=Y+VY
  IF X<10 THEN X=10:VX=-VX
  IF X>390 THEN X=390:VX=-VX
  IF Y>225 THEN Y=225:VY=-VY*0.9
  GCLS RGB(0,0,50)
  GFILL 0,230,399,239,#GREEN
  GCIRCLE X,Y,10,#WHITE
  GPAINT X,Y,#RED
  LOCATE 0,0:PRINT "LEFT/RIGHT KEY"
  VSYNC 1
WEND`, 'ボールの動き')}
${h.ex(`' 画面をマウスでなぞって絵をかく
GCLS RGB(20,20,40)
VAR T,X,Y,PX,PY,C
PX=-1
WHILE 1
  TOUCH OUT T,X,Y
  IF T>0 THEN
    C=RGB(RND(256),RND(256),255)
    IF PX>=0 THEN GLINE PX,PY,X,Y,C
    PX=X:PY=Y
  ELSE
    PX=-1
  ENDIF
  VSYNC
WEND`, 'TOUCH で絵をかく')}`,
    },
    {
      id: 'sprite', title: 'スプライト',
      html: `
<p>スプライトは、画面の上を自由に動かせる小さな絵(キャラクター)です。0〜511 の番号で管理し、<b>位置・回転・拡大・色・当たり判定</b>を持ちます。絵は<b>グラフィックページ4</b>から切り出して使います(<a href="#page">グラフィックページ</a>を参照)。</p>
<h3>最初から使える絵</h3>
<p>何も用意しなくても、<code>SPSET 番号, 定義番号</code> の「定義番号」に次の数を指定すれば使えます。<b>定義番号 = 形の番号 × 4 + 色の番号</b>(16×16ドット)です。</p>
${h.table(['形 \\ 色', '0 赤', '1 青', '2 緑', '3 黄'], [
  ['0 円', '0', '1', '2', '3'], ['1 四角', '4', '5', '6', '7'], ['2 ひし形', '8', '9', '10', '11'], ['3 三角', '12', '13', '14', '15'],
  ['4 星', '16', '17', '18', '19'], ['5 ハート', '20', '21', '22', '23'], ['6 顔', '24', '25', '26', '27'], ['7 輪', '28', '29', '30', '31'],
])}
<p>自分で絵をかくときは、ページ4に図形命令で絵を描いて <code>SPDEF</code> で範囲を登録します(下の例)。ページ4・5は 16×16 の升目に左上から順に番号が付き、番号 <i>n</i> の升目は <code>u=(n MOD 32)*16, v=(n DIV 32)*16</code> の位置です。</p>
${h.cmds([
  ['SPSET', 'SPSET id, 定義番号  /  SPSET id, u,v,w,h[,属性]', 'スプライトを作って表示します。属性の 1 ビット目が表示(省略すると表示)。'],
  ['SPCLR', 'SPCLR [id]', 'スプライトを消します(省略すると全部)。'],
  ['SPOFS', 'SPOFS id, x, y[, z]  /  SPOFS id OUT x,y,z', '位置(基準点がくる場所)を決める・取得する。z が大きいほど奥。'],
  ['SPHOME', 'SPHOME id, x, y', '基準点(回転・拡大の中心)。左上が (0,0)。16×16 の中心は <code>8,8</code>。'],
  ['SPROT', 'SPROT id, 角度  /  SPROT id OUT 角度', '回転(度。時計回り)。'],
  ['SPSCALE', 'SPSCALE id, 横倍率, 縦倍率', '拡大・縮小。負の値で反転します。'],
  ['SPCOLOR', 'SPCOLOR id, 色', '色をかけ合わせます(<code>#WHITE</code> でそのまま)。'],
  ['SPSHOW / SPHIDE', 'SPSHOW id  SPHIDE id', '表示・非表示。'],
  ['SPCHR', 'SPCHR id, 定義番号', '絵を差しかえます。'],
  ['SPDEF', 'SPDEF 定義番号, u, v, w, h[, hx, hy]', '定義番号に、ページ4の範囲(と基準点)を登録します。'],
  ['SPANIM', 'SPANIM id, 対象, 時間, 値…[, くり返し]', '自動アニメーション(下で説明)。'],
  ['SPCOL', 'SPCOL id, x, y, w, h', '当たり判定の四角形(スプライトの左上が基準)。省略するとスプライト全体。'],
  ['SPHITSP', 'SPHITSP(id1, id2)  SPHITSP(id)', '2つが重なっていれば 1。引数1つなら重なっている別のスプライトの番号(なければ -1)。'],
  ['SPHITRC', 'SPHITRC(id, x, y, w, h)', '四角形と重なっていれば 1。'],
  ['SPUSED', 'SPUSED(id)', '使われていれば 1。'],
  ['SPVAR', 'SPVAR id, 番号, 値  /  SPVAR(id, 番号)', 'スプライトごとのメモ用変数(番号 0〜7)。速度や体力を持たせられます。'],
])}
<h3>SPANIM(自動アニメーション)</h3>
<p>時間の単位はフレーム(1/60秒)。<b>値を並べるごとに、その値まで時間をかけて変化</b>します。最後に1つ数を付けるとくり返し回数(<code>0</code> は無限)です。</p>
${h.table(['対象', '並べる値(1組)', '意味'], [
  ['<code>"XY"</code>', '時間, x, y', '位置をなめらかに動かす'], ['<code>"R"</code>', '時間, 角度', '回転'], ['<code>"S"</code>', '時間, 横倍率, 縦倍率', '拡大・縮小'],
  ['<code>"C"</code>', '時間, 色', '色の変化'], ['<code>"I"</code>', '時間, 定義番号', 'その時間だけ、その絵を表示(パラパラ漫画)'],
])}
<h3>重ね順</h3>
<p>奥から順に、グラフィック画面 → BG(3層→0層)→ スプライト(<code>z</code> が大きいものが奥)→ 文字画面です。当たり判定は回転を考えない四角形で行います。</p>
${h.ex(`' ←→↑↓キーで顔を動かして、星を集めよう
VAR I,X=200,Y=120,B,SC=0
SPSET 0,27:SPHOME 0,8,8:SPOFS 0,X,Y
FOR I=1 TO 5
  SPSET I,16:SPHOME I,8,8
  SPOFS I,RND(380)+10,RND(220)+10
NEXT
WHILE 1
  B=BUTTON()
  IF B AND #LEFT THEN X=X-3
  IF B AND #RIGHT THEN X=X+3
  IF B AND #UP THEN Y=Y-3
  IF B AND #DOWN THEN Y=Y+3
  X=CLAMP(X,8,392):Y=CLAMP(Y,8,232)
  SPOFS 0,X,Y
  FOR I=1 TO 5
    IF SPHITSP(0,I) THEN
      INC SC
      SPOFS I,RND(380)+10,RND(220)+10
    ENDIF
  NEXT
  LOCATE 0,0:PRINT "SCORE ";SC
  VSYNC
WEND`, 'スプライトで星あつめ')}
${h.ex(`' 動き・回転・絵の切りかえ・色の変化を SPANIM にまかせる
SPSET 0,0:SPHOME 0,8,8:SPSCALE 0,3,3
SPOFS 0,50,60
SPANIM 0,"XY",120,350,60,120,50,60,0
SPSET 1,16:SPHOME 1,8,8:SPSCALE 1,3,3
SPOFS 1,200,130
SPANIM 1,"R",120,360,0
SPSET 2,24:SPHOME 2,8,8:SPSCALE 2,3,3
SPOFS 2,100,200
SPANIM 2,"I",15,24,15,27,0
SPSET 3,12:SPHOME 3,8,8:SPSCALE 3,2,2
SPOFS 3,300,200
SPANIM 3,"C",60,RGB(255,0,0),60,RGB(0,255,255),0
WHILE 1
  VSYNC
WEND`, 'SPANIM')}
${h.ex(`' グラフィックページ4に絵をかき、SPDEF でスプライトにする
GPAGE 0,4
GFILL 0,128,15,143,RGB(255,200,0)
GFILL 3,132,5,135,#BLACK
GFILL 10,132,12,135,#BLACK
GLINE 3,139,12,139,#BLACK
GLINE 3,138,3,139,#BLACK
GLINE 12,138,12,139,#BLACK
GPAGE 0,0
SPDEF 200,0,128,16,16
SPSET 0,200:SPHOME 0,8,8:SPOFS 0,200,120:SPSCALE 0,5,5
SPSET 1,200:SPHOME 1,8,8:SPOFS 1,60,60
WHILE 1
  SPROT 0,MAINCNT*2
  VSYNC
WEND`, '自分で絵をかいてスプライトに')}`,
    },
    {
      id: 'bg', title: 'BG(背景)',
      html: `
<p>BG は、小さなタイル(16×16ドット)を升目に並べて作る背景です。0〜3 の<b>4つの層</b>があり、広い面をスクロールさせられます。タイルの絵は<b>グラフィックページ5</b>から取り、番号 <i>n</i> のタイルはスプライトと同じく左上から順に付きます。タイル番号 0 は透明です。</p>
${h.table(['番号', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10〜15'], [['タイル', '透明', 'ブロック', 'れんが', '草地', '水', '砂', '石', '空', '黒', '市松', '赤・緑・青・黄・紫・水色の単色']])}
${h.cmds([
  ['BGSCREEN', 'BGSCREEN 層, 横のマス数, 縦のマス数', '層の大きさを決めます(省略しても <code>BGPUT</code> したときに 64×64 で作られます)。'],
  ['BGPUT', 'BGPUT 層, x, y, タイル番号', 'マス(x,y)にタイルを置きます。'],
  ['BGFILL', 'BGFILL 層, x1, y1, x2, y2, タイル番号', '範囲をタイルで埋めます。'],
  ['BGGET', 'BGGET(層, x, y)', 'マスのタイル番号を返します。'],
  ['BGOFS', 'BGOFS 層, x, y  /  BGOFS 層 OUT x,y', 'スクロール位置(ドット)。層の端までいくと反対側につながります。'],
  ['BGSHOW / BGHIDE', 'BGSHOW 層  BGHIDE 層', '層の表示・非表示。'],
  ['BGCLR', 'BGCLR [層]', '層を消します(省略すると全部)。'],
])}
<p>タイル番号に <code>&amp;H8000</code> を足すと左右反転、<code>&amp;H4000</code> を足すと上下反転します(<code>BGPUT 0,3,5,2+&amp;H8000</code>)。</p>
${h.ex(`' BG(背景のタイル)を3層に重ねてスクロールする(番号の小さい層が手前)
BGSCREEN 2,64,15
BGFILL 2,0,0,63,14,7
BGSCREEN 1,64,15
VAR I,X=0
FOR I=2 TO 60 STEP 9
  BGFILL 1,I,3,I+2,4,1
NEXT
BGSCREEN 0,64,15
BGFILL 0,0,13,63,14,3
FOR I=0 TO 62 STEP 5
  BGPUT 0,I,12,2
NEXT
SPSET 0,27:SPHOME 0,8,8:SPOFS 0,100,200
WHILE 1
  X=X+2
  BGOFS 0,X,0
  BGOFS 1,X/3,0
  VSYNC
WEND`, 'BG のスクロール')}`,
    },
    {
      id: 'page', title: 'グラフィックページ',
      html: `
<p>グラフィックには<b>ページ</b>があります。ページ0は画面に表示される 400×240 の面、ページ1〜5 は 512×512 の作業用の面です。<b>ページ4はスプライトの絵、ページ5はBGタイルの絵</b>に使われます(最初から標準の絵が入っています)。</p>
${h.cmds([
  ['GPAGE', 'GPAGE 表示ページ[, 描画ページ]', '表示するページと、<code>GPSET</code> や <code>GLINE</code> などで描くページを決めます。(このシミュレータでは「表示, 描画」の順です。)'],
  ['GCOPY', 'GCOPY [元ページ,] x1,y1,x2,y2, dx,dy, モード', '描画ページの (dx,dy) へ四角形をコピー。モード 0 は透明部分をコピーしない、1 はそのままコピー。'],
  ['GCLS', 'GCLS', '描画ページを<b>透明</b>にします(ページ0は背景の黒が見えます)。<code>GCLS 色</code> でその色に。'],
  ['ACLS', 'ACLS', '画面・スプライト・BG・ページ4/5 を最初の状態に戻します。'],
])}
<p>透明な点(まだ何も描いていない点)は、スプライトやBGでは抜けて見えます。<code>GPAGE 0,4</code> で描画先をページ4にして絵を描き、終わったら <code>GPAGE 0,0</code> で戻すのが基本の流れです。</p>`,
    },
    {
      id: 'file', title: 'ファイル(SAVE / LOAD)',
      html: `
<p>プログラムから、文字列や配列をファイルとして保存・読み込みできます。ファイルは<b>お使いのブラウザの中</b>(この サイト用の保存領域)に保存されるので、ページを閉じても、次に開いたときに残っています。別のパソコンや別のブラウザとは共有されません。</p>
<ul>
<li>ファイル名は <code>"TXT:名前"</code>(文字列用)か <code>"DAT:名前"</code>(配列用)。名前は英数字と <code>_ - .</code> で32文字まで(大文字小文字は区別しません)。</li>
<li>保存できる量はブラウザの制限(数MB)までです。</li>
</ul>
${h.cmds([
  ['SAVE', 'SAVE "TXT:名前", 文字列  /  SAVE "DAT:名前", 配列', '保存します(同じ名前は上書き)。'],
  ['LOAD', 'LOAD("TXT:名前")  /  LOAD "TXT:名前", 変数  /  LOAD "DAT:名前", 配列変数', '読み込みます。関数の形(<code>A$=LOAD("TXT:X")</code>)でも使えます。'],
  ['FILES', 'FILES  /  FILES 文字列配列', 'ファイルの一覧を表示(または配列に入れる)。'],
  ['DELETE', 'DELETE "TXT:名前"', 'ファイルを消します。'],
  ['RENAME', 'RENAME "TXT:旧", "TXT:新"', '名前を変えます。'],
])}
<p>見つからないファイルを <code>LOAD</code> するとエラーになります。先に <code>FILES</code> で確かめるとよいでしょう。ブラウザの「サイトデータの削除」をすると、保存したファイルも消えます。</p>
${h.ex(`' ブラウザに保存されるので、もう一度実行しても記録が残ります
VAR HI=0,N,I,FOUND=0
FILES F$
FOR I=0 TO LEN(F$)-1
  IF F$[I]=="TXT:HISCORE" THEN FOUND=1
NEXT
IF FOUND THEN HI=VAL(LOAD("TXT:HISCORE"))
PRINT "ハイスコア: ";HI
N=RND(1000)
PRINT "今回のスコア: ";N
IF N>HI THEN
  PRINT "新記録!"
  SAVE "TXT:HISCORE",STR$(N)
ENDIF`, 'ハイスコアの保存')}
${h.ex(`' 配列を DAT ファイルに保存して読み戻す
DIM A[5]
VAR I
FOR I=0 TO 4:A[I]=I*I:NEXT
SAVE "DAT:SQUARES",A
DIM B[1]
LOAD "DAT:SQUARES",B
PRINT LEN(B);" 個: ";B[0];B[1];B[2];B[3];B[4]
DELETE "DAT:SQUARES"`, '配列の保存')}`,
    },
    {
      id: 'errors', title: 'エラーメッセージ',
      html: `
${h.table(['メッセージ', '原因'], [
  ['構文エラー (Syntax error)', '文の書き方が違います。'],
  ['〜がありません (ブロックが閉じられていません)', '<code>ENDIF</code> / <code>WEND</code> / <code>NEXT</code> / <code>UNTIL</code> / <code>END</code>(DEF)の閉じ忘れ。'],
  ['未定義のラベルです', '<code>GOTO @XXX</code> のラベルが存在しません。'],
  ['〜は定義されていません', '<code>DEF</code> が見つかりません(つづりを確認)。'],
  ['型が一致しません (Type mismatch)', '<code>A="x"</code> のように、数の変数に文字列を入れた(文字列変数には <code>$</code> が必要)。'],
  ['添字が範囲外です (Subscript out of range)', '配列・文字列の範囲を超えた。'],
  ['配列が定義されていません', '<code>DIM</code> しないで <code>A[0]</code> を使った。'],
  ['0で割りました (Division by zero)', '0 で割った。'],
  ['〜は〜のコマンドです (smile BASICでは使えません)', '他の方言の命令を使った。smile BASIC での書き方に直します。'],
])}`,
    },
    {
      id: 'limits', title: '制限事項',
      html: `
<ul>
<li>未対応: 音楽(BGMPLAY)・効果音の細かい制御、BGのアニメーション/回転/拡大(BGANIM など)、スプライトの連結(SPLINK)、SPFUNC、回転を考えた当たり判定、スプライトの左右反転属性(かわりに <code>SPSCALE</code> の負の値を使います)、GSAVE/GLOAD や PRG・GRP のファイル、OUT 引数つきの DEF、マルチタスク、KEYBOARD。</li>
<li>スプライトは最大 512 個、BG は 4 層(最大 256×256 マス)、グラフィックページは 6 枚です。描画は最近傍(ドットのまま拡大)です。</li>
<li><code>COLOR</code> の16色パレットは本シミュレータのものです(実機とは色が少し違います)。<code>RGB()</code> は 24 ビットの色を返します(透明度は使いません)。</li>
<li><code>BUTTON()</code> の割り当て・<code>STICK</code> の値はキーボード用の簡易的なものです。</li>
<li>標準のスプライト/タイルの絵は、このシミュレータ独自のものです。</li>
<li>関数(式の中で呼ぶ DEF)の中では <code>INPUT</code> や <code>VSYNC</code> のように「待つ」命令は使えません(手続きとして呼ぶ DEF の中なら使えます)。</li>
<li>文字は 8×8 ドット相当の升目に描かれ、フォントは実機と異なります。</li>
</ul>
<p>他の方言との違いは <a href="compare.html">方言の比較</a> をご覧ください。</p>`,
    },
  ],
};
