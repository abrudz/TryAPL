// Workspace explorer / inspector (File tab).
//
// Lists the variables, functions, and operators in the current workspace and,
// on click, shows a value or definition. It drives the back-end's existing
// whitelisted commands ()vars/)fns/)ops, ]display, ⎕CR) through the shared
// postExec, so it needs no back-end change. Queries are read-only: they never
// touch the session, history, localStorage, or the global `state`.
// See PLAN.md -> Phase 4.
(function () {
  "use strict";

  function init() {
    var tree = document.getElementById("wsExplorerTree");
    var detail = document.getElementById("wsExplorerDetail");
    var refreshBtn = document.getElementById("wsExploreRefresh");
    var fileTab = document.getElementById("fileTab");
    var filePane = document.getElementById("file");
    if (!tree || !detail || typeof postExec !== "function") return;

    // Run a command against the current workspace without disturbing the
    // session/history/localStorage or the global `state` (send a copy, keep
    // only the result lines).
    function execSilent(expr) {
      var q = state.slice();
      q[3] = expr;
      return postExec(q).then(function (ns) { return ns[3] || []; });
    }

    var GROUPS = [
      { key: "Variables", cmd: ")vars", detail: function (n) { return "]display " + n; } },
      { key: "Functions", cmd: ")fns",  detail: function (n) { return "⎕CR'" + n + "'"; } },
      { key: "Operators", cmd: ")ops",  detail: function (n) { return "⎕CR'" + n + "'"; } },
    ];

    // Listings come back as space-padded columns; names contain no spaces.
    function names(lines) { return (lines || []).join(" ").split(/\s+/).filter(Boolean); }

    function showDetail(name, cmd) {
      detail.textContent = "…"; // ellipsis while loading
      execSilent(cmd).then(function (lines) {
        detail.textContent = (lines || []).join("\n");
      }).catch(function () { detail.textContent = "(unavailable)"; });
    }

    var busy = false;
    function refresh() {
      if (busy) return Promise.resolve();
      busy = true;
      return Promise.all(GROUPS.map(function (g) {
        return execSilent(g.cmd).then(names).catch(function () { return []; });
      })).then(function (results) {
        tree.textContent = "";
        var any = false;
        GROUPS.forEach(function (g, i) {
          var ns = results[i];
          if (!ns.length) return;
          any = true;
          var h = document.createElement("h4");
          h.textContent = g.key + " (" + ns.length + ")";
          tree.appendChild(h);
          ns.forEach(function (n) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "wsName";
            b.textContent = n;
            b.addEventListener("click", function () { showDetail(n, g.detail(n)); });
            tree.appendChild(b);
          });
        });
        if (!any) { tree.textContent = "Workspace is empty."; detail.textContent = ""; }
      }).then(function () { busy = false; }, function () { busy = false; });
    }

    if (refreshBtn) refreshBtn.addEventListener("click", refresh);
    if (fileTab) fileTab.addEventListener("click", refresh);
    // Auto-refresh after each execution, but only while the File tab is visible.
    document.addEventListener("tryapl:executed", function () {
      if (filePane && filePane.classList.contains("active")) refresh();
    });

    window.Explorer = { refresh: refresh, execSilent: execSilent };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
