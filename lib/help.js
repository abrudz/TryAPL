// Interactive help pages.
//
// A non-modal, draggable, closable panel showing a glyph's help from
// elements.h (via Glyphs.loadElements): its name, how to type it (Tab and
// prefix), a reference link, and its worked examples — where each example input
// line (the ones prefixed with the 6-space REPL prompt) is clickable to load it
// into the session. Replaces the old destructive in-session glyphHelp as the
// default; window.glyphHelp is left intact for anything that still wants it.
// See PLAN.md -> Phase 3.
(function () {
  "use strict";

  var panel, titleEl, bodyEl, built = false, lastTarget = null;

  function isEditable(el) {
    var nn = el && el.nodeName && el.nodeName.toLowerCase();
    return nn === "textarea" || (nn === "input" && (el.type === "text" || el.type === "search"));
  }

  function build() {
    panel = document.createElement("div");
    panel.className = "helpview";
    panel.hidden = true;
    var header = document.createElement("div");
    header.className = "helpview-header";
    titleEl = document.createElement("span");
    titleEl.className = "helpview-title apl";
    var closeBtn = document.createElement("span");
    closeBtn.className = "helpview-close";
    closeBtn.textContent = "×";
    closeBtn.title = "Close";
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    bodyEl = document.createElement("div");
    bodyEl.className = "helpview-body";
    panel.appendChild(header);
    panel.appendChild(bodyEl);
    document.body.appendChild(panel);

    closeBtn.addEventListener("mousedown", function (e) { e.preventDefault(); panel.hidden = true; });
    (function () { // drag by header
      var drag = false, sx = 0, sy = 0, ox = 0, oy = 0;
      header.addEventListener("mousedown", function (e) {
        if (e.target === closeBtn) return;
        var r = panel.getBoundingClientRect();
        ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY; drag = true;
        panel.style.left = ox + "px"; panel.style.top = oy + "px"; panel.style.right = "auto"; panel.style.bottom = "auto";
        e.preventDefault();
      });
      document.addEventListener("mousemove", function (e) { if (!drag) return; panel.style.left = (ox + e.clientX - sx) + "px"; panel.style.top = (oy + e.clientY - sy) + "px"; });
      document.addEventListener("mouseup", function () { drag = false; });
    })();
    document.addEventListener("focusin", function (e) { if (isEditable(e.target) && !panel.contains(e.target)) lastTarget = e.target; });
    built = true;
  }

  function typeInfo(ch) {
    var g = window.Glyphs, parts = [];
    var tab = g.glyphToTab[ch];
    if (tab) parts.push("Tab " + tab[0] + " " + tab[1]);
    var pre = g.glyphToPrefix[ch];
    if (pre) parts.push("Prefix ` " + pre);
    return parts.join("      ");
  }

  function render(ch, block) {
    var lines = block.split("\n");
    titleEl.textContent = lines[0] || ch; // e.g. "Rho (⍴)"
    bodyEl.textContent = "";

    var ti = typeInfo(ch);
    if (ti) {
      var t = document.createElement("div");
      t.className = "helpview-type apl";
      t.textContent = ti;
      bodyEl.appendChild(t);
    }

    var a = document.createElement("a");
    a.className = "helpview-docs";
    a.target = "_blank"; a.rel = "noopener";
    a.href = "https://aplcart.info/?q=" + encodeURIComponent(ch);
    a.textContent = "Look up " + ch + " on APLcart ↗";
    bodyEl.appendChild(a);

    // Worked examples: input lines carry the 6-space REPL prompt; make them
    // clickable to load into the session. Everything else is shown as-is.
    var pre = document.createElement("pre");
    pre.className = "helpview-pre apl";
    lines.slice(1).forEach(function (line) {
      if (/^ {6}\S/.test(line)) {
        var expr = line.slice(6);
        var span = document.createElement("span");
        span.className = "helpview-ex";
        span.textContent = line;
        span.title = "Click to load into the session";
        span.addEventListener("click", function () { if (typeof replaceLine === "function") replaceLine(expr); });
        pre.appendChild(span);
      } else {
        pre.appendChild(document.createTextNode(line));
      }
      pre.appendChild(document.createTextNode("\n"));
    });
    bodyEl.appendChild(pre);
  }

  function openHelp(ch) {
    if (!window.Glyphs || !ch) return;
    if (!built) build();
    var ae = document.activeElement;
    if (ae && isEditable(ae)) lastTarget = ae;
    window.Glyphs.loadElements().then(function (r) {
      var i = r.symbols.indexOf(ch);
      if (i < 0) { titleEl.textContent = ch; bodyEl.textContent = "No help available for " + ch + "."; }
      else render(ch, r.elements[i]);
      panel.hidden = false;
    });
  }

  window.openHelp = openHelp;
})();
