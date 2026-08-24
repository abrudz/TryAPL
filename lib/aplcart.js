// APLcart integration: search https://aplcart.info by description/keyword and
// insert the chosen idiom into the session. The 800 KB table is fetched lazily
// on first use (CORS-enabled) and cached in memory. See PLAN.md -> Phase 5.
(function () {
  "use strict";

  var rows = null, loadPromise = null;
  var URL = "https://aplcart.info/table.tsv";

  function parse(tsv) {
    var lines = tsv.split("\n");
    lines.shift(); // header: SYNTAX DESCRIPTION CLASS TYPE GROUP CATEGORY KEYWORDS TIO DOCS
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i]) continue;
      var f = lines[i].split("\t");
      out.push({ syntax: f[0], description: f[1] || "", keywords: (f[6] || ""), tio: f[7] || "", docs: f[8] || "" });
    }
    return out;
  }

  function load() {
    if (loadPromise) return loadPromise;
    loadPromise = fetch(URL)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (t) { rows = parse(t); return rows; });
    return loadPromise;
  }

  function score(q, r) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return -1;
    var d = r.description.toLowerCase();
    var hay = d + " " + r.keywords.toLowerCase();
    var s = 0;
    for (var i = 0; i < terms.length; i++) {
      var at = hay.indexOf(terms[i]);
      if (at < 0) return -1;             // every term must appear (AND)
      s += Math.max(0, 50 - at);
    }
    if (d.indexOf(terms[0]) === 0) s += 100;      // description starts with query
    else if (d.indexOf(terms[0]) >= 0) s += 30;   // query in description
    s -= r.syntax.length * 0.1;                    // prefer terser idioms
    return s;
  }

  function search(q, limit) {
    if (!rows || !q.trim()) return [];
    var scored = [];
    for (var i = 0; i < rows.length; i++) {
      var s = score(q, rows[i]);
      if (s >= 0) scored.push({ r: rows[i], s: s });
    }
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, limit || 40).map(function (x) { return x.r; });
  }

  // ---- UI (Links tab) ----
  function init() {
    var input = document.getElementById("aplcartInput");
    var out = document.getElementById("aplcartResults");
    if (!input || !out || !window.Glyphs) return;

    function insert(syntax) {
      var t = document.getElementById("session");
      window.Glyphs.insertGlyph(t, syntax);
      if (t && t.focus) t.focus();
    }

    function render(results, q) {
      out.textContent = "";
      if (!q.trim()) return;
      if (!results.length) { out.textContent = "No matches."; return; }
      results.forEach(function (r) {
        var row = document.createElement("div");
        row.className = "aplcart-row";
        var syn = document.createElement("button");
        syn.type = "button";
        syn.className = "aplcart-syntax apl";
        syn.textContent = r.syntax;
        syn.title = "Insert into session";
        syn.addEventListener("click", function () { insert(r.syntax); });
        var desc = document.createElement("span");
        desc.className = "aplcart-desc";
        desc.textContent = r.description;
        row.appendChild(syn);
        row.appendChild(desc);
        if (r.docs) {
          var a = document.createElement("a");
          a.className = "aplcart-docs";
          a.href = r.docs; a.target = "_blank"; a.rel = "noopener";
          a.textContent = "docs ↗";
          row.appendChild(a);
        }
        out.appendChild(row);
      });
    }

    var timer = null;
    input.addEventListener("input", function () {
      var q = input.value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        if (!q.trim()) { render([], q); return; }
        out.textContent = rows ? "" : "Loading APLcart…";
        load().then(function () { render(search(q), q); })
          .catch(function () { out.textContent = "Could not load APLcart (offline?)."; });
      }, 150);
    });
  }

  // Expose the data API regardless of the DOM (used by tests and other modules).
  window.APLcart = { load: load, search: search, parse: parse };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
