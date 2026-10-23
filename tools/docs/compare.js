// 方言の比較ページ。セルの先頭の y: / p: / n: は ● / △ / × の印になる。
const ROWS = [
  ['基本', [
    ['時代・出どころ', '1975年ごろ。Tiny BASIC 仕様(最小のBASIC)', '1980年代。NEC PC-8801/9801 の標準BASIC(Microsoft BASIC系)', '1980年代に規格化(ANSI/ISO、JIS X 3003)。教育用', '2010年代〜。ゲーム向けの現代的BASIC(SmileBASIC風)'],
    ['行番号', '必須', '必須', 'p:省略できる(付けても可)', 'y:使わない(ラベル <code>@名前</code>)'],
    ['1行に複数の文(<code>:</code>)', 'n:不可', 'y:可', 'y:可', 'y:可'],
    ['コメント', '<code>REM</code>', '<code>REM</code> と <code>\'</code>', '<code>!</code> と <code>REM</code>', '<code>\'</code> と <code>REM</code>'],
    ['代入', '<code>LET A=1</code>(LET は省略可)', '<code>LET A=1</code>(LET は省略可)', '<code>LET a = 1</code>(LET は省略可)', '<code>A=1</code>(LET はない)'],
    ['大文字・小文字', '区別しない', '区別しない', '区別しない', '区別しない'],
  ]],
  ['変数と型', [
    ['変数名', 'A〜Z の1文字だけ', '長い名前(型の記号つき)', '長い名前', '長い名前'],
    ['数', '整数のみ(-32767〜32767)', '整数 <code>%</code>・単精度・倍精度 <code>#</code>', '実数(倍精度)', '整数・実数(<code>5/2</code> = 2.5)'],
    ['文字列', 'n:なし', 'y:<code>A$</code>', 'y:<code>a$</code>', 'y:<code>A$</code>'],
    ['型の宣言', 'n:なし', '<code>DEFINT</code> など', 'n:不要', '<code>VAR</code>(省略可)'],
    ['配列', '<code>@(i)</code> の1本だけ', '<code>DIM A(10)</code>(0〜10の11個)', '<code>DIM a(10)</code>(下限指定可: <code>-2 TO 2</code>)', '<code>DIM A[10]</code>(10個。<code>A[0]</code>〜<code>A[9]</code>)'],
    ['添字のかっこ', '<code>@( )</code>', '<code>( )</code>', '<code>( )</code>', '<code>[ ]</code>'],
    ['配列リテラル・PUSH/POP/SORT', 'n:なし', 'n:なし', 'n:なし', 'y:あり'],
  ]],
  ['演算子', [
    ['割り算', '整数(切り捨て)', '実数(<code>\\</code> で整数の割り算)', '実数', '実数(<code>DIV</code> で整数の割り算)'],
    ['真・偽の値', '真 = 1', '真 = <b>-1</b>、偽 = 0', '真 = 1', '真 = 1'],
    ['等しい', '<code>=</code>', '<code>=</code>', '<code>=</code>', '<code>==</code>(<code>=</code>でも可)'],
    ['等しくない', '<code>&lt;&gt;</code> <code>&gt;&lt;</code>', '<code>&lt;&gt;</code>', '<code>&lt;&gt;</code>', '<code>!=</code> <code>&lt;&gt;</code>'],
    ['論理演算', 'n:なし', 'y:<code>AND OR NOT XOR EQV IMP</code>(ビット演算)', 'y:<code>AND OR NOT</code>', 'y:<code>AND OR NOT XOR</code> と <code>&amp;&amp; || !</code>'],
    ['余り', 'n:なし', '<code>MOD</code>', '関数 <code>MOD(a,b)</code>', '<code>MOD</code> と <code>%</code>'],
    ['文字列の連結', '-', '<code>+</code>', '<code>&amp;</code> と <code>+</code>', '<code>+</code>'],
  ]],
  ['出力・入力', [
    ['数の表示', '空白なし(<code>PRINT 5</code> → <code>5</code>)', '前後に空白(<code> 5 </code>)。<code>.5</code> と書く', '前後に空白(<code> 5 </code>)', '空白なし(<code>5</code>)'],
    ['<code>PRINT</code> のカンマ', '8桁ごと', '14桁ごと', '16桁ごと', '4桁ごと'],
    ['書式つき表示', 'n:なし', 'y:<code>PRINT USING</code>', 'y:<code>PRINT USING</code>', 'y:<code>FORMAT$()</code>'],
    ['INPUT', '<code>INPUT A,B</code>', '<code>INPUT "メッセージ";A</code>', '<code>INPUT PROMPT "メッセージ": a</code>', '<code>INPUT "メッセージ";A</code>'],
    ['1行入力', 'n:なし', '<code>LINE INPUT</code>', '<code>LINE INPUT</code>', '<code>LINPUT</code>'],
    ['キー入力(1文字)', 'n:なし', '<code>INKEY$</code>', 'n:なし', '<code>INKEY$()</code>・<code>BUTTON()</code>・<code>TOUCH</code>'],
    ['文字の表示位置', 'n:なし', '<code>LOCATE x,y</code>(0から)', '<code>SET CURSOR 行,桁</code>(1から)', '<code>LOCATE x,y</code>(0から)'],
    ['文字の色', 'p:<code>COLOR</code>(拡張)', '<code>COLOR 0〜7</code>', 'n:なし', '<code>COLOR 0〜15</code>'],
  ]],
  ['制御構造', [
    ['IF', '<code>IF 条件 THEN 文</code>(ELSEなし)', '<code>IF … THEN … ELSE …</code>(1行)', 'ブロック <code>IF … END IF</code> と 1行形式', 'ブロック <code>IF … ENDIF</code> と 1行形式'],
    ['多分岐', 'n:なし', '<code>ON 式 GOTO</code>', '<code>SELECT CASE</code>・<code>ON GOTO</code>', '<code>SWITCH</code>・<code>ON GOTO</code>'],
    ['くり返し', 'p:<code>IF</code> と <code>GOTO</code> だけ', '<code>FOR/NEXT</code>・<code>WHILE/WEND</code>', '<code>FOR/NEXT</code>・<code>DO/LOOP</code>(<code>EXIT</code>)', '<code>FOR/NEXT</code>・<code>WHILE/WEND</code>・<code>REPEAT/UNTIL</code>(<code>BREAK</code> <code>CONTINUE</code>)'],
    ['飛び先', '行番号(式でも可)', '行番号', '行番号(付けたときだけ)', 'ラベル <code>@LOOP</code>'],
    ['サブルーチン', '<code>GOSUB / RETURN</code>', '<code>GOSUB / RETURN</code>', '<code>GOSUB</code> と <code>SUB</code> <code>FUNCTION</code>', '<code>GOSUB</code> と <code>DEF</code>'],
    ['関数の定義', 'n:なし', '<code>DEF FNA(X)=式</code>(1行)', '<code>FUNCTION</code>・<code>DEF f(x)=式</code>', '<code>DEF 名前(引数) … END</code>'],
    ['変数の有効範囲', '全部グローバル', '全部グローバル', 'SUB/FUNCTION の中は独立(参照渡しあり)', 'DEF の中はローカル(外の変数は読める)'],
    ['エラー処理', 'n:なし', 'y:<code>ON ERROR GOTO / RESUME</code>', 'n:なし', 'n:なし'],
  ]],
  ['関数', [
    ['乱数', '<code>RND(n)</code> → 1〜n の整数', '<code>RND(1)</code> → 0以上1未満', '<code>RND</code> → 0以上1未満', '<code>RND(n)</code> → 0〜n-1 の整数、<code>RNDF()</code> → 実数'],
    ['数学関数', 'p:<code>ABS</code> だけ', '<code>SIN COS TAN ATN SQR EXP LOG INT FIX SGN ABS</code>', '多数(<code>IP FP MAX MIN MOD ROUND LOG10 …</code>)', '多数(<code>FLOOR CEIL ROUND POW CLAMP …</code>)'],
    ['文字列関数', 'n:なし', '<code>LEFT$ RIGHT$ MID$ LEN INSTR STR$ VAL CHR$ ASC …</code>', '<code>LEFT$ RIGHT$ MID$ LEN POS UCASE$ …</code>', '<code>LEFT$ RIGHT$ MID$ LEN INSTR SUBST$ FORMAT$ …</code>'],
    ['<code>MID$</code> の位置', '-', '<b>1</b> から数える', '<b>1</b> から数える', '<b>0</b> から数える'],
    ['<code>INSTR</code> の結果', '-', '1から。見つからなければ 0', '(<code>POS</code>)1から。なければ 0', '0から。見つからなければ <b>-1</b>'],
  ]],
  ['グラフィックなど', [
    ['グラフィック画面', 'p:拡張命令のみ(640×400)', 'y:640×400・8色', 'y:正方形 400×400', 'y:400×240・RGB色'],
    ['座標系', '左上原点・ドット', '左上原点・ドット', '<b>好きな座標系</b>(<code>SET WINDOW</code>)・上が +y', '左上原点・ドット'],
    ['点', '<code>PLOT x,y</code>', '<code>PSET (x,y),色</code>', '<code>PLOT POINTS: x,y</code>', '<code>GPSET x,y,色</code>'],
    ['線', '<code>LINE x1,y1,x2,y2</code>', '<code>LINE (x1,y1)-(x2,y2),色</code>', '<code>PLOT LINES: x1,y1; x2,y2</code>', '<code>GLINE x1,y1,x2,y2,色</code>'],
    ['四角形', 'n:なし', '<code>LINE …,B</code> / <code>BF</code>', '<code>BOX LINES / AREA</code>', '<code>GBOX</code> / <code>GFILL</code>'],
    ['円', '<code>CIRCLE x,y,r</code>', '<code>CIRCLE (x,y),r,色</code>', '<code>BOX CIRCLE</code>(外接する四角形で指定)', '<code>GCIRCLE x,y,r,色</code>'],
    ['塗りつぶし', 'n:なし', '<code>PAINT</code>', '<code>PLOT AREA</code>(多角形)・<code>BOX AREA</code>', '<code>GPAINT</code>・<code>GFILL</code>'],
    ['色の指定', '0〜7', '0〜7(黒 青 赤 紫 緑 水 黄 白)', '0〜7・色名 <code>"RED"</code>・<code>MIX(r,g,b)</code>', '<code>RGB(r,g,b)</code>・<code>#RED</code> など'],
    ['時間待ち', '<code>WAIT</code>(拡張)', 'n:なし(ループで待つ)', '<code>WAIT DELAY 秒</code>', '<code>VSYNC</code>・<code>WAIT</code>(1/60秒単位)'],
    ['音', 'n:なし', 'y:<code>BEEP SOUND PLAY</code>', 'n:なし', 'p:<code>BEEP</code> だけ'],
    ['スプライト・BG', 'n:なし', 'n:なし', 'n:なし', 'y:<code>SPSET SPOFS SPANIM BGPUT BGOFS …</code>'],
    ['ファイルの保存', 'n:なし', 'n:なし', 'n:なし', 'y:<code>SAVE LOAD FILES</code>(ブラウザに保存)'],
  ]],
];

