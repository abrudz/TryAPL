// Rich output rendering.
//
// The back-end returns only text, so rich output rides a front-end sentinel: an
// expression whose result is a character vector of the form
//     ∆RICH∆<mediatype>∆<payload>
// (mediatype ∈ svg | html | png | jpeg | gif | audio | wav | video | md | latex)
// is detected here, rendered into #richDock, and shown in the session as a short
// placeholder. Binary types carry base64 payloads. Anything else is untouched.
// Large/binary payloads are still capped by the back-end's output truncation —
// see PLAN.md "Backend-blocked items" (#6). See PLAN.md -> Phase 8.
(function () {
  "use strict";

  var RE = /^∆RICH∆([a-z]+)∆([\s\S]*)$/;

  function intercept(lines) {
    var text = (lines || []).join("\n");
    var m = RE.exec(text);
    if (!m) return null;
    return { mediatype: m[1], payload: m[2] };
  }

  function stripScripts(s) { return String(s).replace(/<script[\s\S]*?<\/script\s*>/gi, ""); }

  function dock() { return document.getElementById("richDock"); }
  function body() { return document.getElementById("richDockBody"); }

  function show() { var d = dock(); if (d) d.hidden = false; }
  function clear() { var b = body(); if (b) b.textContent = ""; var d = dock(); if (d) d.hidden = true; }

  var DATA = { png: "image/png", jpeg: "image/jpeg", gif: "image/gif", wav: "audio/wav", audio: "audio/wav", video: "video/mp4" };

  function renderInto(el, mt, payload) {
    if (mt === "svg") {
      el.innerHTML = stripScripts(payload);
    } else if (mt === "html") {
      var f = document.createElement("iframe");
      f.setAttribute("sandbox", ""); // no scripts, no same-origin: static render only
      f.srcdoc = payload;
      el.appendChild(f);
    } else if (mt === "png" || mt === "jpeg" || mt === "gif") {
      var img = document.createElement("img");
      img.src = "data:" + DATA[mt] + ";base64," + payload;
      img.alt = "rich output";
      el.appendChild(img);
    } else if (mt === "audio" || mt === "wav") {
      var au = document.createElement("audio");
      au.controls = true;
      au.src = "data:" + DATA[mt] + ";base64," + payload;
      el.appendChild(au);
    } else if (mt === "video") {
      var v = document.createElement("video");
      v.controls = true;
      v.src = "data:" + DATA.video + ";base64," + payload;
      el.appendChild(v);
    } else if (mt === "md") {
      if (window.marked && (marked.parse || typeof marked === "function")) {
        el.innerHTML = stripScripts((marked.parse || marked)(payload));
      } else {
        var pre = document.createElement("pre"); pre.textContent = payload; el.appendChild(pre);
      }
      typesetMath(el);
    } else if (mt === "latex") {
      el.textContent = payload;
      typesetMath(el);
    } else {
      var p = document.createElement("pre"); p.textContent = payload; el.appendChild(p);
    }
  }

  function typesetMath(el) {
    try { if (window.MathJax && MathJax.typeset) MathJax.typeset([el]); } catch (e) {}
  }

  function render(rich) {
    var b = body();
    if (!b) return;
    var item = document.createElement("div");
    item.className = "rich-item";
    var tag = document.createElement("span");
    tag.className = "rich-tag";
    tag.textContent = rich.mediatype;
    var content = document.createElement("div");
    content.className = "rich-content";
    try { renderInto(content, rich.mediatype, rich.payload); }
    catch (e) { content.textContent = "(could not render " + rich.mediatype + ")"; }
    item.appendChild(tag);
    item.appendChild(content);
    b.appendChild(item);
    show();
    b.scrollTop = b.scrollHeight;
  }

  function init() {
    var c = document.getElementById("richDockClear");
    if (c) c.addEventListener("click", clear);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.RichOutput = { intercept: intercept, render: render, clear: clear };
})();
