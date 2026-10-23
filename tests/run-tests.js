// node tests/run-tests.js  — 言語仕様の回帰テスト
const { exec, NS } = require('./harness');
let pass = 0, fail = 0;
async function T(name, dialect, src, expect, opt) {
  const r = await exec(dialect, src, opt);
  let ok, got;
  if (expect instanceof RegExp) { got = r.err ? 'ERR ' + r.err.msg : r.text; ok = expect.test(got); }
  else if (typeof expect === 'function') { got = r; ok = expect(r); }
  else { got = r.err ? 'ERR ' + r.err.msg : r.text; ok = got === expect; }
  if (ok) pass++; else { fail++; console.log('FAIL', name, '\n  got:', typeof got === 'string' ? JSON.stringify(got) : (r.err && r.err.msg) || '(fn)', '\n  exp:', String(expect).slice(0, 120)); }
}
const px = (r, x, y) => r.screen.point(x, y);

(async () => {
  // ---------------- Tiny BASIC
  await T('tiny arith', 'tiny', '10 PRINT 7/2;" ";-7/2;" ";2+3*4;" ";(2+3)*4', '3 -3 14 20');
  await T('tiny overflow', 'tiny', '10 A=30000\n20 B=A+A\n30 PRINT B', /ERR .*オーバーフロー/);
  await T('tiny no for', 'tiny', '10 FOR I=1 TO 3', /ERR .*コマンド/);
  await T('tiny var name', 'tiny', '10 AB=1', /ERR .*A〜Z/);
  await T('tiny need lineno', 'tiny', 'PRINT 1', /ERR .*行番号/);
  await T('tiny sort order', 'tiny', '20 PRINT "B"\n10 PRINT "A"', 'A\nB');
  await T('tiny @array', 'tiny', '10 @(1)=5\n20 @(2)=@(1)*2\n30 PRINT @(2)', '10');
  await T('tiny gosub', 'tiny', '10 GOSUB 100\n20 PRINT "B"\n30 END\n100 PRINT "A"\n110 RETURN', 'A\nB');
  await T('tiny computed goto', 'tiny', '10 A=2\n20 GOTO A*100\n100 PRINT "X"\n110 END\n200 PRINT "Y"', 'Y');
  await T('tiny input', 'tiny', '10 INPUT A,B\n20 PRINT A+B', '? 3,4\n7', { inputs: ['3,4'] });
  await T('tiny input redo', 'tiny', '10 INPUT A\n20 PRINT A', /Redo[\s\S]*\n9$/, { inputs: ['x', '9'] });
  await T('tiny rnd', 'tiny', '10 A=RND(6)\n20 IF A<1 THEN PRINT "BAD"\n30 IF A>6 THEN PRINT "BAD"\n40 PRINT "OK"', 'OK');
  await T('tiny no SQR', 'tiny', '10 PRINT SQR(4)', /ERR/);
  await T('tiny comma', 'tiny', '10 PRINT 1,2', /^1\s+2$/);
  await T('tiny trailing semicolon', 'tiny', '10 PRINT "A";\n20 PRINT "B"', 'AB');
  await T('tiny graphics', 'tiny', '10 COLOR 2\n20 PLOT 10,10\n30 LINE 0,0,5,0', (r) => px(r, 10, 10) === 0xff0000 && px(r, 3, 0) === 0xff0000);

  // ---------------- N88-BASIC
  await T('n88 print num', 'n88', '10 PRINT 5;-5;1.5;0.25', ' 5 -5  1.5  .25');
  await T('n88 float', 'n88', '10 PRINT 1/3', ' .3333333');
  await T('n88 string fn', 'n88', '10 A$="ABCDEF"\n20 PRINT LEFT$(A$,2);RIGHT$(A$,2);MID$(A$,3,2);LEN(A$)', 'ABEFCD 6 '.trim());
  await T('n88 mid2', 'n88', '10 PRINT MID$("HELLO",2)', 'ELLO');
  await T('n88 for step', 'n88', '10 FOR I=10 TO 1 STEP -3: PRINT I;: NEXT', ' 10  7  4  1');
  await T('n88 for skip', 'n88', '10 FOR I=5 TO 1\n20 PRINT "X"\n30 NEXT\n40 PRINT "OK"', 'OK');
  await T('n88 nested for', 'n88', '10 FOR I=1 TO 2: FOR J=1 TO 2: PRINT I*10+J;: NEXT J, I', ' 11  12  21  22');
  await T('n88 while', 'n88', '10 I=0\n20 WHILE I<3\n30 I=I+1\n40 WEND\n50 PRINT I', ' 3');
  await T('n88 if else', 'n88', '10 A=5\n20 IF A>3 THEN PRINT "Y" ELSE PRINT "N"\n30 IF A>9 THEN PRINT "Y" ELSE PRINT "N"', 'Y\nN');
  await T('n88 if then lineno', 'n88', '10 IF 1 THEN 100\n20 PRINT "NO"\n100 PRINT "YES"', 'YES');
  await T('n88 on goto', 'n88', '10 A=2\n20 ON A GOTO 100,200\n30 END\n100 PRINT "1":END\n200 PRINT "2"', '2');
  await T('n88 on gosub', 'n88', '10 ON 1 GOSUB 100\n20 PRINT "B":END\n100 PRINT "A":RETURN', 'A\nB');
  await T('n88 data', 'n88', '10 DATA 1,2,3,"a,b"\n20 FOR I=1 TO 3: READ X: S=S+X: NEXT\n30 READ A$\n40 PRINT S;A$\n50 RESTORE\n60 READ Y: PRINT Y', ' 6 a,b\n 1');
  await T('n88 out of data', 'n88', '10 READ A', /ERR .*DATA/);
  await T('n88 dim', 'n88', '10 DIM A(3,3)\n20 A(2,3)=7\n30 PRINT A(2,3);A(1,1)\n40 A(4,0)=1', /ERR .*範囲外/);
  await T('n88 autodim', 'n88', '10 A(10)=3\n20 PRINT A(10)', ' 3');
  await T('n88 int type', 'n88', '10 A%=3.7\n20 PRINT A%', ' 4');
  await T('n88 defint', 'n88', '10 DEFINT A-C\n20 A=2.6\n30 PRINT A', ' 3');
  await T('n88 type mismatch', 'n88', '10 A$=5', /ERR .*型/);
  await T('n88 div0', 'n88', '10 PRINT 1/0', /ERR .*0で割/);
  await T('n88 mod int div', 'n88', '10 PRINT 7 MOD 3;7\\2;2^10', ' 1  3  1024');
  await T('n88 logic', 'n88', '10 PRINT (3>2);(2>3);(1 AND 3);(1 OR 2);NOT 0', '-1  0  1  3 -1');
  await T('n88 hex', 'n88', '10 PRINT &HFF;&B101', ' 255  5');
  await T('n88 def fn', 'n88', '10 DEF FNA(X)=X*X+1\n20 PRINT FNA(3)+FNA(2)', ' 15');
  await T('n88 gosub nested', 'n88', '10 GOSUB 100:PRINT "Z":END\n100 PRINT "A":GOSUB 200:RETURN\n200 PRINT "B":RETURN', 'A\nB\nZ');
  await T('n88 swap', 'n88', '10 A=1:B=2:SWAP A,B:PRINT A;B', ' 2  1');
  await T('n88 using', 'n88', '10 PRINT USING "##.##";3.14159;22.5\n20 PRINT USING "\\  \\!";"ABCDE";"xyz"', ' 3.1422.50\nABCDx');
  await T('n88 tab', 'n88', '10 PRINT "A";TAB(5);"B"', 'A   B');
  await T('n88 comma zone', 'n88', '10 PRINT "A","B"', /^A {13}B$/);
  await T('n88 str$ val', 'n88', '10 PRINT STR$(5);VAL("12abc");VAL("x")', ' 5 12  0');
  await T('n88 instr', 'n88', '10 PRINT INSTR("HELLO","LL");INSTR("HELLO","Z")', ' 3  0');
  await T('n88 string compare', 'n88', '10 IF "ABC"<"ABD" THEN PRINT "LT"', 'LT');
  await T('n88 on error', 'n88', '10 ON ERROR GOTO 100\n20 A=1/0\n30 PRINT "after"\n40 END\n100 PRINT "err";ERR:RESUME NEXT', /^err 11\nafter$/);
  await T('n88 line input', 'n88', '10 LINE INPUT "名前: ";A$\n20 PRINT "[";A$;"]"', '名前: a, b\n[a, b]', { inputs: ['a, b'] });
  await T('n88 input prompt', 'n88', '10 INPUT "X";A\n20 PRINT A*2', 'X? 4\n 8', { inputs: ['4'] });
  await T('n88 input comma', 'n88', '10 INPUT "X",A\n20 PRINT A*2', 'X4\n 8', { inputs: ['4'] });
  await T('n88 inkey', 'n88', '10 K$=INKEY$\n20 IF K$="" THEN PRINT "none":END\n30 PRINT K$', 'q', { keys: ['q'] });
  await T('n88 rnd seed', 'n88', '10 RANDOMIZE 5\n20 A=RND(1):RANDOMIZE 5:B=RND(1):IF A=B THEN PRINT "SAME"', 'SAME');
  await T('n88 locate', 'n88', '10 LOCATE 3,2:PRINT "X"', (r) => r.lines[2] === '   X');
  await T('n88 cls', 'n88', '10 PRINT "A":CLS:PRINT "B"', 'B');
  await T('n88 gfx', 'n88', '10 PSET (5,5),2\n20 LINE (0,10)-(9,10),4\n30 LINE (20,20)-(30,30),6,BF\n40 CIRCLE (100,100),10,5', (r) =>
    px(r, 5, 5) === 0xff0000 && px(r, 4, 10) === 0x00ff00 && px(r, 25, 25) === 0xffff00 && px(r, 110, 100) === 0x00ffff);
  await T('n88 paint', 'n88', '10 LINE (10,10)-(50,50),7,B\n20 PAINT (30,30),2,7\n30 A=POINT(30,30):B=POINT(0,0):PRINT A;B', ' 2  0');
  await T('n88 error line', 'n88', '10 PRINT 1\n20 PRINT 1/0', (r) => r.err && r.err.line === 20);
  await T('n88 no line number', 'n88', 'PRINT 1', /ERR .*行番号/);
  await T('n88 undefined line', 'n88', '10 GOTO 999', /ERR .*未定義/);
  await T('n88 apos comment', 'n88', "10 PRINT 1 ' hello\n20 PRINT 2", ' 1 \n 2 '.replace(/ +$/gm, ''));
  await T('n88 rem colon', 'n88', '10 REM this: PRINT 1\n20 PRINT 2', ' 2');
  await T('n88 data after colon', 'n88', '10 READ A:PRINT A\n20 DATA 7', ' 7');
  await T('n88 sound/play ok', 'n88', '10 BEEP:SOUND 440,10:PLAY "CDE"\n20 PRINT "ok"', 'ok');
  await T('n88 mid assign missing', 'n88', '10 PRINT SGN(-3);ABS(-2);INT(-1.5);FIX(-1.5);SQR(16)', '-1  2 -2 -1  4');
  await T('n88 prec', 'n88', '10 PRINT -2^2;2^-1;1+2*3^2', '-4  .5  19');
  await T('n88 width', 'n88', '10 WIDTH 40,25:PRINT "X"', (r) => r.screen.cols === 40);
  await T('n88 color bg', 'n88', '10 COLOR 2:PRINT "R"', (r) => r.screen.fgc[0] === 0xff0000);
  await T('n88 wrap', 'n88', '10 PRINT STRING$(85,"A")', (r) => r.lines[0].length === 80 && r.lines[1].length === 5);
  await T('n88 scroll', 'n88', '10 FOR I=1 TO 30: PRINT I: NEXT', (r) => r.lines[23].trim() === '30' && r.lines[0].trim() === '7');

  // ---------------- Full BASIC
  await T('full if block', 'full', 'LET a = 5\nIF a > 3 THEN\n PRINT "big"\nELSE\n PRINT "small"\nEND IF', 'big');
  await T('full elseif', 'full', 'LET a = 2\nIF a = 1 THEN\n PRINT "1"\nELSEIF a = 2 THEN\n PRINT "2"\nELSE\n PRINT "3"\nEND IF', '2');
  await T('full select', 'full', 'FOR i=1 TO 4\nSELECT CASE i\nCASE 1\nPRINT "one";\nCASE 2,3\nPRINT "two-three";\nCASE ELSE\nPRINT "other";\nEND SELECT\nNEXT i', 'onetwo-threetwo-threeother');
  await T('full do loop', 'full', 'LET i = 0\nDO\n LET i = i + 1\nLOOP UNTIL i >= 3\nPRINT i', ' 3');
  await T('full do while exit', 'full', 'LET i = 0\nDO WHILE i < 10\n LET i = i + 1\n IF i = 4 THEN EXIT DO\nLOOP\nPRINT i', ' 4');
  await T('full exit for', 'full', 'FOR i = 1 TO 10\n IF i = 3 THEN EXIT FOR\nNEXT i\nPRINT i', ' 3');
  await T('full function', 'full', 'PRINT sq(4)\nFUNCTION sq(x)\n LET sq = x * x\nEND FUNCTION', ' 16');
  await T('full recursion', 'full', 'PRINT fact(5)\nEND\nFUNCTION fact(n)\n IF n <= 1 THEN\n LET fact = 1\n ELSE\n LET fact = n * fact(n - 1)\n END IF\nEND FUNCTION', ' 120');
  await T('full sub byref', 'full', 'LET a = 1\nCALL inc(a)\nCALL inc(a)\nPRINT a\nSUB inc(x)\n LET x = x + 1\nEND SUB', ' 3');
  await T('full sub isolation', 'full', 'LET a = 5\nCALL show\nSUB show\n PRINT a\nEND SUB', ' 0');
  await T('full string', 'full', 'LET a$ = "abc"\nPRINT UCASE$(a$); LEN(a$); a$ & "d"', 'ABC 3 abcd');
  await T('full def', 'full', 'DEF f(x) = x * 2 + 1\nPRINT f(3)', ' 7');
  await T('full numbers', 'full', 'PRINT 0.1 + 0.2; 1 / 3; 2 ^ 0.5', ' 0.3  0.333333333333333  1.4142135623731');
  await T('full mod fn', 'full', 'PRINT MOD(-7, 3); REMAINDER(-7, 3); IP(-2.5); INT(-2.5); ROUND(2.567, 2); MAX(1, 5, 3)', /^ 2 -1 -2 -3  2\.57  5\s*$/);
  await T('full option base', 'full', 'OPTION BASE 1\nDIM a(3)\nLET a(1) = 9\nPRINT a(1)\nPRINT a(0)', /ERR .*範囲外/);
  await T('full dim lo to hi', 'full', 'DIM a(-2 TO 2)\nLET a(-2) = 5\nPRINT a(-2)', ' 5');
  await T('full input prompt', 'full', 'INPUT PROMPT "n? ": n\nPRINT n * 2', 'n? 4\n 8', { inputs: ['4'] });
  await T('full line numbers ok', 'full', '10 PRINT "A"\n20 GOTO 40\n30 PRINT "B"\n40 PRINT "C"', 'A\nC');
  await T('full comment', 'full', '! comment\nPRINT 1 ! trailing', ' 1');
  await T('full data', 'full', 'DATA 1, 2, 3\nREAD a, b, c\nPRINT a + b + c', ' 6');
  await T('full window plot', 'full', 'SET WINDOW 0, 10, 0, 10\nSET COLOR "RED"\nPLOT POINTS: 5, 5', (r) => px(r, 200, 200) === 0xff0000 || px(r, 200, 199) === 0xff0000);
  await T('full box area', 'full', 'SET WINDOW 0, 10, 0, 10\nSET COLOR 2\nBOX AREA 0, 5, 0, 5', (r) => px(r, 10, 390) === 0xff0000 && px(r, 390, 10) === 0xffffff);
  await T('full area poly', 'full', 'SET WINDOW 0, 10, 0, 10\nSET COLOR 4\nPLOT AREA: 1, 1; 9, 1; 5, 9', (r) => px(r, 200, 300) === 0x00ff00);
  await T('full mix', 'full', 'SET WINDOW 0, 10, 0, 10\nSET COLOR MIX(1, 0, 0)\nPLOT POINTS: 5, 5', (r) => px(r, 200, 200) === 0xff0000 || px(r, 200, 199) === 0xff0000);
  await T('full no lineinput gfx', 'full', 'LINE (1,1)-(2,2)', /ERR/);
  await T('full unclosed if', 'full', 'IF 1 THEN\nPRINT 1', /ERR .*がありません/);
  await T('full print using', 'full', 'PRINT USING "###.#": 3.14159', /^ {0,2}3\.1$/);
  await T('full true value', 'full', 'PRINT (3 > 2); (2 > 3)', ' 1  0');
  await T('full wait delay', 'full', 'WAIT DELAY 1\nPRINT "ok"', 'ok');
  await T('full multi-statement colon', 'full', 'LET a = 1 : LET b = 2 : PRINT a + b', ' 3');
  await T('full cursor', 'full', 'SET CURSOR 2, 3\nPRINT "X"', (r) => r.lines[1] === '  X');

  // ---------------- smile BASIC
  await T('smile basic', 'smile', 'A=5\nPRINT A*2,A/2\n?"x";A', /^10\s+2\.5\nx5$/);
  await T('smile if', 'smile', 'A=5\nIF A==5 THEN PRINT "five" ELSE PRINT "no"\nIF A!=5 THEN PRINT "ne"', 'five');
  await T('smile if block', 'smile', 'A=2\nIF A==1 THEN\n PRINT 1\nELSEIF A==2 THEN\n PRINT 2\nELSE\n PRINT 3\nENDIF', '2');
  await T('smile for next', 'smile', 'FOR I=0 TO 2\nPRINT I;\nNEXT', '012');
  await T('smile for step break', 'smile', 'FOR I=10 TO 0 STEP -5\nPRINT I;\nIF I==5 THEN BREAK\nNEXT\nPRINT "e"', '105e');
  await T('smile continue', 'smile', 'FOR I=1 TO 5\nIF I MOD 2==0 THEN CONTINUE\nPRINT I;\nNEXT', '135');
  await T('smile repeat', 'smile', 'I=0\nREPEAT\nINC I\nUNTIL I>=3\nPRINT I', '3');
  await T('smile while', 'smile', 'I=0\nWHILE I<3\nINC I\nWEND\nPRINT I', '3');
  await T('smile label goto', 'smile', 'I=0\n@L\nINC I\nIF I<3 THEN GOTO @L\nPRINT I', '3');
  await T('smile gosub', 'smile', 'GOSUB @S\nPRINT "b"\nEND\n@S\nPRINT "a"\nRETURN', 'a\nb');
  await T('smile def', 'smile', 'DEF ADD(A,B)\nRETURN A+B\nEND\nPRINT ADD(2,3)', '5');
  await T('smile def statement', 'smile', 'DEF HELLO N$\nPRINT "hi ";N$\nEND\nHELLO "bob"', 'hi bob');
  await T('smile recursion', 'smile', 'DEF F(N)\nIF N<2 THEN RETURN 1\nRETURN N*F(N-1)\nEND\nPRINT F(6)', '720');
  await T('smile def local', 'smile', 'X=1\nDEF T\nX=99\nEND\nT\nPRINT X', '1');
  await T('smile array', 'smile', 'DIM A[3]\nA[0]=1:A[2]=5\nPRINT A[0]+A[2],LEN(A)\nA[3]=1', /ERR .*範囲外/);
  await T('smile array literal', 'smile', 'A=[3,1,2]\nSORT A\nPRINT A[0];A[1];A[2]\nPUSH A,9\nPRINT LEN(A),POP(A)', /^123\n4\s+9$/);
  await T('smile 2d array', 'smile', 'DIM A[2,3]\nA[1,2]=7\nPRINT A[1,2]', '7');
  await T('smile string index', 'smile', 'A$="HELLO"\nPRINT A$[1];LEN(A$);MID$(A$,1,3);LEFT$(A$,2);RIGHT$(A$,2)', 'E5ELLHELO');
  await T('smile instr', 'smile', 'PRINT INSTR("HELLO","LL");INSTR("HELLO","Z")', '2-1');
  await T('smile var', 'smile', 'VAR A=3,B$="x"\nPRINT A;B$', '3x');
  await T('smile inc dec', 'smile', 'A=5\nINC A\nINC A,10\nDEC A,2\nPRINT A', '14');
  await T('smile ops', 'smile', 'PRINT 7 DIV 2;7 MOD 2;1<<3;5 AND 3;5 OR 2;5 XOR 1;!0;NOT 1', '31817410');
  await T('smile const', 'smile', 'PRINT #TRUE;#FALSE;#PI>3', '101');
  await T('smile data read', 'smile', 'READ A,B$\nPRINT A;B$\nDATA 5,"x"', '5x');
  await T('smile switch', 'smile', 'A=2\nSWITCH A\nCASE 1\nPRINT "one"\nCASE 2,3\nPRINT "two"\nDEFAULT\nPRINT "d"\nENDSWITCH', 'two');
  await T('smile on goto', 'smile', 'ON 2 GOTO @A,@B\n@A\nPRINT "a":END\n@B\nPRINT "b"', 'b');
  await T('smile locate color', 'smile', 'LOCATE 2,1\nCOLOR 3\nPRINT "X"', (r) => r.lines[1] === '  X' && r.screen.fgc[50 + 2] === 0xff0000);
  await T('smile gfx', 'smile', 'GPSET 5,5,#RED\nGLINE 0,10,9,10,#GREEN\nGFILL 20,20,30,30,#BLUE\nGBOX 40,40,50,50,#WHITE', (r) =>
    px(r, 5, 5) === 0xff0000 && px(r, 5, 10) === 0x008000 && px(r, 25, 25) === 0x0000ff && px(r, 40, 45) === 0xffffff && px(r, 45, 45) === 0x000000);
  await T('smile gcircle paint', 'smile', 'GCIRCLE 100,100,20,#WHITE\nGPAINT 100,100,#RED', (r) => px(r, 100, 100) === 0xff0000 && px(r, 100, 80) === 0xffffff);
  await T('smile rgb', 'smile', 'GPSET 1,1,RGB(10,20,30)', (r) => px(r, 1, 1) === 0x0a141e);
  await T('smile gcls', 'smile', 'GCLS RGB(255,0,0)', (r) => px(r, 5, 5) === 0xff0000);
  await T('smile rnd', 'smile', 'A=RND(10):B=RNDF()\nIF A>=0 AND A<10 AND B>=0 AND B<1 THEN PRINT "ok"', 'ok');
  await T('smile format', 'smile', 'PRINT FORMAT$("%03d|%5.2f|%s",5,3.14159,"x")', '005| 3.14|x');
  await T('smile vsync', 'smile', 'VSYNC 2:WAIT 3:PRINT "ok"', 'ok');
  await T('smile button', 'smile', 'B=BUTTON()\nPRINT B', '5', { env: { buttons: () => 5 } });
  await T('smile touch', 'smile', 'TOUCH OUT T,X,Y\nPRINT T;X;Y', '1 3 4'.replace(/ /g, ''), { env: { touch: () => [1, 3, 4] } });
  await T('smile input', 'smile', 'INPUT "N";A\nPRINT A*2', 'N? 4\n8', { inputs: ['4'] });
  await T('smile linput', 'smile', 'LINPUT "N";A$\nPRINT A$', 'Nhello world\nhello world', { inputs: ['hello world'] });
  await T('smile unclosed', 'smile', 'WHILE 1\nPRINT 1', /ERR .*WEND/);
  await T('smile math', 'smile', 'PRINT FLOOR(-1.5);CEIL(1.2);ROUND(2.5);ABS(-3);SQR(9);POW(2,3);CLAMP(15,0,10)', '-22333810');
  await T('smile print comma', 'smile', 'PRINT 1,2', /^1 {3}2$/);
  await T('smile swap', 'smile', 'A=1:B=2:SWAP A,B:PRINT A;B', '21');
  await T('smile main reads global in def', 'smile', 'X=7\nDEF P\nPRINT X\nEND\nP', '7');
  await T('smile string cmp', 'smile', 'IF "A"<"B" THEN PRINT "ok"', 'ok');
  await T('smile type error', 'smile', 'A="x"', /ERR .*型/);
  await T('smile unknown cmd', 'smile', 'FOOBAR 1,2', /ERR .*定義されていません/);
  await T('smile n88-only', 'smile', 'DEFINT A-Z', /ERR .*N88/);
  await T('smile endless guard', 'smile', 'WHILE 1\nVSYNC\nWEND', (r) => !r.err && r.reason === 'user', { maxSleeps: 5 });


  // ---------------- 追加の耐性テスト
  await T('n88 GOTO100', 'n88', '10 GOTO100\n20 PRINT "NO"\n100 PRINT "YES"', 'YES');
  await T('n88 INPUT;', 'n88', '10 INPUT;"X";A\n20 PRINT A', 'X? 5\n 5', { inputs: ['5'] });
  await T('bom', 'smile', '\uFEFFPRINT 1', '1');
  await T('smile deep recursion', 'smile', 'DEF F(N)\nRETURN F(N+1)\nEND\nPRINT F(0)', /ERR .*(深すぎ|あふれ)/);
  await T('full deep recursion', 'full', 'PRINT f(0)\nFUNCTION f(n)\nLET f = f(n + 1)\nEND FUNCTION', /ERR .*(深すぎ|あふれ)/);
  await T('n88 deep fn', 'n88', '10 DEF FNA(X)=FNA(X+1)\n20 PRINT FNA(0)', /ERR .*(深すぎ|あふれ)/);
  await T('smile recursion 300', 'smile', 'DEF S(N)\nIF N<=0 THEN RETURN 0\nRETURN N+S(N-1)\nEND\nPRINT S(300)', '45150');
  await T('gosub runaway', 'n88', '10 GOSUB 10', /ERR .*深すぎ/);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
