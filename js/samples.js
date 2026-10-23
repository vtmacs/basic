/* サンプルプログラム(テストでも全件実行して確認しています) */
(function (root) {
  'use strict';
  const NS = (root.MacsBasic = root.MacsBasic || {});
  const S = {};

  S.tiny = [
    { title: 'Hello, World', code: `10 REM はじめてのTiny BASIC
20 PRINT "Hello, World!"
30 PRINT "こんにちは Tiny BASIC"
40 END
` },
    { title: '1から10までの合計', code: `10 REM 1+2+...+10
20 LET S=0
30 LET I=1
40 LET S=S+I
50 LET I=I+1
60 IF I<=10 THEN GOTO 40
70 PRINT "合計=";S
80 END
` },
    { title: '九九の表', code: `10 REM 九九の表(FORがないのでIFとGOTOでくり返す)
20 LET A=1
30 LET B=1
40 PRINT A*B;
50 PRINT " ";
60 LET B=B+1
70 IF B<=9 THEN GOTO 40
80 PRINT
90 LET A=A+1
100 IF A<=9 THEN GOTO 30
110 END
` },
    { title: '素数をさがす', code: `10 REM 2から60までの素数
20 LET N=2
30 LET D=2
40 IF D*D>N THEN GOTO 90
50 IF N-(N/D)*D=0 THEN GOTO 110
60 LET D=D+1
70 GOTO 40
90 PRINT N;" ";
110 LET N=N+1
120 IF N<=60 THEN GOTO 30
130 PRINT
140 END
` },
    { title: '数当てゲーム', code: `10 REM 数当てゲーム
20 LET N=RND(100)
30 PRINT "1から100の数を当ててください"
40 INPUT G
50 IF G=N THEN GOTO 100
60 IF G<N THEN PRINT "もっと大きい"
70 IF G>N THEN PRINT "もっと小さい"
80 GOTO 40
100 PRINT "正解です!"
110 END
` },
    { title: '階乗(サブルーチン)', code: `10 REM GOSUB と RETURN
20 LET N=1
30 GOSUB 100
40 LET N=N+1
50 IF N<=7 THEN GOTO 30
60 END
100 LET F=1
110 LET K=1
120 LET F=F*K
130 LET K=K+1
140 IF K<=N THEN GOTO 120
150 PRINT N;"! = ";F
160 RETURN
` },
    { title: '拡張グラフィック', code: `10 REM 本シミュレータの拡張命令 PLOT / LINE / CIRCLE / COLOR
20 CLS
30 LET I=0
40 COLOR 6
50 LINE 0,I,I,399
60 LET I=I+20
70 IF I<=400 THEN GOTO 50
80 COLOR 2
90 CIRCLE 320,200,120
100 COLOR 5
110 CIRCLE 320,200,60
120 COLOR 7
130 PLOT 320,200
140 END
` },
  ];

  S.n88 = [
    { title: 'Hello, World', code: `10 ' はじめてのN88互換BASIC
20 CLS
30 PRINT "Hello, World!"
40 PRINT "こんにちは N88互換BASIC"
50 END
` },
    { title: '九九の表', code: `10 CLS
20 FOR I=1 TO 9
30   FOR J=1 TO 9
40     PRINT USING "###";I*J;
50   NEXT J
60   PRINT
70 NEXT I
80 END
` },
    { title: '配列とバブルソート', code: `10 DEFINT A-Z
20 DIM A(9)
30 RANDOMIZE 1
40 FOR I=0 TO 9: A(I)=INT(RND(1)*100): NEXT I
50 PRINT "ソート前:";: FOR I=0 TO 9: PRINT A(I);: NEXT I: PRINT
60 FOR I=0 TO 8
70   FOR J=0 TO 8-I
80     IF A(J)>A(J+1) THEN SWAP A(J),A(J+1)
90   NEXT J
100 NEXT I
110 PRINT "ソート後:";: FOR I=0 TO 9: PRINT A(I);: NEXT I: PRINT
120 END
` },
    { title: '文字列関数', code: `10 A$="MY-BASIC"
20 PRINT "長さ=";LEN(A$)
30 PRINT "左3文字=";LEFT$(A$,3)
40 PRINT "右5文字=";RIGHT$(A$,5)
50 PRINT "3文字目から3文字=";MID$(A$,3,3)
60 PRINT "CHR$(65)=";CHR$(65);" ASC(""A"")=";ASC("A")
70 PRINT "INSTR=";INSTR(A$,"-")
80 FOR I=LEN(A$) TO 1 STEP -1: PRINT MID$(A$,I,1);: NEXT I: PRINT
90 END
` },
    { title: '数当てゲーム', code: `10 RANDOMIZE
20 N=INT(RND(1)*100)+1
30 C=0
40 INPUT "1〜100の数は";G
50 C=C+1
60 IF G=N THEN 100
70 IF G<N THEN PRINT "もっと大きい" ELSE PRINT "もっと小さい"
80 GOTO 40
100 PRINT C;"回で当たりました!"
110 END
` },
    { title: '図形(円・線・塗りつぶし)', code: `10 SCREEN 3: CLS
20 FOR I=0 TO 7
30   LINE (I*80,0)-(I*80+79,60),I,BF
40 NEXT I
50 CIRCLE (320,230),120,6
60 PAINT (320,230),2,6
70 CIRCLE (320,230),60,5
80 LINE (100,150)-(540,390),7,B
90 LOCATE 30,12: COLOR 7: PRINT "N88互換BASIC GRAPHICS"
100 END
` },
    { title: 'サインカーブ', code: `10 SCREEN 3: CLS
20 LINE (0,200)-(639,200),7
30 FOR X=0 TO 639
40   Y=200-SIN(X/639*4*3.14159)*150
50   PSET (X,Y),6
60 NEXT X
70 LOCATE 0,0: PRINT "Y=SIN(X)"
80 END
` },
    { title: 'ON GOTO と DATA', code: `10 DATA 月,火,水,木,金,土,日
20 FOR I=1 TO 7
30   READ D$
40   ON I GOTO 100,100,100,100,100,200,200
100   PRINT D$;"曜日は平日": GOTO 300
200   PRINT D$;"曜日は休み"
300 NEXT I
310 END
` },
    { title: '音(PLAY)', code: `10 PRINT "ドレミを演奏します"
20 PLAY "T120 O4 L4 C D E F G A B >C"
30 END
` },
    { title: 'ファイルに書いて読む(OPEN・WRITE#・INPUT#)', code: `10 ' 点数をファイルに保存して、読み出して平均を出す
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
160 END
` },
    { title: '住所録(ランダムファイル FIELD・GET・PUT)', code: `10 ' 1件24文字のレコードで保存する
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
170 END
` },
  ];

  S.full = [
    { title: 'Hello, World', code: `! はじめての Full BASIC
PRINT "Hello, World!"
PRINT "こんにちは Full BASIC"
END
` },
    { title: '構造化: FOR / IF / DO', code: `FOR i = 1 TO 15
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
LET n = 10
DO WHILE n > 0
   LET n = n - 4
LOOP
PRINT "n ="; n
END
` },
    { title: '平均を求める(INPUT)', code: `INPUT PROMPT "人数は? ": n
LET total = 0
FOR i = 1 TO n
   INPUT PROMPT "点数? ": x
   LET total = total + x
NEXT i
IF n > 0 THEN PRINT "平均点 ="; total / n
END
` },
    { title: 'FUNCTION と SUB', code: `DECLARE FUNCTION area
LET r = 3
PRINT "半径"; r; "の円の面積 ="; area(r)
CALL greet("Full BASIC")
CALL swap2(a, b)
PRINT "a ="; a; " b ="; b
END

FUNCTION area(r)
   LET area = PI * r ^ 2
END FUNCTION

SUB greet(name$)
   PRINT "こんにちは, "; name$; "!"
END SUB

SUB swap2(x, y)
   LET x = 1
   LET y = 2
END SUB
` },
    { title: 'SELECT CASE', code: `FOR score = 40 TO 100 STEP 15
   SELECT CASE score
   CASE IS >= 90
      LET g$ = "A"
   CASE 70 TO 89
      LET g$ = "B"
   CASE 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69
      LET g$ = "C"
   CASE ELSE
      LET g$ = "D"
   END SELECT
   PRINT score; " -> "; g$
NEXT score
END
` },
    { title: '数列の和(Σ)', code: `! 初項 a、公差 d の等差数列の、第 n 項までの和
INPUT PROMPT "初項 a = ": a
INPUT PROMPT "公差 d = ": d
INPUT PROMPT "項数 n = ": n
LET s = 0
FOR k = 1 TO n
   LET s = s + (a + (k - 1) * d)
NEXT k
PRINT "和 ="; s
PRINT "公式 n(2a+(n-1)d)/2 ="; n * (2 * a + (n - 1) * d) / 2
END
` },
    { title: '漸化式とGOTO(自動の行番号)', code: `! 行番号を書かなくても、上から数えた番号(空行を除く)が付く
! a(n+1) = 2a(n) + 1, a(1) = 1
LET a = 1
LET n = 1
PRINT "a("; n; ") ="; a
LET a = 2 * a + 1
LET n = n + 1
IF n <= 8 THEN GOTO 5
END
` },
    { title: '区分求積法(x^2 の積分)', code: `! 0 から 1 まで x^2 を積分する(正解は 1/3)
LET n = 1000
LET s = 0
FOR i = 0 TO n - 1
   LET x = i / n
   LET s = s + x ^ 2 / n
NEXT i
PRINT "n ="; n; " のとき"; s
PRINT "1/3 ="; 1 / 3
END
` },
    { title: '乱数で円周率(モンテカルロ法)', code: `RANDOMIZE
LET n = 3000
LET c = 0
SET WINDOW 0, 1, 0, 1
FOR i = 1 TO n
   LET x = RND
   LET y = RND
   IF x ^ 2 + y ^ 2 <= 1 THEN
      LET c = c + 1
      SET COLOR "RED"
   ELSE
      SET COLOR "BLUE"
   END IF
   PLOT POINTS: x, y
NEXT i
PRINT "円周率の近似値 ="; 4 * c / n
END
` },
    { title: 'グラフ(SIN と COS)', code: `SET WINDOW -7, 7, -1.5, 1.5
SET COLOR "BLUE"
PLOT LINES: -7, 0; 7, 0
PLOT LINES: 0, -1.5; 0, 1.5
SET COLOR "RED"
FOR x = -6.5 TO 6.5 STEP 0.05
   PLOT LINES: x, SIN(x); x + 0.05, SIN(x + 0.05)
NEXT x
SET COLOR "GREEN"
FOR x = -6.5 TO 6.5 STEP 0.05
   PLOT LINES: x, COS(x); x + 0.05, COS(x + 0.05)
NEXT x
END
` },
    { title: '図形(BOX / PLOT AREA)', code: `SET WINDOW 0, 10, 0, 10
SET COLOR "YELLOW"
BOX AREA 1, 4, 1, 4
SET COLOR "RED"
BOX LINES 1, 4, 1, 4
SET COLOR "BLUE"
BOX CIRCLE 5, 9, 1, 5
SET COLOR "GREEN"
PLOT AREA: 2, 6; 5, 9; 8, 6
SET COLOR "BLACK"
PLOT POINTS: 5, 5
END
` },
  ];

  S.smile = [
    { title: 'Hello, World', code: `' はじめての SmileBASIC互換
PRINT "Hello, World!"
PRINT "こんにちは SmileBASIC互換"
COLOR 6
PRINT "COLOR で文字の色を変えます"
COLOR 15
` },
    { title: 'FizzBuzz', code: `FOR I=1 TO 20
  IF I MOD 15==0 THEN
    PRINT "FizzBuzz"
  ELSEIF I MOD 3==0 THEN
    PRINT "Fizz"
  ELSEIF I MOD 5==0 THEN
    PRINT "Buzz"
  ELSE
    PRINT I
  ENDIF
NEXT
` },
    { title: 'DEF(関数)と配列', code: `DEF FACT(N)
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
SORT A
SHOW A
` },
    { title: 'ラベルとGOTO・READ/DATA', code: `@LOOP
READ N$,P
IF N$=="END" THEN GOTO @OWARI
PRINT N$;"は";P;"円"
GOTO @LOOP
@OWARI
PRINT "おしまい"
DATA "りんご",120,"みかん",80,"ぶどう",450,"END",0
` },
    { title: '図形をかく', code: `GCLS RGB(0,0,64)
FOR I=0 TO 11
  GCIRCLE 200,120,10+I*9,RGB(255-I*20,128+I*10,I*20)
NEXT
GFILL 10,10,60,40,#RED
GBOX 10,10,60,40,#WHITE
GLINE 0,0,399,239,#YELLOW
GLINE 0,239,399,0,#YELLOW
LOCATE 2,28
PRINT "GRAPHICS"
` },
    { title: '星空(乱数)', code: `GCLS RGB(0,0,30)
VAR I,X,Y,C
FOR I=0 TO 300
  X=RND(400):Y=RND(240):C=RND(200)+55
  GPSET X,Y,RGB(C,C,C)
NEXT
GCIRCLE 320,60,25,#YELLOW
GPAINT 320,60,#YELLOW
LOCATE 1,1:PRINT "STARS"
` },
    { title: 'ボールの動き(VSYNC・←→で操作)', code: `' 実行すると跳ね続けます。停止ボタンで終了
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
WEND
` },
    { title: 'スプライトで星あつめ(SPSET・SPHITSP)', code: `' ←→↑↓キーで顔を動かして、星を集めよう
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
WEND
` },
    { title: 'スプライトの自動アニメーション(SPANIM)', code: `' 動き・回転・絵の切りかえ・色の変化を SPANIM にまかせる
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
WEND
` },
    { title: 'BGのスクロール(BGSCREEN・BGOFS)', code: `' BG(背景のタイル)を3層に重ねてスクロールする(番号の小さい層が手前)
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
WEND
` },
    { title: '自分で絵をかいてスプライトに(GPAGE・SPDEF)', code: `' グラフィックページ4に絵をかき、SPDEF でスプライトにする
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
WEND
` },
    { title: 'ハイスコアをファイルに保存(SAVE・LOAD)', code: `' ブラウザに保存されるので、もう一度実行しても記録が残ります
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
ENDIF
` },
  ];

  NS.SAMPLES = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
