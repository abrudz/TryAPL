// On-screen tappable keyboard (mobile-first input method).
//
// A bottom-docked keyboard that types into the session (or the last-focused
// field). Two layers — APL glyphs and ASCII — toggled by a mode key, with a
// Shift key and a function row (space, backspace, enter, hide). Glyphs come
// from the shared Glyphs.bqc; insertion uses Glyphs.insertGlyph. Auto-shows on
// touch / coarse-pointer devices; a ⌨ button in the language bar toggles it.
// Also wires the configurable prefix-key control in the File tab.
// See PLAN.md -> Phase 1.
(function () {
  "use strict";

  var ROWS = ["`1234567890-=", "qwertyuiop[]\\", "asdfghjkl;'", "zxcvbnm,./"];
  var SHIFT = {
    "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&",
    "8": "*", "9": "(", "0": ")", "-": "_", "=": "+", "[": "{", "]": "}", "\\": "|",
    ";": ":", "'": "\"", ",": "<", ".": ">", "/": "?"
  };
  function shiftOf(ch) { return SHIFT[ch] || ch.toUpperCase(); }
  function glyphOf(ch) { var g = window.Glyphs.bqc[ch]; return g && g !== ch ? g : ""; }

  var lastTarget = null, mode = "apl", shifted = false, kb = null, keyBtns = [], modeBtn = null, shiftBtn = null;

  function isEditable(el) {
    var nn = el && el.nodeName && el.nodeName.toLowerCase();
    return nn === "textarea" || (nn === "input" && (el.type === "text" || el.type === "search"));
  }
  function target() { return lastTarget || document.getElementById("session"); }

  function labelFor(base) {
    var ch = shifted ? shiftOf(base) : base;
    if (mode === "abc") return ch;
    return glyphOf(ch) || ch; // APL layer: the glyph, or the char if the key has none
  }
  function relabel() {
    keyBtns.forEach(function (b) { b.textContent = labelFor(b._base); });
    if (modeBtn) modeBtn.textContent = mode === "apl" ? "ABC" : "⍺⍵";
    if (shiftBtn) shiftBtn.className = "oskb-key oskb-fn" + (shifted ? " on" : "");
  }

  function insert(str) { var t = target(); window.Glyphs.insertGlyph(t, str); if (t && t.focus) t.focus(); }
  function backspace() {
    var t = target(); if (!t) return;
    var i = t.selectionStart, j = t.selectionEnd, v = t.value;
    if (i == null) return;
    if (i !== j) { t.value = v.slice(0, i) + v.slice(j); t.selectionStart = t.selectionEnd = i; }
    else if (i > 0) { t.value = v.slice(0, i - 1) + v.slice(i); t.selectionStart = t.selectionEnd = i - 1; }
    if (t.focus) t.focus();
  }
  function enter() {
    var t = target(); if (t && t.focus) t.focus();
    var ev;
    try {
      ev = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" });
      Object.defineProperty(ev, "keyCode", { get: function () { return 13; } });
      Object.defineProperty(ev, "which", { get: function () { return 13; } });
    } catch (e) { return; }
    (t || document).dispatchEvent(ev);
  }

  function keyBtn(cls, label, onTap) {
    var b = document.createElement("button");
    b.type = "button"; b.className = cls;
    if (label != null) b.textContent = label;
    b.addEventListener("mousedown", function (ev) { ev.preventDefault(); onTap(b); });
    return b;
  }

  function build() {
    kb = document.createElement("div");
    kb.className = "oskb";
    kb.hidden = true;
    ROWS.forEach(function (row) {
      var r = document.createElement("div");
      r.className = "oskb-row";
      row.split("").forEach(function (base) {
        var b = keyBtn("oskb-key", labelFor(base), function (btn) {
          insert(btn.textContent);
          if (shifted) { shifted = false; relabel(); } // one-shot shift
        });
        b._base = base;
        keyBtns.push(b);
        r.appendChild(b);
      });
      kb.appendChild(r);
    });
    var fr = document.createElement("div");
    fr.className = "oskb-row";
    shiftBtn = keyBtn("oskb-key oskb-fn", "⇧", function () { shifted = !shifted; relabel(); });
    modeBtn = keyBtn("oskb-key oskb-fn", mode === "apl" ? "ABC" : "⍺⍵", function () { mode = mode === "apl" ? "abc" : "apl"; relabel(); });
    var space = keyBtn("oskb-key oskb-space", "space", function () { insert(" "); });
    var back = keyBtn("oskb-key oskb-fn", "⌫", function () { backspace(); });
    var ent = keyBtn("oskb-key oskb-fn", "↵", function () { enter(); });
    var hide = keyBtn("oskb-key oskb-fn", "⌄", function () { kb.hidden = true; });
    [shiftBtn, modeBtn, space, back, ent, hide].forEach(function (b) { fr.appendChild(b); });
    kb.appendChild(fr);
    document.body.appendChild(kb);
    document.addEventListener("focusin", function (e) { if (isEditable(e.target) && !kb.contains(e.target)) lastTarget = e.target; });
    relabel();
  }

  function initPrefixSetting() {
    var input = document.getElementById("prefixKeysInput");
    var reset = document.getElementById("prefixKeysReset");
    if (input) {
      input.value = window.Glyphs.getPrefixKeys();
      input.addEventListener("change", function () { window.Glyphs.setPrefixKeys(input.value); });
    }
    if (reset) {
      reset.addEventListener("click", function () { window.Glyphs.setPrefixKeys(""); if (input) input.value = window.Glyphs.getPrefixKeys(); });
    }
  }

  function init() {
    if (!window.Glyphs) return;
    build();
    initPrefixSetting();

    var rightPane = document.getElementById("rightPane");
    var lb = rightPane && rightPane.querySelector(".ngn_lb");
    if (lb) {
      var toggle = document.createElement("span");
      toggle.className = "oskb-toggle";
      toggle.textContent = "⌨";
      toggle.title = "Show/hide the on-screen keyboard";
      toggle.addEventListener("mousedown", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var ae = document.activeElement;
        if (kb.hidden && ae && isEditable(ae)) lastTarget = ae;
        kb.hidden = !kb.hidden;
      });
      lb.appendChild(toggle);
    }

    // Primary input on touch: show by default on coarse-pointer devices.
    try {
      if ((window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || ("ontouchstart" in window)) kb.hidden = false;
    } catch (e) {}

    window.OSKB = {
      show: function () { kb.hidden = false; }, hide: function () { kb.hidden = true; },
      setMode: function (m) { mode = m; relabel(); }, setShift: function (s) { shifted = s; relabel(); },
      _kb: function () { return kb; }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
