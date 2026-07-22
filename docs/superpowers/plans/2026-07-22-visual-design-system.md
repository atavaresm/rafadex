# RafaDex Visual Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the TCG-inspired visual design system from `docs/superpowers/specs/2026-07-22-visual-design-system-design.md`: gradient backgrounds, circular type badges, and corner info pills, applied to the Home type buttons, the type-world grid cards, and the detail screen.

**Architecture:** Same vanilla JS/CSS app as before — everything lands in the existing `app.js` and `style.css`. Two small, reused JS helpers (a hex color shader and a gradient-string builder) are added once and consumed by every screen this round touches; no new files, no new data, no pipeline changes.

**Tech Stack:** Vanilla JS/CSS, no framework/bundler (unchanged).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-22-visual-design-system-design.md` (approved via visual brainstorming).
- Non-goals from the spec: no hard card-frame border; no custom-drawn icon set (type icons stay the existing emoji, only their container changes); no change to Rafael-facing interaction (arrows, swipe, favorites, evolution strip, game, audio, sticky header, scroll restore); no change to the 18 type base colors in `window.TYPES`.
- Gradient formula (exact, from the spec): `lighten(channel, pct) = channel + (255 - channel) * pct` with `pct = 0.35` for the light stop; `darken(channel, pct) = channel * (1 - pct)` with `pct = 0.25` for the dark stop. Rectangular surfaces use `linear-gradient(160deg, light 0%, C 55%, dark 100%)`; circular badges use `radial-gradient(circle at 30% 30%, light, C 60%, dark)`.
- Pill styling: white/cream background (`rgba(255,255,255,.92)`), text in the app's existing brand red (`var(--red)`, `#e3350d`) — one fixed color for all pills regardless of type, not a per-type shade.
- Corner info layout (both detail screen and grid card): number+generation on the left, type badge(s) + power in a single horizontal row on the right — never a vertical stack, so it can't grow tall enough to overlap the sprite.
- The sticky topbar (`position: sticky`, solid `var(--bg)` background, from the v1.2 round) is **unchanged** — the gradient applies to the page body behind/below it, not to the topbar strip itself. Do not touch `.topbar`'s own `background` property.
- Git flow: feature branch off `develop`, PR-merge into `develop`, then a final PR `develop` → `master` (existing GitHub Actions workflow auto-deploys).
- Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- No Python/pipeline changes this round — this is frontend-only, so no `pytest` additions; verification is live-browser only, per house rule ("green tests are not enough").

---

### Task 1: Color-shading and gradient helpers

**Files:**
- Modify: `app.js` (add helpers right after the existing `el`/`sprite`/`go` functions)

**Interfaces:**
- Produces: `shadeColor(hex, percent) -> string` (hex color, lightened if `percent >= 0` toward white, darkened if `percent < 0` toward black); `typeGradient(hex, shape) -> string` (a CSS `linear-gradient(...)` string by default, or `radial-gradient(...)` when `shape === "radial"`); `typeBadgeHtml(typeKey, sizePx) -> string` (a `<span class="type-badge">` HTML fragment sized and gradient-filled for that type, wrapping the existing emoji); `pill(text) -> HTMLElement` (a `<span class="pill">` DOM node). All four are used by every later task in this plan.

- [ ] **Step 1: Add the helpers**

In `app.js`, find:

```javascript
function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}
function sprite(id, kind) { return `assets/sprites/${kind}/${id}.webp`; }
function go(hash) { location.hash = hash; }
```

Replace with:

```javascript
function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}
function sprite(id, kind) { return `assets/sprites/${kind}/${id}.webp`; }
function go(hash) { location.hash = hash; }

function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  if (percent >= 0) {
    r = Math.round(r + (255 - r) * percent);
    g = Math.round(g + (255 - g) * percent);
    b = Math.round(b + (255 - b) * percent);
  } else {
    r = Math.round(r * (1 + percent));
    g = Math.round(g * (1 + percent));
    b = Math.round(b * (1 + percent));
  }
  return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
}

function typeGradient(hex, shape) {
  const light = shadeColor(hex, 0.35);
  const dark = shadeColor(hex, -0.25);
  if (shape === "radial") return `radial-gradient(circle at 30% 30%, ${light}, ${hex} 60%, ${dark})`;
  return `linear-gradient(160deg, ${light} 0%, ${hex} 55%, ${dark} 100%)`;
}

function typeBadgeHtml(typeKey, sizePx) {
  const info = window.TYPES[typeKey];
  return `<span class="type-badge" style="width:${sizePx}px;height:${sizePx}px;` +
    `font-size:${Math.round(sizePx * 0.55)}px;background:${typeGradient(info.color, "radial")}">${info.emoji}</span>`;
}

