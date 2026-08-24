// System-function (quad-name) palette for the language bar.
//
// Adds a "⎕…" toggle to the language bar that opens a palette of Dyalog system
// functions (⎕IO, ⎕FMT, ⎕JSON, ...). The list is sourced at runtime from the
// Primer tab's "Additional features" section, which enumerates exactly the
// quad-names TryAPL's back-end whitelist supports — so the palette can never
// offer a name that would be rejected. Clicking a chip inserts the name at the
// caret via the shared Glyphs.insertGlyph. See PLAN.md -> Phase 10.
(function () {
  "use strict";

  function init() {
    var primer = document.getElementById("primer");
    var rightPane = document.getElementById("rightPane");
    var lb = rightPane && rightPane.querySelector(".ngn_lb");
    if (!primer || !lb || !window.Glyphs) return;

    // The Primer lists supported system functions as <code class="apl"> chips.
    var names = Array.prototype.map.call(primer.querySelectorAll("code.apl"), function (c) { return c.textContent.trim(); })
      .filter(function (t) { return /^⎕[A-Za-z]+$/.test(t); });
    names = names.filter(function (n, i) { return names.indexOf(n) === i; }).sort(); // de-dupe (⎕DR appears twice) + order
    if (!names.length) return;

    // Track the last-focused APL input so chips insert into the right field.
    var target = document.getElementById("session");
    document.addEventListener("focusin", function (e) {
      var el = e.target, nn = el && el.nodeName && el.nodeName.toLowerCase();
      if (nn === "textarea" || (nn === "input" && (el.type === "text" || el.type === "search"))) target = el;
    });

    // Panel lives on <body> (not inside the z-index:-1 language bar) so it
    // isn't occluded; positioned just under the bar when opened.
    var panel = document.createElement("div");
    panel.className = "quadbar-panel";
    panel.hidden = true;
    names.forEach(function (n) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "quadbar-item";
      b.textContent = n;
      b.addEventListener("mousedown", function (ev) {
        ev.preventDefault(); // keep focus on the target input
        window.Glyphs.insertGlyph(target, n);
        panel.hidden = true; // you rarely insert several in a row
        if (target && target.focus) target.focus();
      });
      panel.appendChild(b);
    });
    document.body.appendChild(panel);

    // Toggle is a <span> (not <b>) so the language bar's own click handler,
    // which inserts a clicked <b>'s glyph, ignores it.
    var toggle = document.createElement("span");
    toggle.className = "quadbar-toggle";
    toggle.textContent = "⎕…";
    toggle.title = "Insert a system function (⎕-name)";
    toggle.addEventListener("mousedown", function (ev) {
      ev.preventDefault();
      ev.stopPropagation(); // don't let the outside-click dismiss handler see this
      if (panel.hidden) { panel.style.top = lb.getBoundingClientRect().bottom + "px"; panel.hidden = false; }
      else { panel.hidden = true; }
    });
    lb.appendChild(toggle);

    // Dismiss on outside click.
    document.addEventListener("mousedown", function (e) {
      if (!panel.hidden && e.target !== toggle && !panel.contains(e.target)) panel.hidden = true;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
