// Guided HTML tutorials with checked practice tasks.
//
// Loads the .lessonstep / .lessonexec HTML lesson format (the one in
// Tutorials/*.html) into a self-contained viewer in the Learn tab — separate
// from the Jupyter-notebook stepper so the two don't interfere. Adds two block
// types: .lessontask (a checked exercise) and .lessonhint (a common-mistake
// callout that appears when a matching wrong line is submitted). Lesson list
// comes from Tutorials/index.json; completion is remembered in localStorage.
// See PLAN.md -> Phase 7.
(function () {
  "use strict";

  // ---- pure logic (unit-tested) --------------------------------------------
  function parseDoc(root) {
    var meta = root.querySelector("meta");
    var d = (meta && (meta.dataset || {})) || {};
    var out = { meta: { name: d.name || "", category: d.category || "", description: d.description || "" }, blocks: [] };
    var els = root.querySelectorAll(".lessonstep, .lessonexec, .lessontask, .lessonhint");
    Array.prototype.forEach.call(els, function (el) {
      var cls = " " + el.className + " ";
      if (/ lessonexec /.test(cls)) out.blocks.push({ kind: "exec", expr: el.textContent.trim(), auto: / autoexec /.test(cls) });
      else if (/ lessontask /.test(cls)) out.blocks.push({ kind: "task", prompt: el.getAttribute("data-prompt") || el.textContent.trim(), check: el.getAttribute("data-check") || "" });
      else if (/ lessonhint /.test(cls)) out.blocks.push({ kind: "hint", trigger: el.getAttribute("data-trigger") || "", html: el.innerHTML });
      else out.blocks.push({ kind: "prose", html: el.innerHTML });
    });
    return out;
  }
  function validateTask(expected, actual) {
    return String(expected).replace(/\s+$/gm, "").trim() === String(actual).replace(/\s+$/gm, "").trim();
  }
  function matchHints(line, blocks) {
    return blocks.filter(function (b) {
      if (b.kind !== "hint" || !b.trigger) return false;
      try { return new RegExp(b.trigger).test(line); } catch (e) { return false; }
    });
  }

  // ---- browser wiring -------------------------------------------------------
  function parseHTML(str) {
    var doc = new DOMParser().parseFromString(str, "text/html");
    return parseDoc(doc.body);
  }

  function execSilent(expr) {
    if (window.Explorer && Explorer.execSilent) return Explorer.execSilent(expr);
    var q = state.slice(); q[3] = expr;
    return postExec(q).then(function (ns) { return ns[3] || []; });
  }

  var doneKey = "lessonsDone";
  function getDone() { try { return JSON.parse(localStorage.getItem(doneKey)) || {}; } catch (e) { return {}; } }
  function markDone(file) { try { var d = getDone(); d[file] = 1; localStorage.setItem(doneKey, JSON.stringify(d)); } catch (e) {} }

  function init() {
    var loadnb = document.getElementById("loadnb");
    var learn = document.getElementById("learn");
    if (!loadnb || !learn || !window.Glyphs) return;

    // A viewer separate from #mdrender (the notebook renderer).
    var view = document.createElement("div");
    view.id = "lessonView";
    view.hidden = true;
    learn.appendChild(view);

    // "Guided tutorials" list, populated from the manifest.
    var listWrap = document.createElement("div");
    listWrap.id = "guidedList";
    var h = document.createElement("h3");
    h.textContent = "Guided tutorials";
    listWrap.appendChild(h);
    loadnb.appendChild(listWrap);

    var blocks = [];      // current lesson blocks (for hint matching)
    var currentFile = null;

    fetch("Tutorials/index.json").then(function (r) { return r.ok ? r.json() : { lessons: [] }; })
      .then(function (j) {
        (j.lessons || []).forEach(function (L) {
          var a = document.createElement("a");
          a.href = "#";
          a.className = "guided-link";
          a.textContent = L.title + (getDone()[L.file] ? "  ✓" : "");
          a.addEventListener("click", function (e) { e.preventDefault(); openLesson(L); });
          listWrap.appendChild(a);
        });
      }).catch(function () {});

    function openLesson(L) {
      fetch("Tutorials/" + L.file).then(function (r) { return r.text(); }).then(function (html) {
        var lesson = parseHTML(html);
        blocks = lesson.blocks;
        currentFile = L.file;
        render(lesson, L);
        loadnb.style.display = "none";
        view.hidden = false;
      }).catch(function () {});
    }

    function closeLesson() { view.hidden = true; loadnb.style.display = ""; }

    function runnableCode(expr) {
      var c = document.createElement("code");
      c.className = "apl lesson-run";
      c.textContent = expr;
      c.title = "Click to run in the session";
      c.addEventListener("click", function () { if (typeof submitLine === "function") submitLine("      " + expr); });
      return c;
    }

    function render(lesson, L) {
      view.textContent = "";
      var head = document.createElement("div");
      head.className = "lesson-head";
      var title = document.createElement("span"); title.textContent = lesson.meta.name || L.title;
      var close = document.createElement("button"); close.type = "button"; close.className = "lesson-close"; close.textContent = "← lessons";
      close.addEventListener("click", closeLesson);
      head.appendChild(close); head.appendChild(title);
      view.appendChild(head);

      lesson.blocks.forEach(function (b) {
        if (b.kind === "prose") {
          var d = document.createElement("div"); d.className = "lesson-prose"; d.innerHTML = b.html;
          view.appendChild(d);
        } else if (b.kind === "exec") {
          var line = document.createElement("div"); line.className = "lesson-exec";
          line.appendChild(runnableCode(b.expr));
          view.appendChild(line);
        } else if (b.kind === "task") {
          view.appendChild(taskEl(b));
        }
        // hints are not shown until triggered
      });

      var fin = document.createElement("button");
      fin.type = "button"; fin.className = "lesson-done"; fin.textContent = "Mark complete ✓";
      fin.addEventListener("click", function () { markDone(L.file); fin.textContent = "Completed ✓"; });
      view.appendChild(fin);
    }

    function taskEl(b) {
      var wrap = document.createElement("div"); wrap.className = "lesson-task";
      var p = document.createElement("div"); p.className = "lesson-task-prompt"; p.textContent = b.prompt;
      var row = document.createElement("p"); row.className = "urlInputGroup";
      var input = document.createElement("input"); input.type = "text"; input.className = "inURL apl"; input.spellcheck = false;
      var btn = document.createElement("button"); btn.type = "button"; btn.className = "run"; btn.textContent = "Check";
      var fb = document.createElement("span"); fb.className = "lesson-task-fb";
      btn.addEventListener("click", function () {
        var expr = input.value.trim();
        if (!expr) return;
        fb.textContent = "…"; fb.className = "lesson-task-fb";
        execSilent(expr).then(function (lines) {
          var actual = (lines || []).join("\n");
          if (validateTask(b.check, actual)) { fb.textContent = "✓ Correct"; fb.className = "lesson-task-fb ok"; }
          else { fb.textContent = "✗ Got: " + actual.replace(/\n/g, " / "); fb.className = "lesson-task-fb no"; }
        }).catch(function () { fb.textContent = "(could not check)"; });
      });
      row.appendChild(input); row.appendChild(btn);
      wrap.appendChild(p); wrap.appendChild(row); wrap.appendChild(fb);
      return wrap;
    }

    // Common-mistake hints: when the user submits a line matching a hint's
    // trigger, surface that hint in the viewer.
    document.addEventListener("tryapl:executed", function () {
      if (view.hidden || !blocks.length) return;
      var last = (typeof submittedLines !== "undefined" && submittedLines.length) ? submittedLines[submittedLines.length - 1] : "";
      matchHints(last, blocks).forEach(function (hb) {
        if (hb._shown) return; hb._shown = true;
        var d = document.createElement("div"); d.className = "lesson-hint"; d.innerHTML = "💡 " + hb.html;
        view.appendChild(d);
        d.scrollIntoView({ block: "nearest" });
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // Expose pure helpers for tests.
  window.Lessons = { parseDoc: parseDoc, validateTask: validateTask, matchHints: matchHints };
})();