function pill(text) { return el("span", "pill", text); }
```

- [ ] **Step 2: Syntax check**

Run: `node --check app.js` — Expected: no output (pass).

- [ ] **Step 3: Live verification (color math)**

Serve the app (`python3 -m http.server 8000`), open the browser console:

```javascript
`${shadeColor("#f08030", 0.35)} | ${shadeColor("#f08030", -0.25)} | ${typeGradient("#f08030")} | ${typeGradient("#f08030", "radial")}`
```

Expected: `#f5ac78 | #b46024 | linear-gradient(160deg, #f5ac78 0%, #f08030 55%, #b46024 100%) | radial-gradient(circle at 30% 30%, #f5ac78, #f08030 60%, #b46024)`.

- [ ] **Step 4: Commit**

```bash
git checkout -b feat/visual-design-system
git add app.js
git commit -m "feat: color-shading and gradient helper functions

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Home type buttons — gradient + bigger icon

**Files:**
- Modify: `app.js` (`renderHome`'s type-grid loop)
- Modify: `style.css` (`.type-btn .emoji`)

**Interfaces:**
- Consumes: `typeGradient(hex)` from Task 1.

- [ ] **Step 1: Use the gradient instead of the flat color**

In `app.js`, find:

```javascript
  for (const [key, info] of Object.entries(window.TYPES)) {
    const btn = el("button", "type-btn bounce",
      `<span class="emoji">${info.emoji}</span><span class="label">${info.name}</span>`);
    btn.style.background = info.color;
    btn.onclick = () => go(`#type/${key}`);
    grid.append(btn);
  }
```

Replace with:

```javascript
  for (const [key, info] of Object.entries(window.TYPES)) {
    const btn = el("button", "type-btn bounce",
      `<span class="emoji">${info.emoji}</span><span class="label">${info.name}</span>`);
    btn.style.background = typeGradient(info.color);
    btn.onclick = () => go(`#type/${key}`);
    grid.append(btn);
  }
```

- [ ] **Step 2: Enlarge the icon**

In `style.css`, find:

```css
.type-btn .emoji { font-size: 44px; }
```

Replace with:

```css
.type-btn .emoji { font-size: 56px; }
```

- [ ] **Step 3: Syntax check**

Run: `node --check app.js` — Expected: no output (pass).

- [ ] **Step 4: Live verification**

Serve the app, open Home. Confirm every one of the 18 type tiles now shows a diagonal gradient (light top-left to dark bottom-right) instead of a flat color, and the emoji reads noticeably larger relative to the tile than before.

- [ ] **Step 5: Commit**

```bash
git add app.js style.css
git commit -m "feat: gradient background and larger icon for Home type buttons

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Shared topbar gradient tint + pill/badge base styles

**Files:**
- Modify: `app.js` (`topbar` function)
- Modify: `style.css` (new `.pill`, `.type-badge`, `.topbar.split` rules)

**Interfaces:**
- Consumes: `typeGradient(hex)` from Task 1.
- Produces: `topbar(title, backHash, tint, rightContent)` — `rightContent` is a new, optional 4th parameter (a DOM node). When provided, it replaces the title text and is rendered right-aligned (back button on the left, `rightContent` on the right); when omitted, `topbar` behaves exactly as before (title text next to the back button). This is backward compatible — every existing 3-argument call site (`renderType`, `renderGame`) is unaffected. Task 4 is the only caller that will use the 4th argument.

- [ ] **Step 1: Extend `topbar` and switch its tint to a gradient**

In `app.js`, find:

```javascript
function topbar(title, backHash, tint) {
  const bar = el("div", "topbar");
  const back = el("button", "back-btn bounce", "⬅️");
  back.onclick = () => go(backHash);
  bar.append(back, el("span", "title", title));
  if (tint) document.body.style.background = tint + "33";
  return bar;
}
```

Replace with:

```javascript
function topbar(title, backHash, tint, rightContent) {
  const bar = el("div", "topbar");
  const back = el("button", "back-btn bounce", "⬅️");
  back.onclick = () => go(backHash);
  bar.append(back);
  if (rightContent) {
    bar.classList.add("split");
    bar.append(rightContent);
  } else {
    bar.append(el("span", "title", title));
  }
  if (tint) document.body.style.background = typeGradient(tint);
  return bar;
}
```

