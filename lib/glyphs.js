// TryAPL shared glyph model.
//
// Owns the completion tables, language-bar data, the elements.h help parser,
// and a single glyph-insertion helper. Consumed by lib/tiolb.js (language bar,
// Tab/prefix input) and lib/tryapl.js (Primer help), and by the new v4 modules
// (on-screen keyboard, search palette, help pages).
//
// Loaded as a classic script BEFORE tryapl.js so window.Glyphs exists when the
// head-loaded and body-end consumers run. Also attaches to globalThis under
// Node so the data tables can be unit-tested. See PLAN.md -> Phase 0.
(function (root) {
  "use strict";

  // --- Raw data (moved verbatim from the original lib/tiolb.js) --------------
  // tcs: packed triples (char1, char2, resultGlyph) for Tab completion.
  var tcs = "<-←xx×/\\×:-÷*O⍟○*⍟[-⌹-]⌹⎕÷⌹[÷⌹]÷⌹OO○77⌈FF⌈ll⌊LL⌊T_⌶II⌶⊥⊤⌶|_⊥TT⊤-|⊣|-⊢=/≠L-≠<=≤<_≤>=≥>_≥==≡=_≡7=≢Z-≢≠_≢vv∨^^∧^~⍲∧~⍲v~⍱∨~⍱^|↑v|↓((⊂cc⊂(_⊆c_⊆⊂_⊆))⊃[|⌷|]⌷A|⍋∆|⍋V|⍒∇|⍒ii⍳i_⍸⍳_⍸ee∊e_⍷∊_⍷uu∪UU∪nn∩/-⌿\\-⍀,-⍪rr⍴pp⍴O|⌽○|⌽O-⊖○-⊖O\\⍉○\\⍉::¨\"\"¨~:⍨~\"⍨~¨⍨*:⍣*\"⍣*¨⍣oo∘o:⍤o\"⍤∘¨⍤∘\"⍤o¨⍤O:⍥O\"⍥○¨⍥○\"⍥O¨⍥['⍞']⍞⎕'⍞[]⎕[:⍠:]⍠⎕:⍠[=⌸=]⌸⎕=⌸[<⌺>]⌺[⋄⌺⋄]⌺⎕⋄⌺*_⍎o⊥⍎∘⊥⍎⍛|⍎oT⍕o-⍕o⊤⍕∘⊤⍕<>⋄^v⋄on⍝o∩⍝∘n⍝->→aa⍺ww⍵VV∇v-∇--¯0~⍬AA∆^-∆A_⍙∆_⍙^=⍙[?⍰?]⍰⎕?⍰:V⍢∇\"⍢V¨⍢\"∇⍢||∥ox¤o×¤∘x¤∘×¤)_⊇_)⊇⊃_⊇V~⍫∇~⍫''`o_⍛∘_⍛";
  // lbs: language-bar button definitions ("<glyph><glyph>\n<name>\n<name>...").
  var lbs = ["←←\nASSIGN"," ","++\nconjugate\nplus","--\nnegate\nminus","××\ndirection\ntimes","÷÷\nreciprocal\ndivide","**\nexponential\npower","⍟⍟\nnatural logarithm\nlogarithm","⌹⌹\nmatrix inverse\nmatrix divide","○○\npi times\ncircular","!!\nfactorial\nbinomial","??\nroll\ndeal"," ","||\nmagnitude\nresidue","⌈⌈\nceiling\nmaximum","⌊⌊\nfloor\nminimum","⊥⊥\ndecode","⊤⊤\nencode","⊣⊣\nsame\nleft","⊢⊢\nsame\nright"," ","==\nequal","≠≠\nunique mask\nnot equal","≤≤\nless than or equal to","<<\nless than",">>\ngreater than","≥≥\ngreater than or equal to","≡≡\ndepth\nmatch","≢≢\ntally\nnot match"," ","∨∨\ngreatest common divisor/or","∧∧\nlowest common multiple/and","⍲⍲\nnand","⍱⍱\nnor"," ","↑↑\nmix\ntake","↓↓\nsplit\ndrop","⊂⊂\nenclose\npartioned enclose","⊃⊃\nfirst\npick","⊆⊆\nnest\npartition","⌷⌷\nmaterialise\nindex","⍋⍋\ngrade up\ngrades up","⍒⍒\ngrade down\ngrades down"," ","⍳⍳\nindices\nindices of","⍸⍸\nwhere\ninterval index","∊∊\nenlist\nmember of","⍷⍷\nfind","∪∪\nunique\nunion","∩∩\nintersection","~~\nnot\nwithout"," ","//\nreplicate\nReduce","\\\\\nexpand\nScan","⌿⌿\nreplicate first\nReduce First","⍀⍀\nexpand first\nScan First"," ",",,\nravel\ncatenate/laminate","⍪⍪\ntable\ncatenate first/laminate","⍴⍴\nshape\nreshape","⌽⌽\nreverse\nrotate","⊖⊖\nreverse first\nrotate first","⍉⍉\ntranspose\nreorder axes"," ","¨¨\nEach","⍨⍨\nConstant\nSelf\nSwap","⍣⍣\nRepeat\nUntil","..\nOuter Product (∘.)\nInner Product","∘∘\nOUTER PRODUCT (∘.)\nBind\nBeside","⍛⍛\nBehind\n","⍤⍤\nRank\nAtop","⍥⍥\nOver","@@\nAt"," ","⍞⍞\nSTDIN\nSTDERR","⎕⎕\nEVALUATED STDIN\nSTDOUT\nSYSTEM NAME PREFIX","⍠⍠\nVariant","⌸⌸\nIndex Key\nKey","⌺⌺\nStencil","⌶⌶\nI-Beam","⍎⍎\nexecute","⍕⍕\nformat"," ","⋄⋄\nSTATEMENT SEPARATOR","⍝⍝\nCOMMENT","→→\nABORT\nBRANCH","⍵⍵\nRIGHT ARGUMENT\nRIGHT OPERAND (⍵⍵)","⍺⍺\nLEFT ARGUMENT\nLEFT OPERAND (⍺⍺)","∇∇\nrecursion\nRecursion (∇∇)","&&\nSpawn"," ","¯¯\nNEGATIVE","⍬⍬\nEMPTY NUMERIC VECTOR","∆∆\nIDENTIFIER CHARACTER","⍙⍙\nIDENTIFIER CHARACTER"];
  // bqk / bqv: parallel strings mapping prefix-key -> APL glyph.
  var bqk = " =1234567890-qwertyuiop\\asdfghjkl;'zxcvbnm,./`[]+!@#$%^&*()_QWERTYUIOP|ASDFGHJKL:\"ZXCVBNM<>?~{}";
  var bqv = "`÷¨¯<≤=≥>≠∨∧×?⍵∊⍴~↑↓⍳○*⊢⍺⌈⌊_∇∆∘'⎕⍎⍕⊂⊃∩∪⊥⊤|⍝⍀⌿⋄←→⌹⌶⍫⍒⍋⌽⍉⊖⍟⍱⍲!⍰W⍷R⍨YU⍸⍥⍣⊣ASD⍛⍢H⍤⌸⌷≡≢⊆⊇CVB¤∥⍪⍙⍠⌺⍞⍬";

  // --- Derived lookup tables (build loops moved verbatim from tiolb.js) ------
  var tc = {}, bqc = {};
  for (var i = 0; i < bqk.length; i++) bqc[bqk[i]] = bqv[i];
  for (var i = 0; i < tcs.length; i += 3) tc[tcs[i] + tcs[i + 1]] = tcs[i + 2];
  for (var i = 0; i < tcs.length; i += 3) { var k = tcs[i + 1] + tcs[i]; tc[k] = tc[k] || tcs[i + 2]; }

  // --- Reverse maps (new; single source of truth for keyboard/help/search) ---
  // First occurrence wins, mirroring how the language-bar tooltips list them.
  var glyphToPrefix = {}, glyphToTab = {};
  for (var i = 0; i < bqk.length; i++) if (!(bqv[i] in glyphToPrefix)) glyphToPrefix[bqv[i]] = bqk[i];
  for (var i = 0; i < tcs.length; i += 3) if (!(tcs[i + 2] in glyphToTab)) glyphToTab[tcs[i + 2]] = tcs[i] + tcs[i + 1];

  // --- elements.h help parser ------------------------------------------------
  // Parses assets/elements.h into { symbols, elements } where symbols is a
  // string of glyph chars index-aligned to the elements[] help blocks.
  // Logic preserved verbatim from the original tryapl.js loadTryAPL fetch.
  function parseElements(text) {
    var symbols = "";
    var elements = text.split("NAME(").slice(1).map(function (t) {
      var lines = [...t.matchAll(/"[^"]*"/g)];
      symbols += lines[1][0][1];
      return lines.join("\n").replace("\n", " (").replace("\n", ")\n\n").replace(/"/g, '').replace(/\\\\/g, "\\");
    });
    return { symbols: symbols, elements: elements };
  }

  var _elements = null;
  function loadElements() {
    if (!_elements) _elements = fetch("assets/elements.h").then(function (r) { return r.text(); }).then(parseElements);
    return _elements;
  }

  // --- Single glyph-insertion path -------------------------------------------
  // Replace target's current selection with str, leaving the caret after it.
  // Used by the language bar, on-screen keyboard, and search palette.
  function insertGlyph(target, str) {
    if (!target) return;
    var i = target.selectionStart, j = target.selectionEnd, v = target.value;
    if (i == null || j == null) return;
    target.value = v.slice(0, i) + str + v.slice(j);
    target.selectionStart = target.selectionEnd = i + str.length;
  }

  root.Glyphs = {
    tcs: tcs, lbs: lbs, bqk: bqk, bqv: bqv,
    tc: tc, bqc: bqc,
    glyphToPrefix: glyphToPrefix, glyphToTab: glyphToTab,
    parseElements: parseElements, loadElements: loadElements,
    insertGlyph: insertGlyph
  };
})(typeof window !== "undefined" ? window : globalThis);
