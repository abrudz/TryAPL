// Embeddable REPL widget.
//
// With ?embed (or ?minimal) in the URL, the page hides its left pane / tabs /
// gutter so a host page can iframe just the REPL. A small postMessage API lets
// the host drive it and receive results:
//   host -> widget : {type:'tryapl:exec',  code}   run a line
//                    {type:'tryapl:set',   code}   put a line in the session
//                    {type:'tryapl:clear'}          clear the workspace
//   widget -> host : {type:'tryapl:result', lines}  after each execution
// Existing ?q=/?run=/?ws= seeding still applies. If ?origin=<url> is given,
// only that origin may drive the widget (and results post back to it).
// See PLAN.md -> Phase 10.
(function () {
  "use strict";

  var allowOrigin = null;   // when set, the only origin accepted/answered
  var parentWin = null, parentOrigin = "*";

  function post(msg) {
    var target = parentWin || (window.parent !== window ? window.parent : null);
    if (!target) return;
    try { target.postMessage(msg, allowOrigin || parentOrigin); } catch (e) {}
  }

  function runExec(code) { if (typeof submitLine === "function") submitLine(code); }
  function setLine(code) {
    if (typeof replaceLine === "function") replaceLine(code);
    else if (typeof insertLine === "function") insertLine(code);
  }

  function onMessage(e) {
    if (allowOrigin && e.origin && e.origin !== allowOrigin) return; // reject foreign origins
    var d = e.data;
    if (!d || typeof d !== "object" || typeof d.type !== "string" || d.type.indexOf("tryapl:") !== 0) return;
    parentWin = e.source || parentWin;
    if (e.origin && e.origin !== "null") parentOrigin = e.origin;
    if (d.type === "tryapl:exec" && typeof d.code === "string") runExec(d.code);
    else if (d.type === "tryapl:set" && typeof d.code === "string") setLine(d.code);
    else if (d.type === "tryapl:clear") runExec(")clear");
  }

  function init() {
    var params = new URLSearchParams(location.search);
    var embed = params.get("embed") != null || params.get("minimal") != null;
    if (embed) {
      document.body.classList.add("embed"); // body, not <html> (dark-mode code overwrites html.className)
      var o = params.get("origin");
      if (o) { allowOrigin = o; parentOrigin = o; }
    }
    window.addEventListener("message", onMessage);
    document.addEventListener("tryapl:executed", function (e) {
      var result = e && e.detail && e.detail.result;
      post({ type: "tryapl:result", lines: typeof result === "string" ? result.split("\n") : [] });
    });
    window.Embed = { onMessage: onMessage, isEmbedded: function () { return !!embed; } };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