(This changes the type-world screen, the detail screen, and the game screen's page-body tint from a pale 20%-alpha wash to a bold opaque gradient, since all three call `topbar` with a `tint` argument through this one shared function — exactly the spec's intent, not a per-screen special case.)

- [ ] **Step 2: Add the pill, type-badge, and split-topbar styles**

In `style.css`, find:

```css
.sound-row button.speaking { background: var(--red); color: #fff; }
```

Add immediately after it:

```css
.pill { background: rgba(255,255,255,.92); border-radius: 12px; padding: 3px 9px;
  font-weight: 800; font-size: 12px; color: var(--red); box-shadow: 0 2px 0 rgba(0,0,0,.1);
  white-space: nowrap; }
.type-badge { border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 0 rgba(0,0,0,.15); flex-shrink: 0; }
.topbar.split { justify-content: space-between; }
```

- [ ] **Step 3: Syntax check**

Run: `node --check app.js` — Expected: no output (pass).

- [ ] **Step 4: Live verification**

Serve the app, open `#type/fire`. Confirm the page background behind the sticky topbar is now a bold orange gradient (not a pale wash), the topbar strip itself stays solid cream (`var(--bg)`, unchanged), and the back button + "🔥 Fogo" title still render exactly as before (3-argument call site unaffected). Open `#game` and confirm its yellow tint is now also a gradient, and "❓" still shows as the title.

- [ ] **Step 5: Commit**

```bash
git add app.js style.css
git commit -m "feat: gradient tint for topbar, pill and type-badge base styles

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Detail screen — corner pills and type badges

**Files:**
- Modify: `app.js` (start of `renderDetail`)
- Modify: `style.css` (`.type-power-row`, `.detail .mon-name`)

**Interfaces:**
- Consumes: `topbar(title, backHash, tint, rightContent)` (Task 3), `pill(text)`, `typeBadgeHtml(typeKey, sizePx)`, `typeGradient(hex)` (Task 1).
- Produces: the detail screen's header row is now back-button + `#NNN · GX` pill (via `topbar`'s `rightContent`); a new row directly below shows the Pokémon's type badge(s) + power pill, right-aligned, before the hero sprite.

- [ ] **Step 1: Replace the detail screen's header construction**

In `app.js`, find:

```javascript
function renderDetail(id) {
  const mon = byId[id];
  if (!mon) return go("#home");
  if (!contextIds.length) contextIds = window.DEX.map(m => m.id);
  const tint = window.TYPES[mon.types[0]].color;
  elApp.innerHTML = "";
  elApp.append(topbar(mon.types.map(t => window.TYPES[t].emoji).join(" "),
    `#type/${mon.types[0]}`, tint));
  const box = el("div", "detail");
```

Replace with:

```javascript
function renderDetail(id) {
  const mon = byId[id];
  if (!mon) return go("#home");
  if (!contextIds.length) contextIds = window.DEX.map(m => m.id);
  const tint = window.TYPES[mon.types[0]].color;
  elApp.innerHTML = "";
  const numStr = String(id).padStart(3, "0");
  elApp.append(topbar("", `#type/${mon.types[0]}`, tint, pill(`#${numStr} · G${mon.gen}`)));
  const typeBadges = mon.types.map(t => typeBadgeHtml(t, 26)).join("");
  elApp.append(el("div", "type-power-row", `${typeBadges}<span class="pill">${mon.power}</span>`));
  const box = el("div", "detail");
```

- [ ] **Step 2: Style the new row and make the name legible over the gradient**

In `style.css`, find:

```css
.detail .mon-name { font-size: 32px; font-weight: 800; margin: 4px 0 0; }
```

Replace with:

```css
.type-power-row { display: flex; justify-content: flex-end; align-items: center; gap: 6px; margin: -6px 0 10px; }
.detail .mon-name { font-size: 32px; font-weight: 800; margin: 4px 0 0; color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,.35); }
```

- [ ] **Step 3: Syntax check**

Run: `node --check app.js` — Expected: no output (pass).

- [ ] **Step 4: Live verification**

Serve the app, open `#dex/6` (Charizard, dual-type: fire + flying). Confirm: the back button and a white pill reading "#006 · G1" sit on the same top row; directly below, right-aligned, two small circular gradient badges (fire, flying) followed by a white pill reading "534"; the name "Charizard" renders in bold white text with a visible drop shadow against the orange gradient body. Open `#dex/1` (Bulbasaur, also dual-type) as a second check. Open `#dex/25` (Pikachu, single-type) and confirm the badge row shows exactly one badge, no layout gap or stray separator.

