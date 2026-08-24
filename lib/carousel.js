// Examples carousel: a rotating strip of runnable APL expressions in the Intro
// tab. Seeded with a curated set plus expressions harvested from the Intro tab.
// Clicking an example loads it into the session (ready to run) via replaceLine.
// See PLAN.md -> Phase 6.
(function () {
  "use strict";

  // Curated, verified-runnable examples.
  var CURATED = [
    { expr: "+/⍳100", note: "Sum the integers 1 to 100" },
    { expr: "⌽'TryAPL'", note: "Reverse a string" },
    { expr: "∘.×⍨⍳9", note: "A multiplication table" },
    { expr: "{⍵[⍋⍵]}5 3 8 1", note: "Sort ascending" },
    { expr: "(⍳5)∘.≤⍳5", note: "An upper-triangular mask" },
    { expr: "+/2=+⌿0=(⍳12)∘.|⍳12", note: "Count the primes up to 12" },
    { expr: "5 5⍴⍳25", note: "Reshape into a 5×5 matrix" }
  ];

  function harvest(host) {
    var intro = document.getElementById("intro");
    if (!intro) return [];
    return Array.prototype.filter.call(intro.querySelectorAll("code.apl"), function (c) {
      return !host.contains(c) && c.textContent.trim();
    }).map(function (c) { return { expr: c.textContent.trim(), note: "" }; });
  }

  function init() {
    var host = document.getElementById("exampleCarousel");
    if (!host || typeof replaceLine !== "function") return;

    // Pool = curated + harvested (deduped by expression).
    var pool = CURATED.slice();
    var seen = {};
    pool.forEach(function (e) { seen[e.expr] = 1; });
    harvest(host).forEach(function (e) { if (!seen[e.expr]) { seen[e.expr] = 1; pool.push(e); } });
    if (!pool.length) return;

    var i = 0, timer = null;

    var prev = document.createElement("button");
    prev.type = "button"; prev.className = "carousel-nav"; prev.textContent = "‹";
    prev.title = "Previous example";
    var next = document.createElement("button");
    next.type = "button"; next.className = "carousel-nav"; next.textContent = "›";
    next.title = "Next example";
    var card = document.createElement("div");
    card.className = "carousel-card";
    var code = document.createElement("code");
    code.className = "apl carousel-expr";
    code.title = "Click to load into the session";
    var note = document.createElement("span");
    note.className = "carousel-note";

    card.appendChild(code);
    card.appendChild(note);
    host.appendChild(prev);
    host.appendChild(card);
    host.appendChild(next);

    function show(n) {
      i = (n + pool.length) % pool.length;
      code.textContent = pool[i].expr;
      note.textContent = pool[i].note;
    }
    function advance() { show(i + 1); }
    function start() { stop(); timer = setInterval(advance, 5000); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    code.addEventListener("click", function () { replaceLine(pool[i].expr); });
    prev.addEventListener("click", function () { show(i - 1); start(); });
    next.addEventListener("click", function () { show(i + 1); start(); });
    host.addEventListener("mouseenter", stop);
    host.addEventListener("mouseleave", start);

    show(0);
    start();
    window.Carousel = { show: show, next: advance, count: function () { return pool.length; } };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