const SAME = [
  ['1 から 10 の合計', {
    tiny: `10 LET S=0
20 LET I=1
30 LET S=S+I
40 LET I=I+1
50 IF I<=10 THEN GOTO 30
60 PRINT S
70 END`,
    n88: `10 S=0
20 FOR I=1 TO 10
30   S=S+I
40 NEXT I
50 PRINT S`,
    full: `LET s = 0
FOR i = 1 TO 10
   LET s = s + i
NEXT i
PRINT s
END`,
    smile: `S=0
FOR I=1 TO 10
  S=S+I
NEXT
PRINT S`,
  }],
  ['偶数か奇数か', {
    tiny: `10 LET N=7
20 IF N-N/2*2=0 THEN PRINT "偶数"
30 IF N-N/2*2<>0 THEN PRINT "奇数"
40 END`,
    n88: `10 N=7
20 IF N MOD 2=0 THEN PRINT "偶数" ELSE PRINT "奇数"`,
    full: `LET n = 7
IF MOD(n, 2) = 0 THEN
   PRINT "偶数"
ELSE
   PRINT "奇数"
END IF
END`,
    smile: `N=7
IF N MOD 2==0 THEN
  PRINT "偶数"
ELSE
  PRINT "奇数"
ENDIF`,
  }],
  ['九九の表(3の段まで)', {
    tiny: `10 LET A=1
20 LET B=1
30 PRINT A*B;" ";
40 LET B=B+1
50 IF B<=9 THEN GOTO 30
60 PRINT
70 LET A=A+1
80 IF A<=3 THEN GOTO 20
90 END`,
    n88: `10 FOR A=1 TO 3
20   FOR B=1 TO 9
30     PRINT USING "###";A*B;
40   NEXT B
50   PRINT
60 NEXT A`,
    full: `FOR a = 1 TO 3
   FOR b = 1 TO 9
      PRINT USING "###": a * b;
   NEXT b
   PRINT
NEXT a
END`,
    smile: `FOR A=1 TO 3
  FOR B=1 TO 9
    PRINT FORMAT$("%3d",A*B);
  NEXT
  PRINT
NEXT`,
  }],
  ['2乗する(サブルーチン/関数)', {
    tiny: `10 LET N=5
20 GOSUB 100
30 PRINT R
40 END
100 LET R=N*N
110 RETURN`,
    n88: `10 DEF FNSQ(X)=X*X
20 PRINT FNSQ(5)`,
    full: `FUNCTION sq(x)
   LET sq = x * x
END FUNCTION
PRINT sq(5)
END`,
    smile: `DEF SQ(X)
  RETURN X*X
END
PRINT SQ(5)`,
  }],
  ['配列の合計', {
    tiny: `10 LET @(0)=3
20 LET @(1)=5
30 LET @(2)=7
40 LET S=0
50 LET I=0
60 LET S=S+@(I)
70 LET I=I+1
80 IF I<3 THEN GOTO 60
90 PRINT S
100 END`,
    n88: `10 DIM A(2)
20 A(0)=3: A(1)=5: A(2)=7
30 FOR I=0 TO 2: S=S+A(I): NEXT
40 PRINT S`,
    full: `DIM a(2)
LET a(0) = 3
LET a(1) = 5
LET a(2) = 7
FOR i = 0 TO 2
   LET s = s + a(i)
NEXT i
PRINT s
END`,
    smile: `DIM A[3]
A[0]=3:A[1]=5:A[2]=7
FOR I=0 TO 2:S=S+A[I]:NEXT
PRINT S`,
  }],
  ['円をかく', {
    tiny: `10 CLS
20 COLOR 6
30 CIRCLE 320,200,100
40 END`,
    n88: `10 CLS
20 CIRCLE (320,200),100,6`,
    full: `SET WINDOW -1, 1, -1, 1
SET COLOR "YELLOW"
BOX CIRCLE -0.8, 0.8, -0.8, 0.8
END`,
    smile: `GCLS
GCIRCLE 200,120,100,#YELLOW`,
  }],
];