- [ ] **Step 5: Commit**

```bash
git add app.js style.css
git commit -m "feat: corner pills and type badges on the detail screen

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Grid card — gradient background and split corner row

**Files:**
- Modify: `app.js` (`renderType`'s card-building loop)
- Modify: `style.css` (`.mon-card`, `.mon-meta` and its children, `.mon-card .name`)

**Interfaces:**
- Consumes: `typeGradient(hex)`, `typeBadgeHtml(typeKey, sizePx)`, `.pill` (Task 1/3).
- Produces: each grid card's background is now a gradient in that Pokémon's primary type color; the corner overlay is a single-row, left/right split (number+gen pill on the left, type badge(s) + power pill on the right) instead of a vertical stack in the top-right corner only.

- [ ] **Step 1: Replace the card-building markup**

In `app.js`, find:

```javascript
  for (const id of contextIds) {
    const mon = byId[id];
    const numStr = String(id).padStart(3, "0");
    const typeIcons = mon.types.map(t => window.TYPES[t].emoji).join("");
    const card = el("button", "mon-card bounce",
      `<div class="mon-meta"><span class="mon-num">#${numStr}</span>` +
      `<span class="mon-gen">G${mon.gen}</span>` +
      `<span class="mon-types">${typeIcons}</span>` +
      `<span class="mon-power">${mon.power}</span></div>` +
      `<img loading="lazy" src="${sprite(id, "thumb")}" alt=""><span class="name">${mon.name}</span>`);
    card.querySelector("img").onerror = e => { e.target.src = ""; e.target.style.background = "#ddd"; };
    card.onclick = () => go(`#dex/${id}`);
    grid.append(card);
  }
```

Replace with:

```javascript
  for (const id of contextIds) {
    const mon = byId[id];
    const numStr = String(id).padStart(3, "0");
    const typeBadges = mon.types.map(t => typeBadgeHtml(t, 20)).join("");
    const card = el("button", "mon-card bounce",
      `<div class="mon-meta"><span class="pill">#${numStr} · G${mon.gen}</span>` +
      `<span class="mon-typepower">${typeBadges}<span class="pill">${mon.power}</span></span></div>` +
      `<img loading="lazy" src="${sprite(id, "thumb")}" alt=""><span class="name">${mon.name}</span>`);
    card.style.background = typeGradient(window.TYPES[mon.types[0]].color);
    card.querySelector("img").onerror = e => { e.target.src = ""; e.target.style.background = "#ddd"; };
    card.onclick = () => go(`#dex/${id}`);
    grid.append(card);
  }
```

- [ ] **Step 2: Restyle the card and its corner overlay**

In `style.css`, find:

```css
.mon-card { position: relative; background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow);
  padding: 10px; display: flex; flex-direction: column; align-items: center; }
.mon-meta { position: absolute; top: 6px; right: 6px; display: flex; flex-direction: column;
  align-items: flex-end; gap: 2px; pointer-events: none; }
.mon-meta span { font-size: 11px; font-weight: 700; color: #999; line-height: 1.3; }
.mon-meta .mon-types { font-size: 14px; }
.mon-meta .mon-power { color: var(--red); }
.mon-card img { width: 100%; aspect-ratio: 1; }
.mon-card .name { font-weight: 700; font-size: 15px; }
```

Replace with:

```css
.mon-card { position: relative; border-radius: var(--radius); box-shadow: var(--shadow);
  padding: 10px; display: flex; flex-direction: column; align-items: center; }
.mon-meta { position: absolute; top: 8px; left: 8px; right: 8px; display: flex;
  justify-content: space-between; align-items: center; pointer-events: none; }
.mon-typepower { display: flex; align-items: center; gap: 3px; }
.mon-card img { width: 100%; aspect-ratio: 1; }
.mon-card .name { font-weight: 700; font-size: 15px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.3); }
```

- [ ] **Step 3: Syntax check**

Run: `node --check app.js` — Expected: no output (pass).

- [ ] **Step 4: Live verification**

Serve the app, open `#type/fire`. Confirm each card (e.g. Charizard) shows a gradient background, a white pill "#006 · G1" in the top-left corner, and type badge(s) + a white "534" pill in the top-right corner — all in a single row that never dips down over the sprite artwork, even for Charizard's two type badges. Confirm tapping anywhere on a card (including directly over the corner pills) still navigates to that Pokémon's detail screen (the corner overlay must not intercept the tap). Confirm the Pokémon name below the thumbnail is legible (white, with shadow) against the gradient.

