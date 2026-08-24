// Ctrl+Space command palette: fuzzy-search APL glyphs by name/keyword and
// insert the chosen one at the caret (or open its help). The search index is
// built from the language-bar functional names (shape, reshape, each, ...) plus
// the Unicode names and tips from elements.h, all via the shared Glyphs model.
// See PLAN.md -> Phase 2.
(function () {
  "use strict";

  var entries = null, indexPromise = null, lastTarget = null;

  function buildIndex() {
    if (indexPromise) return indexPromise;
    // Synchronous base from the language bar so the palette works immediately.
    var byChar = {};
    window.Glyphs.lbs.forEach(function (s) {
      var ch = s[0];
      if (ch === " ") return;
      byChar[ch] = { char: ch, names: s.slice(1).split("\n").filter(Boolean), text: "" };
    });
    entries = Object.keys(byChar).map(function (k) { return byChar[k]; });
    // Enrich asynchronously with Unicode names + tip text from elements.h.
    indexPromise = window.Glyphs.loadElements().then(function (r) {
      for (var i = 0; i < r.symbols.length; i++) {
        var ch = r.symbols[i], block = r.elements[i] || "";
        var uni = block.split("\n")[0].replace(/\s*\(.*\)\s*$/, "").trim();
        var e = byChar[ch] || (byChar[ch] = { char: ch, names: [], text: "" });
        e.uni = uni;
        e.text = block.toLowerCase();
        if (uni && e.names.indexOf(uni) < 0) e.names.push(uni);
      }
      entries = Object.keys(byChar).map(function (k) { return byChar[k]; });
      return entries;
    }).catch(function () { return entries; });
    return indexPromise;
  }

  function subseq(q, s) { var i = 0; for (var j = 0; j < s.length && i < q.length; j++) if (s[j] === q[i]) i++; return i === q.length; }
  function scoreName(q, name) {
    name = name.toLowerCase();
    var i = name.indexOf(q);
    if (i === 0) return 500 - name.length; // prefix match, shorter names win
    if (i > 0) return 300 - i;             // substring match
    if (subseq(q, name)) return 100;       // subsequence match
    return -1;
  }
  function score(q, e) {
    q = q.toLowerCase();
    if (!q) return 0;
    if (e.char === q) return 1000;
    var best = -1;
    e.names.forEach(function (n) { best = Math.max(best, scoreName(q, n)); });
    if (best < 0 && e.text && e.text.indexOf(q) >= 0) best = 20; // keyword in tip
    return best;
  }
  function search(q) {
    if (!entries) return [];
    return entries.map(function (e) { return { e: e, s: score(q, e) }; })
      .filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 30).map(function (x) { return x.e; });
  }
  function label(e) { return e.uni || e.names[0] || e.char; }

  // ---- overlay ----
  var overlay, input, list, rows = [], sel = -1;

  function build() {
    overlay = document.createElement("div");
    overlay.className = "palette";
    overlay.hidden = true;
    var box = document.createElement("div");
    box.className = "palette-box";
    input = document.createElement("input");
    input.type = "text";
    input.className = "palette-input";
    input.setAttribute("placeholder", "Search glyphs by name or keyword…");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("autocomplete", "off");
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "palette-close";
    closeBtn.textContent = "×";
    closeBtn.title = "Close (Esc)";
    var head = document.createElement("div");
    head.className = "palette-head";
    head.appendChild(input);
    head.appendChild(closeBtn);
    list = document.createElement("ul");
    list.className = "palette-list";
    box.appendChild(head);
    box.appendChild(list);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    input.addEventListener("input", function () { render(search(input.value)); });
    input.addEventListener("keydown", onInputKey);
    closeBtn.addEventListener("mousedown", function (e) { e.preventDefault(); close(); });
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
  }

  function render(results) {
    list.textContent = "";
    rows = results;
    sel = results.length ? 0 : -1;
    results.forEach(function (e, i) {
      var li = document.createElement("li");
      li.className = "palette-row" + (i === sel ? " sel" : "");
      var g = document.createElement("span");
      g.className = "palette-glyph apl";
      g.textContent = e.char;
      var nm = document.createElement("span");
      nm.className = "palette-name";
      nm.textContent = label(e);
      li.appendChild(g);
      li.appendChild(nm);
      li.addEventListener("mousedown", function (ev) { ev.preventDefault(); choose(i); });
      list.appendChild(li);
    });
  }

  function move(d) {
    if (!rows.length) return;
    var lis = list.children;
    if (sel >= 0 && lis[sel]) lis[sel].className = "palette-row";
    sel = (sel + d + rows.length) % rows.length;
    if (lis[sel]) { lis[sel].className = "palette-row sel"; lis[sel].scrollIntoView({ block: "nearest" }); }
  }

  function choose(i) { if (i == null) i = sel; if (i < 0 || !rows[i]) return; insert(rows[i].char); close(); }
  function insert(str) {
    var t = lastTarget || document.getElementById("session");
    window.Glyphs.insertGlyph(t, str);
    if (t && t.focus) t.focus();
  }
  function help() {
    if (sel < 0 || !rows[sel]) return;
    close();
    if (typeof glyphHelp === "function") glyphHelp(rows[sel].char);
  }

  function onInputKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); e.shiftKey ? help() : choose(); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  }

  function open() {
    if (!overlay) build();
    // Remember where to insert (the editable that had focus before the palette).
    var ae = document.activeElement;
    if (ae && isEditable(ae)) lastTarget = ae;
    buildIndex();
    overlay.hidden = false;
    input.value = "";
    render(search(""));
    input.focus();
  }
  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    if (lastTarget && lastTarget.focus) lastTarget.focus();
  }
  function isEditable(el) {
    var nn = el.nodeName && el.nodeName.toLowerCase();
    return nn === "textarea" || (nn === "input" && (el.type === "text" || el.type === "search"));
  }

  function init() {
    if (!window.Glyphs) return;
    // Track the last real editable — but never the palette's own search input,
    // or inserts would land in the search box instead of the session.
    document.addEventListener("focusin", function (e) {
      if (isEditable(e.target) && !(overlay && overlay.contains(e.target))) lastTarget = e.target;
    });
    // Ctrl+Space opens the palette (capture phase + stopPropagation so the
    // session's own keydown handler never sees it).
    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey && !e.altKey && !e.metaKey && (e.code === "Space" || e.key === " ")) {
        e.preventDefault(); e.stopPropagation();
        (overlay && !overlay.hidden) ? close() : open();
      }
    }, true);
    buildIndex(); // warm the index
    window.Palette = { open: open, close: close, search: search };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