const TIPS = [
  ['行番号 ⇔ ラベル', 'N88-BASIC の <code>GOTO 100</code> は、smile BASIC では <code>GOTO @LABEL</code>(<code>@LABEL</code> を飛び先の行に書く)にします。Full BASIC は行番号を省略して構造化(<code>DO</code> / <code>IF</code> ブロック)で書き換えるのがおすすめです。'],
  ['真偽の値', 'N88-BASIC の「真」は <b>-1</b>、他は <b>1</b>。<code>IF A THEN</code> のように 0 かどうかだけを見る使い方は共通ですが、<code>X = (A>B)</code> のように値を取り出すと結果が変わります。'],
  ['乱数', 'N88-BASIC の <code>INT(RND(1)*6)+1</code> は、smile BASIC では <code>RND(6)+1</code>、Tiny BASIC では <code>RND(6)</code> です。'],
  ['文字の位置', '<code>MID$</code> の位置は N88-BASIC / Full BASIC が <b>1</b> から、smile BASIC が <b>0</b> から。<code>INSTR</code> が「見つからない」ときは N88 が 0、smile が -1 です。'],
  ['配列の大きさ', '<code>DIM A(10)</code> は N88-BASIC / Full BASIC で <b>11 個</b>(0〜10)、<code>DIM A[10]</code> は smile BASIC で <b>10 個</b>(0〜9)。'],
  ['数の表示', 'N88-BASIC と Full BASIC の <code>PRINT</code> は数の前後に空白を入れます(<code>PRINT 5</code> は <code> 5 </code>)。見た目をそろえたいときは <code>STR$</code> と <code>MID$</code> を使うか、<code>PRINT USING</code> を使いましょう。'],
  ['グラフィックの座標', 'Full BASIC だけは「好きな座標系」(数学と同じで上が +y)で描きます。ほかは左上が (0,0) のドット座標です。'],
  ['色', 'Tiny / N88 / Full は 0〜7 の色番号(Full は色名も)、smile BASIC は <code>RGB(r,g,b)</code> か <code>#RED</code> などの定数です。'],
];

