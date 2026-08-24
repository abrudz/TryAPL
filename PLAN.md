# TryAPL v4 — Front-End Implementation Plan

## Context

TryAPL (`/workspace/TryAPL`, clone of `abrudz/TryAPL`, powers [tryapl.org](https://tryapl.org)) is a browser-based APL REPL. Two Dyalog discussions drive this work:

- **[TryAPL v4 (#85)](https://github.com/Dyalog/TryAPL/discussions/85)** — a broad wishlist to modernize the site: interactive help, APLCart integration, a keyword search, a workspace explorer, an examples carousel, richer tutorials, rich output (graphics/SVG/audio), an embeddable widget, and a better glyph-input system.
- **[OSS-Projects #10](https://github.com/Dyalog/OSS-Projects/discussions/10)** — a GSoC-sized project for a **mobile-first** front end with a fully JavaScript-managed input system (on-screen ASCII+APL keyboard).

**Scope decided with the user:** an *incremental*, **front-end-only**, **vanilla-JS** implementation of the full v4 wishlist. **No frameworks** (no React/Svelte), minimal new libraries. **The backend is frozen** — `TryAPL.apln` (Jarvis), the `POST /Exec` protocol, and the Docker Swarm deploy stay unchanged.

**Outcome:** a modernized, mobile-usable TryAPL front end shipped feature-by-feature, each independently deployable via the existing `master → staging → live` CI, with the current REPL never regressing.

### Current architecture (established by code exploration)

- **Single `<textarea id="session">`** (`index.html:476`) is the whole REPL — output and input as one plain-text buffer. Everything in `lib/tryapl.js` manipulates `session.value` / `session.selectionStart` (input collection, multiline `\t` continuation, history recall, `permaLink`, the four cursor-position branches in `jarvisProcess`). **A textarea cannot host DOM/SVG/img** — this is the central constraint for rich output.
- **`state = [ws, 0, id, expr]`**; `jarvisProcess()` (`lib/tryapl.js:365-427`) POSTs `JSON.stringify(state)` to `Exec`; response `state[3]` is an array of result-text lines appended to the textarea.
- **Backend limits (frozen):** output truncated at ~1000 cols / ~100 rows (`TryAPL.apln:246-251`); `Format` rejects rank/depth > 5; only the single result *value* is formatted (mid-statement `⎕←`, `⍞←`, implicit output unsupported — `index.html:421`). Expressions run against a Safe3 whitelist.
- **Whitelisted user commands already exist:** `)vars )fns )ops ]state ]display ]defs ]help` return formatted text — the basis for the explorer with zero backend change.
- **Glyph input** lives entirely in `lib/tiolb.js` (one golfed IIFE): `tcs`→`tc` (Tab completion), `bqk`/`bqv`→`bqc` (prefix mode; trigger keys **hard-coded** as `` "`½²^º§ùµ°" ``), `lbs` (language-bar buttons). Insertion via a `mousedown`/`selectionStart` splice.
- **Glyph help** (`glyphHelp`, `lib/tryapl.js:465`) parses `assets/elements.h` (`NAME`/`CHAR`/`TIP`, ~80 glyphs w/ examples) and **appends into the session** (destructive).
- **`lib/jupyter.js`** owns a rich-render pipeline: `#mdrender` div + `marked` + MathJax + texme, appending DOM per notebook cell — the reusable substrate for rich output. Tabs via `showTab(id)`.
- **Responsiveness is a JS hack:** no media queries; `checkPaneWidth(w)` (threshold 395px) toggles tab text/icons; layout depends on `.split{float:left}` + Split.js inline widths + `.ngn_lb{position:fixed}` with JS-computed `body.marginTop`/heights in `tiolb.js:upd()`.
- **No build step:** files served statically from repo root by Jarvis. New `<script type="module">` and new files "just work." Version string hard-coded at `lib/tryapl.js:2` (`3.8.1`).
- **Local run:** `docker compose up` → `http://localhost:8080` (or `dyalog LOAD=/path/TryAPL.apln`).

---

## Architectural approach

Add a small **additive ES-module layer under `lib/`**. Legacy `tryapl.js` / `jupyter.js` / `tiolb.js` keep running as globals; new `<script type="module">` files read/attach to `window.*` and call existing globals rather than rewriting them. Two small, safe enabling refactors unlock most features:

1. **`postExec(state) → Promise<lines>`** — extract the XHR core of `jarvisProcess` (`lib/tryapl.js:365-427`) so both the REPL and new features (explorer, embed) share one request path. `jarvisProcess` behavior stays byte-identical.
2. **`lib/glyphs.js`** — a shared **glyph model**: move `tcs`/`bqk`/`bqv`/`lbs` string constants and the `elements.h` parser out of `tiolb.js`/`tryapl.js` into one importable module (exposed as `window.Glyphs`) with `tc`, `bqc`, reverse maps `glyphToPrefix`/`glyphToTab`, `loadElements()`, and a single `insertGlyph(target, str)` used by *every* insertion path (language bar, on-screen keyboard, completion, search).

**Non-negotiable invariant:** when a new feature is inactive, the `#session` textarea path (selection math, multiline, history, `jarvisProcess`'s four cursor branches) must behave **byte-for-byte** as today. Regression-check `session.value` for `2+2`, a multiline dfn, `)clear`, and `↑` history recall after every change.

All rich rendering reuses the `#mdrender` + `marked` + MathJax pipeline from `jupyter.js`. All new overlays reuse the existing `.modal` and `--main-col` / `.b` (dark-mode) CSS conventions.

---

## Phase 0 — Enabling refactors (land first, ship alone)

- Extract **`postExec`** from `jarvisProcess` (`lib/tryapl.js`). No behavior change.
- Create **`lib/glyphs.js`** and repoint `tiolb.js` + `tryapl.js` at it. **Highest-risk step** — `tc`/`bqc` are golfed with a reverse-order fill loop and special `\\` handling; relocate the string constants and build loops *verbatim*, then byte-diff the generated `tc`/`bqc` maps against the current runtime (`JSON.stringify` before/after).
- **Verify:** Tab (`<-`→`←`), prefix (`` ` ``+`r`→`⍴`), language-bar click, and Primer glyph help all behave identically. No visual change.

## Phase 1 — Glyph input overhaul + on-screen keyboard *(#10, mobile-critical)*

New **`lib/keyboard.js`** + markup + `style.mobile.css`.

- A static **layout descriptor** (rows of `{unshifted, shifted, aplUnshifted, aplShifted}`), with APL legends **derived from `Glyphs.bqc`** so on-screen keys and prefix input share one source of truth.
- **`#oskb`** — tappable key grid appended near `#replBar`; each key inserts via `Glyphs.insertGlyph(activeTarget,…)` (active target tracked by reusing `tiolb.js`'s focus handler `ff`); APL/ASCII legend toggle. CSS grid sized in `dvh`, sticky at viewport bottom on touch/narrow, off by default on desktop (language-bar toggle).
- **Configurable prefix key:** replace hard-coded `` "`½²^º§ùµ°" `` — add `getPrefixKeys()`/`setPrefixKeys()` in `glyphs.js` backed by `localStorage.prefixKeys` (default = current string). `tiolb.js:fk` reads it. Small settings control (File tab / gear).
- **Keep the single `#session` textarea** on mobile — the on-screen keyboard becomes the primary input (it calls the same `insertGlyph` the code already expects); `#oneLineInput` remains the smallest-screen fallback. Do **not** re-architect the REPL.
- **Verify:** on a 360px viewport, APL keyboard appears and inserts into the focused field; changing the prefix key updates live prefix input; desktop unchanged unless toggled on.

## Phase 2 — Keyboard map + Ctrl+Space keyword search *(#85)*

- **`#kbmap`** — the same Phase-1 descriptor rendered as a read-only reference diagram (which glyph sits on which key per prefix); clicking a key opens help. Legend follows the configurable prefix setting.
- **`lib/palette.js`** — a command-palette overlay on **Ctrl+Space** (register in capture phase + `preventDefault`; guard on `e.code==='Space' && e.ctrlKey` to avoid the broad document keydown in `tryapl.js`). Index = `Glyphs.loadElements()` (name/keywords) + APLCart keywords once loaded (Phase 5). ~30-line self-contained fuzzy scorer (subsequence match, rank by contiguity — no library). Per row: **Insert** (`insertGlyph` into last-focused field) and **Help** (Phase 3). ↑/↓/Enter/Esc; restore focus on close. Reuse `.modal` styling.
- **Verify:** Ctrl+Space → type "reshape"/"rho" → `⍴` surfaces → Enter inserts at cursor; Esc restores session focus.

## Phase 3 — Interactive help pages *(#85)*

New **`lib/help.js`** + a non-destructive **`#helpview`** panel (replaces the session-inserting `glyphHelp` as the default).

- Render from `Glyphs.loadElements()`: glyph, names, monadic/dyadic sections, and **worked examples as clickable `code.apl`** (reuse `jupyter.js`'s existing `code.apl`→`replaceLine` wiring so examples run in the session). Show Tab/Prefix input methods from `glyphToTab`/`glyphToPrefix`.
- **"Full documentation" deep link** to the exact help.dyalog.com page via the APLCart `DOCS` column (Phase 5).
- Entry points: Primer glyph buttons (rewire from `glyphHelp`), palette Help action, keyboard-map key clicks. Keep old in-session `glyphHelp` behind an option.
- **Verify:** clicking a Primer glyph opens a formatted card with runnable examples and a working docs link.

## Phase 4 — Workspace explorer / inspector *(#85)*

New **`lib/explorer.js`** + a new left-pane **"Workspace" tab** (copy the `#tabs` button + `.content` div pattern; `showTab` already handles arbitrary ids).

- **`execSilent(expr)`** — wraps Phase-0 `postExec` to run a command *without* touching `session` / `submittedLines` / `localStorage` / focus. Drive the existing whitelisted commands: `)vars`/`)fns`/`)ops` for names (split on whitespace runs — names have no spaces), `]display name` / `]defs name` for detail.
- Tree of Vars/Fns/Ops → click a name → detail pane (`<pre class="apl">`); click-to-insert via `replaceLine`. `refresh()` after each non-shy user submission. **Serialize explorer calls behind `session.disabled`** so they don't clobber the shared `state` global mid-submission.
- **Verify:** define `x←⍳5` + a dfn → Workspace tab lists them → clicking `x` shows `]display x`; the session transcript and `submittedLines` are untouched.

## Phase 5 — APLCart integration *(#85)*

New **`lib/aplcart.js`** + an APLCart panel (sub-panel of Links/Primer or its own tab).

- **Lazy-fetch** `https://aplcart.info/table.tsv` on first use (858 KB, CORS `*`, `max-age=600`) — never at page load. Columns: `SYNTAX DESCRIPTION CLASS TYPE GROUP CATEGORY KEYWORDS TIO DOCS`. Cache parsed result in memory. Ship a **CI-refreshed vendored fallback** `assets/aplcart.tsv` for offline/site-down.
- Reuse the Phase-2 fuzzy matcher over `syntax + description + keywords`. Row actions: **Insert syntax** (`insertGlyph`), **Open docs** (`DOCS`→help.dyalog.com), **Run on TIO** (`TIO`). Feeds the Ctrl+Space palette as a second index once loaded.
- **Verify:** search "unique" → aplcart phrases; insert drops syntax into session; docs opens; kill network → vendored fallback works.

## Phase 6 — Examples carousel *(#85)*

New **`lib/carousel.js`**, placed in the Intro tab / above the session.

- Data: harvest the existing Intro `.hiTable` `code.apl` examples + a curated set (optionally random APLCart entries once Phase 5 loads). CSS scroll-snap or tiny index+transform (no library). Each card: clickable expression (reuse `code.apl`→`replaceLine`) + one-line note; prev/next + pausable auto-advance; `--main-col`/`.b` theming.
- **Verify:** cards rotate; clicking one loads it into the session ready to run; works in dark mode at mobile width.

## Phase 7 — Linear tutorials + practice problems *(#85)*

Extend the Learn tab (currently notebook-only) to also load the orphaned **`.lessonstep`/`.lessonexec` HTML format** (`Tutorials/Functions.html`).

New **`lib/lessons.js`** (or extend `jupyter.js`).

- Generalize `jupyter.js`'s step machinery (`currentBook.cells`, `nbNext`, `#learnButtons`, `#mdrender`) to a common `steps[]` interface accepting both notebook cells and parsed HTML lessons. `.lessonexec` runs via `submitLine`; `code.apl` spans reuse click→`replaceLine`.
- **Linear progression:** add `Tutorials/index.json` (ordered lessons + prerequisites); render as an ordered list; track completion in `localStorage`.
- **Practice problems + common-mistake hints:** new block types — `<div class="lessontask" data-check="…">` (validate the user's answer by comparing Jarvis's `state[3]`, or by sending a checker expression through `execSilent` — backend unchanged) and `<div class="lessonhint" data-trigger="…">` firing a callout on a known wrong-input regex.
- **Verify:** a new/extended HTML lesson loads with working next/prev, a runnable cell, one validated task, and a mistake hint that fires on known bad input.

## Phase 8 — Rich output rendering *(#85 — largest/riskiest)*

New **`lib/richout.js`** + a **`#richDock`** region in the `#rightPane` flexbox (between `#session` and `#replBar`, collapsible, `max-height:40%`, dark-mode via `.b`).

**Strategy — keep the textarea; add a dock + sentinel protocol (do NOT migrate off `<textarea>` now).** Full contenteditable migration would require rewriting ~15 selection/caret functions across three files and would block every other feature; defer it to a gated `?transcript=1` spike, off the critical path.

- **Sentinel protocol (front-end only):** the user's APL returns a *value* the front end recognizes, e.g. result starting `∆RICH∆<mediatype>∆<payload>` where mediatype ∈ `svg|html|png|audio|wav|md|latex`. Provide APL helper snippets (Intro/Help) so users emit these (e.g. a `Plot` dfn returning `'∆RICH∆svg∆',svg`). No backend change — it's just a returned value.
- **Detection:** in the `jarvisProcess` success branch (`lib/tryapl.js:377`), before the append logic, call `RichOutput.intercept(state[3])`. No sentinel → behave exactly as today. Sentinel → append a compact placeholder line (`[rich: svg ↓]`, so scroll/history math is unaffected) **and** render the payload into `#richDock`.
- **Renderers:** `svg`→sanitized `innerHTML`; `html`→sandboxed `<iframe srcdoc>`; `png/jpeg`→`<img data:>`; `audio/wav`→`<audio controls>`; `video`→`<video>`; `md`/`latex`→reuse `marked` + `window.MathJax.typeset()` exactly as `jupyter.js:228-233`. "Text-based drawing" already renders in the mono textarea — add an optional `<pre>` dock view for wide art.
- **Verify:** returning a small SVG sentinel renders in the dock; ordinary results (`2+2`, dfn, `)clear`, history) are byte-identical in the textarea; dark mode / split-resize / `sessionFS` still lay out with the dock present.

## Phase 9 — Mobile-first responsive CSS; retire the JS width hack *(#10)*

New **`style.mobile.css`** (linked after `style.css`), landed alongside Phase 1.

- Move `checkPaneWidth`'s icon/text toggle into `@media (max-width:395px)` / `@container`; make the JS function a no-op shim, then remove callers.
- **Desktop keeps Split.js**; mobile switches to a stacked single-column layout — override `.split{float:left}` and Split.js inline widths inside the media query (`!important` or a `matchMedia` handler that `destroy`s/suspends Split on mobile). Coordinate so desktop/mobile layouts don't fight on rotation.
- Replace `100vh` with `100dvh`/`svh`; migrate `.ngn_lb{position:fixed}` + JS `body.marginTop` juggling toward CSS (sticky flex row). Dock `#oskb`/`#replBar` at the bottom with safe-area insets.
- Sequence: add media queries (additive) first, then remove each JS layout line once its CSS equivalent is verified — never break mid-refactor.
- **Verify:** disable the JS shim → CSS-only reflow at 360px, no horizontal scroll, all controls usable; desktop split-drag still works.

## Phase 10 — Smaller v4 items

- **Embeddable widget:** `?embed=1`/`?minimal` mode parsed in `loadTryAPL` (`lib/tryapl.js:168`) + `window.onload` — hide `#leftPane`/`#tabs`/`#linkIcon`, set split `[0,100]`, honor existing `?q=`/`?run`/`?ws=`. **`lib/embed.js`**: documented iframe snippet + `postMessage` API (`tryapl:exec`/`set`/`clear` in, `tryapl:result` out from Phase-0 `postExec`), **origin-allowlisted**.
- **System functions (⎕-names) in the language bar:** generalize the `tiolb.js` `mousedown` insertion from single-char `textContent` to a `data-insert` attribute; add a quad-name palette (`⎕JSON`, `⎕UCS`, `⎕R`, `⎕NULL`, …) whose list is **sourced from the Primer tab's supported set** (`index.html:422`) so it never offers a whitelist-rejected name. Extend tooltip help.
- **Desktop-version install link:** add to the Help tab "About" section (`index.html:415`) an `<a target="_blank">` to `https://dyalog.com/download-zone.htm` (URL already used at `index.html:46`). Trivial, no JS — good first ship.

---

## Backend-blocked items (front-end scaffolding only; flag as follow-ups)

The backend is frozen, so these ship as much front end as possible now, with an explicit backend ask:

- **Large / binary rich payloads (Phase 8):** the ~1000-col/100-row truncation and rank/depth-5 limit cap payload size. Front end ships the sentinel detector, renderers, and a chunk-reassembly protocol (`∆RICH∆svg∆<n>/<m>∆…`). **Backend follow-up:** skip truncation when a result starts with the rich sentinel, or add a whitelisted `]render` command returning untruncated payload.
- **`⎕NULL` and system-function behavior:** typing/inserting the tokens is front end; whether they *evaluate* is Safe3-whitelist-governed. **Verify current status locally**; if disallowed, backend follow-up adds them to the whitelist.
- **`⎕IMPORT` script + REPL combination (#85):** genuinely backend — out of scope; note as future work.
- **iframe embedding (Phase 10):** third-party framing needs `X-Frame-Options`/CSP headers — a Jarvis/deploy (ops) config, not front-end code.
- **APLCart vendored fallback refresh (Phase 5):** a CI step to periodically re-vendor `assets/aplcart.tsv`.

---

## Suggested sequencing

Phase 0 first (unlocks everything). Then the quick wins — the Help download link and language-bar quad-names (Phase 10 subset) — for immediate value. Then the input/help/search stack (1→2→3), which the mobile CSS (Phase 9) should accompany. Phases 4 (explorer), 5 (APLCart), 6 (carousel), 7 (tutorials) are largely independent and can proceed in parallel after Phase 0. Phase 8 (rich output) last among the big items; the embed widget can slot in whenever Phase 0 is done.

## Cross-cutting risks

- **Golfed legacy code** (`tiolb.js`, `tryapl.js`): the Phase-0 `tc`/`bqc` extraction is the sharpest edge — relocate verbatim and byte-diff.
- **Shared `state` global** carries the workspace; serialize explorer/embed `execSilent` behind `session.disabled`.
- **Global keydown collisions:** the document handler in `tryapl.js` is broad (Enter/Home/Esc/history); new shortcuts must use capture phase + exact-key guards + `preventDefault`.
- **Duplicate globals** (`$`, `$$`, `newLine`, `expr`): new modules define their own locals, never clobber.
- **Injection:** sanitize SVG/HTML sentinel payloads; render untrusted HTML only in a sandboxed iframe.

## Files

Modify: `index.html` (new tabs/panels, `#richDock`, embed hooks, Help link), `style.css` + new `style.mobile.css`, `lib/tryapl.js` (`postExec`, sentinel hook, `?embed`, `execSilent`), `lib/tiolb.js` (glyph-model imports, `data-insert` insertion), `lib/jupyter.js` (generalized step machinery, embed layout).

New modules: `lib/glyphs.js`, `lib/keyboard.js`, `lib/palette.js`, `lib/help.js`, `lib/explorer.js`, `lib/aplcart.js`, `lib/carousel.js`, `lib/lessons.js`, `lib/richout.js`, `lib/embed.js`. Data: `Tutorials/index.json`, vendored `assets/aplcart.tsv`.

## Verification

No build step — edit and hard-reload against `docker compose up` (`http://localhost:8080`, live Jarvis backend). Per phase, run the acceptance checks listed above. The universal regression gate for **every** change: `2+2`, a multiline dfn definition, `)clear`, and `↑`/`↓` history recall must produce a byte-identical `#session` when the new feature is inactive. Bump `tryaplversion` (`lib/tryapl.js:2`) as features land. Promote through `master → staging` (check `staging.tryapl.org` in Jenkins) → `live`.