- [ ] **Step 5: Commit and merge phase**

```bash
git add app.js style.css
git commit -m "feat: gradient background and split corner row for grid cards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git checkout develop && git merge --no-ff feat/visual-design-system -m "merge: visual design system (gradients, type badges, corner pills)"
```

---

### Task 6: Deploy and verify

**Files:** none (deploy + verification only)

**Interfaces:**
- Consumes: the existing `.github/workflows/deploy.yml` (unchanged) and the merged `develop` branch.

- [ ] **Step 1: Open and merge the release PR**

```bash
git push origin develop
gh pr create --base master --head develop --title "release: RafaDex visual design system" \
  --body "TCG-inspired gradient backgrounds, circular type badges, and corner info pills across Home buttons, grid cards, and the detail screen. No hard card frame, no custom icon set (both explicitly rejected during design review).

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr merge --merge
gh run watch   # confirm the deploy workflow succeeds
```

(If `git push origin develop` is blocked by the pre-push hook because you're on `develop`, push the ref from the feature branch instead: `git checkout feat/visual-design-system && git push origin refs/heads/develop:refs/heads/develop`.)

- [ ] **Step 2: Smoke-check the live site**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://atavaresm.github.io/rafadex/
```

Expected: `200`.

- [ ] **Step 3: Full visual pass on production**

In a real browser against `https://atavaresm.github.io/rafadex/` (clear the service worker cache first — `navigator.serviceWorker.getRegistrations()` then `.unregister()` each, and `caches.keys()` then `.delete()` each, then reload — so the new files are actually loaded, not the previous deploy's cached shell):

- Home: all 18 type tiles show a diagonal gradient and a visibly larger icon.
- A type world (e.g. Water, the largest): every card shows a gradient, a left pill, and a right badge+power row that never overlaps the sprite.
- A dual-type Pokémon's detail screen (Charizard, `#dex/6`): back button + number/gen pill on one row, two type badges + power pill on the next, white name text with a visible shadow.
- The game screen (`#game`): its yellow tint is now a gradient.
- Spot-check a light type (Fada, `#ee99ac`) and a dark type (Sombrio, `#705848`) on their Home tiles to confirm the gradient formula doesn't wash out the light one or over-darken the dark one.
- Confirm nothing from the non-goals list regressed: swipe still navigates, the sticky header still pins to the top and keeps its solid cream background, scroll position restore still works, search and favorites still work.

- [ ] **Step 4: Hand back to the user for the real-device pass**

Ask the user to check the same points on the real iPhone (after a fresh reload so the service worker picks up the change — per the v1.2 fix, this should now happen automatically without a manual cache clear). Any failure: fix on a `fix/` branch off `develop` → PR → re-merge to `master` → re-verify. When all pass, update `docs/diario-de-bordo.md` and the `project_rafadex` memory file.

---

## Self-Review (done at writing time)

- **Spec coverage:** gradient formula + surfaces (Tasks 1-3, 5), type badges (Tasks 1, 3, 4, 5), corner pills (Tasks 3, 4, 5), typography/legibility shadow (Task 4, 5), Home icon size (Task 2), non-goals explicitly preserved (topbar's own background untouched in Task 3; no new icon assets; no card border added anywhere).
- **Placeholder scan:** no TBD/TODO; every step has complete, exact code matched against the current file contents.
- **Type consistency:** `typeGradient(hex, shape)`, `typeBadgeHtml(typeKey, sizePx)`, `pill(text)`, `shadeColor(hex, percent)` — names and signatures used identically across Tasks 2-5, matching Task 1's definitions exactly. `topbar`'s new 4th parameter (`rightContent`) is additive/optional — verified the two pre-existing 3-argument call sites (`renderType`, `renderGame`) are never modified by this plan and remain valid.
- **Sequencing check:** Task 4's "Find" block for `renderDetail`'s opening lines and Task 5's "Find" block for `renderType`'s loop are non-overlapping regions of `app.js`, so applying Task 4 first doesn't invalidate Task 5's anchor text (confirmed against the current file). Task 3's CSS insertion point (`.sound-row button.speaking`) is untouched by any other task in this plan.
- **Known deviation, accepted:** the topbar's own background intentionally stays solid `var(--bg)` rather than gaining a gradient itself — called out explicitly in Global Constraints and Task 3 so no implementer "fixes" this as an oversight.