function cell(c) {
  const m = /^([ypn]):/.exec(c);
  if (m) return [{ y: 'yes', p: 'part', n: 'no' }[m[1]], c.slice(2)];
  return ['', c];
}

exports.page = (hh, esc, LABEL) => {
  const D = ['tiny', 'n88', 'full', 'smile'];
  const head = `<tr><th>項目</th>${D.map((d) => `<th class="d-${d}">${LABEL[d]}</th>`).join('')}</tr>`;
  const tables = ROWS.map(([cat, rows]) => `
<h3>${cat}</h3>
<table class="doc cmp"><thead>${head}</thead><tbody>
${rows.map((r) => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((c) => { const [cls, t] = cell(c); return `<td class="${cls}">${t}</td>`; }).join('')}</tr>`).join('\n')}
</tbody></table>`).join('\n');

  const same = SAME.map(([title, progs]) => `
<h3>${title}</h3>
<div class="side-by-side">
${D.map((d) => `<div class="col d-${d}"><h4>${LABEL[d]}</h4>${hh(d).ex(progs[d], title)}</div>`).join('\n')}
</div>`).join('\n');

  const tips = hh('n88').table(['ポイント', '内容'], TIPS.map(([a, b]) => [`<b>${a}</b>`, b]));

  return `
<h1>方言の比較</h1>
<p class="lead">Tiny BASIC・N88-BASIC・Full BASIC・smile BASIC の違いを、一覧表と「同じプログラムを4つの方言で書いた例」で比べます。</p>
<div class="cards">
  <a class="card d-tiny" href="manual-tiny.html"><h3>Tiny BASIC</h3><p>最小のBASIC。行番号・整数・IF/GOTO/GOSUB。「プログラムとは何か」を学ぶ入口。</p></a>
  <a class="card d-n88" href="manual-n88.html"><h3>N88-BASIC</h3><p>行番号つきの定番BASIC。色・図形・音・文字列がそろったレトロPCの味。</p></a>
  <a class="card d-full" href="manual-full.html"><h3>Full BASIC</h3><p>規格化された構造化BASIC。行番号なし、SUB/FUNCTION、数学向きの図形。</p></a>
  <a class="card d-smile" href="manual-smile.html"><h3>smile BASIC</h3><p>ゲーム向けの現代的BASIC。ラベル・DEF・配列・VSYNC・RGB。</p></a>
</div>
<div class="note">表の印: <b>●</b> 使える　<b>△</b> 一部だけ(拡張や制限つき)　<b>×</b> 使えない。印のない欄は書き方の違いです。このシミュレータが再現している範囲での比較です。</div>
<h2>1. 一覧表</h2>
${tables}
<h2>2. 同じことを4つの方言で書く</h2>
<p>それぞれの「シミュレータで試す」を押すと、その方言のシミュレータにプログラムが入った状態で開きます。</p>
${same}
<h2>3. 方言をまたいで書き換えるときのポイント</h2>
${tips}
<h2>4. どれを選ぶ?</h2>
<ul>
<li><b>プログラムの動く仕組みを最小の道具で学びたい</b> → Tiny BASIC</li>
<li><b>昔のパソコンの雰囲気で、色や図形や音を楽しみたい</b> → N88-BASIC</li>
<li><b>きれいな構造のプログラムや、数学・理科のグラフを描きたい</b> → Full BASIC</li>
<li><b>ゲームやアニメーションを作りたい</b> → smile BASIC</li>
</ul>`;
};
