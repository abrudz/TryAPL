// Keyboard-map reference overlay: a US-QWERTY diagram showing which APL glyph
// each key produces under the prefix key, built from the shared Glyphs.bqc.
// Opened from a ⌨ toggle in the language bar; clicking a glyph inserts it.
// See PLAN.md -> Phase 2.
(function () {
  "use strict";

  var ROWS = ["`1234567890-=", "qwertyuiop[]\\", "asdfghjkl;'", "zxcvbnm,./"];
  var SHIFT = {
    "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&",
    "8": "*", "9": "(", "0": ")", "-": "_", "=": "+", "[": "{", "]": "}", "\\": "|",
    ";": ":", "'": "\"", ",": "<", ".": ">", "/": "?"
  };
  function shiftOf(ch) { return SHIFT[ch] || ch.toUpperCase(); }
  function glyph(ch) { var g = window.Glyphs.bqc[ch]; return g && g !== ch ? g : ""; }

  var lastTarget = null;
  function isEditable(el) {
    var nn = el && el.nodeName && el.nodeName.toLowerCase();
    return nn === "textarea" || (nn === "input" && (el.type === "text" || el.type === "search"));
  }

  function init() {
    var rightPane = document.getElementById("rightPane");
    var lb = rightPane && rightPane.querySelector(".ngn_lb");
    if (!lb || !window.Glyphs) return;

    document.addEventListener("focusin", function (e) { if (isEditable(e.target)) lastTarget = e.target; });

    var overlay = document.createElement("div");
    overlay.className = "kbmap";
    overlay.hidden = true;
    var board = document.createElement("div");
    board.className = "kbmap-board";
    overlay.appendChild(board);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) overlay.hidden = true; });
    document.body.appendChild(overlay);

    function insert(g) {
      var t = lastTarget || document.getElementById("session");
      window.Glyphs.insertGlyph(t, g);
      if (t && t.focus) t.focus();
    }

    ROWS.forEach(function (row) {
      var r = document.createElement("div");
      r.className = "kbmap-row";
      row.split("").forEach(function (ch) {
        var sh = shiftOf(ch), gBase = glyph(ch), gShift = glyph(sh);
        var key = document.createElement("div");
        key.className = "kbmap-key";
        key.appendChild(corner("kb-tl", sh));
        key.appendChild(corner("kb-tr apl", gShift, insert));
        key.appendChild(corner("kb-bl", ch));
        key.appendChild(corner("kb-br apl", gBase, insert));
        r.appendChild(key);
      });
      board.appendChild(r);
    });

    function corner(cls, text, onInsert) {
      var s = document.createElement("span");
      s.className = cls;
      s.textContent = text || "";
      if (onInsert && text) { s.classList.add("kb-ins"); s.addEventListener("mousedown", function (ev) { ev.preventDefault(); onInsert(text); }); }
      return s;
    }

    var toggle = document.createElement("span");
    toggle.className = "kbmap-toggle";
    toggle.textContent = "⌨";
    toggle.title = "Show the APL keyboard map";
    toggle.addEventListener("mousedown", function (ev) {
      ev.preventDefault();
      if (overlay.hidden) { var ae = document.activeElement; if (ae && isEditable(ae)) lastTarget = ae; }
      overlay.hidden = !overlay.hidden;
    });
    lb.appendChild(toggle);

    window.KbMap = { open: function () { overlay.hidden = false; }, close: function () { overlay.hidden = true; }, _overlay: overlay };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
