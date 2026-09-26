# Pokémon Capture Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the feature from `docs/superpowers/specs/2026-08-23-pokemon-capture-game-design.md`: a new "Capturar Pokémon" game mode (grass map → random Gen 1 encounter → drag-the-Pokéball capture, no permanent flee) with its own collection, plus a small secondary "Batalhar" mode (pick a captured Pokémon, simple tap-to-attack HP-bar fight against a random Gen 1 opponent; winning can also catch the opponent).

**Architecture:** Two new vanilla-JS files loaded via `<script>` tag, same pattern as the existing `audio.js`/`app.js` (no framework, no bundler, no `fetch()` for data): `capture.js` (grass map, throw-to-catch minigame, `GameCaught` state, collection screen) and `battle.js` (Pokémon picker, tap-to-attack battle screen). Both are loaded *before* `app.js` (which calls `renderRoute()` at its own bottom and must find `renderCapture`/`renderCollection`/`renderBattleSelect` already defined), but their function *bodies* freely reference `app.js`/`audio.js` globals (`byId`, `sprite()`, `el()`, `go()`, `topbar()`, `elApp`, `Sound`, `confettiBurst()`) because those are only resolved when the functions are *called* (after user interaction, by which point every script has finished loading) — exactly the existing relationship `app.js` already has with `audio.js`'s `Sound`, just in reverse file order. Three new hash routes (`#capture`, `#collection`, `#battle`) are wired into the existing router in `app.js`; two new Home buttons ("🎯 Capturar Pokémon" always, "⚔️ Batalhar" only once at least one Pokémon is caught in-game) reuse the existing `.game-btn` style. The existing Pokédex detail screen, `.mon-grid`/`.mon-card` grid styling, `.pokeball` CSS ball, and the `Sound.speak()`/`Sound.fanfare()`/`confettiBurst()` feedback pipeline are all reused as-is — no new detail UI, no new card styling, no new audio/TTS plumbing.

**Tech Stack:** Vanilla HTML/CSS/JS (unchanged), no framework/bundler. Pointer Events API (`pointerdown`/`pointermove`/`pointerup` + `setPointerCapture`) for the drag-to-throw gesture — same event family `audio.js` already listens to globally (`window.addEventListener("pointerdown", ...)`).

**Spec:** `docs/superpowers/specs/2026-08-23-pokemon-capture-game-design.md`

## Global Constraints

- Repo pool for both the grass map and battle opponents is **Generation 1 only (ids 1–151)** — never all 1025. Helper: `gen1Ids()`.
- Capture and battle **never produce permanent loss** — a failed throw or a lost battle always leaves the player free to retry immediately, with neutral (never negative) feedback. No fleeing, no HP/health persisted between attempts, no cooldown.
- The in-game caught collection (`GameCaught`, localStorage key `rafadex.game.caught`) is **intentionally separate** from the existing Pokédex favorites (`Favs`, key `rafadex.favorites`, `app.js:6-15`) — do not merge, share, or cross-populate the two.
- No new dependency, no `<canvas>`, no build tooling change — plain DOM + CSS transforms + Pointer Events, matching every existing interactive bit of this app.
- Repo artifacts in English (code, comments, commits); user-facing copy in pt-BR — per `CLAUDE.md`.
- Python style rules (PascalCase/lowerCamelCase, ruff) don't apply here — no Python is touched by Tasks 1–3.
- Git flow: feature branch off `develop` (already checked out: `feat/pokemon-capture-game`, already has the spec + a diary entry committed), PR-merge into `develop`, then a release PR `develop` → `master`. `develop`/`master` both have GitHub branch protection (PR + 1 required approval, no direct push/force-push/deletion) — self-approval is impossible on this solo repo, every merge uses the repo-owner's admin-bypass option, and **every merge needs the human partner's explicit chat confirmation first**.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- This is a real user-visible feature — its release PR needs a **minor** version bump (`python3 bump_version.py minor`), and `python3 build.py` **must** be re-run after the bump so `version.js` matches (the `version-check.yml` CI gate on `master` checks this).
- No JS test framework exists in this repo (`pytest` covers only the Python build pipeline) — every JS task ends in a **live local verification** pass (`python3 -m http.server 8000`, real interaction in a browser), not an automated test run. Run `pytest -q` once per task anyway as a cheap regression check (no Python is touched, so it should stay green throughout).
- TTS output (`Sound.speak`) cannot be verified by a synthetic/scripted click in this project's experience — confirm it by *listening*, ideally on the real iPhone per `CLAUDE.md`'s existing "Verification" standard, before calling the feature fully done.

---

### Task 1: Grass map, throw-to-catch minigame, `GameCaught` state

**Files:**
- Create: `capture.js` (this task: `GameCaught`, `gen1Ids()`, `renderCapture()` and its inner map/encounter/throw logic — NOT `renderCollection()`, that's Task 2)
- Modify: `app.js:133-140` (`renderHome()` — add the "🎯 Capturar Pokémon" button)
- Modify: `app.js:387-396` (`renderRoute()` — add the `#capture` route)
- Modify: `index.html:19-23` (new `<script>` tag)
- Modify: `sw.template.js:5-7` (new `SHELL_CORE` entry)
- Modify: `style.css` (append new `/* Capture game */` section)
- Regenerate: `sw.js` (via `build.py` — do not hand-edit)

**Interfaces:**
- Consumes (from `app.js`/`audio.js`, all pre-existing): `elApp`, `byId`, `el(tag, cls, html)`, `sprite(id, kind)`, `go(hash)`, `topbar(title, backHash, tint, rightContent, tintKey)`, `confettiBurst(parent)`, `window.DEX`, `window.TYPES`, `Sound.fanfare()`, `Sound.speak(text, onEnd?)`.
- Produces:
  - `GameCaught = { key, list(): number[], has(id): boolean, add(id): void }` — used by Task 2 (`renderCollection`), Task 3 (`renderBattleSelect`, `renderBattleFight`), and `app.js`'s `renderHome()` (this task, for the button-count check; Task 3 reuses the same check for the battle button).
  - `gen1Ids(): number[]` — used by Task 3.
  - `renderCapture()` — wired to `#capture` in this task.

- [ ] **Step 1: Create `capture.js` with state + the grass map + throw minigame**

```javascript
"use strict";

const GameCaught = {
  key: "rafadex.game.caught",
  list() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
  has(id) { return this.list().includes(id); },
  add(id) {
    const list = this.list();
    if (!list.includes(id)) localStorage.setItem(this.key, JSON.stringify([...list, id]));
  },
};

function gen1Ids() { return window.DEX.filter(m => m.gen === 1).map(m => m.id); }

const ENCOUNTER_CHANCE = 0.4;
const CAPTURE_CHANCE = 0.6;
const MIN_THROW_DISTANCE = 40;

function renderCapture() {
  elApp.innerHTML = "";
  topbar("🎯", "#home", window.TYPES.grass.color, undefined, "grass");
  const stage = el("div", "capture-stage");
  elApp.append(stage);

  function showMap() {
    stage.innerHTML = "";
    const grid = el("div", "grass-grid");
    for (let i = 0; i < 6; i++) {
      const patch = el("button", "grass-patch bounce", "🌿");
      patch.onclick = () => tryEncounter(patch);
      grid.append(patch);
    }
    stage.append(grid);
  }

  function tryEncounter(patch) {
    if (Math.random() >= ENCOUNTER_CHANCE) {
      patch.classList.add("shake");
      setTimeout(() => patch.classList.remove("shake"), 400);
      return;
    }
    const pool = gen1Ids();
    showEncounter(pool[Math.floor(Math.random() * pool.length)]);
  }

  function showEncounter(id) {
    stage.innerHTML = "";
    const scene = el("div", "encounter-scene");
    const img = el("img", "encounter-mon bounce");
    img.src = sprite(id, "full");
    const ball = el("button", "pokeball throw-ball");
    scene.append(img, ball);
    stage.append(scene);
    wireThrow(ball, scene, id);
  }

  function wireThrow(ball, scene, id) {
    let startX = 0, startY = 0, dragging = false;
    ball.addEventListener("pointerdown", e => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      ball.setPointerCapture(e.pointerId);
    });
    ball.addEventListener("pointermove", e => {
      if (!dragging) return;
      ball.style.transform = `translate(${e.clientX - startX}px, ${e.clientY - startY}px)`;
    });
    ball.addEventListener("pointerup", e => {
      if (!dragging) return;
      dragging = false;
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist < MIN_THROW_DISTANCE) { ball.style.transform = ""; return; }
      resolveThrow(ball, scene, id);
    });
  }

  function resolveThrow(ball, scene, id) {
    const mon = byId[id];
    ball.style.transition = "transform .25s ease-out";
    ball.style.transform = "translateY(-120px)";
    setTimeout(() => {
      if (Math.random() < CAPTURE_CHANCE) {
        ball.classList.add("caught");
        Sound.fanfare();
        GameCaught.add(id);
        setTimeout(() => Sound.speak(`Você capturou ${mon.speak || mon.name}!`), 300);
        confettiBurst(scene);
        setTimeout(showMap, 1600);
      } else {
        ball.classList.add("miss");
        setTimeout(() => {
          ball.classList.remove("miss");
          ball.style.transition = "";
          ball.style.transform = "";
        }, 350);
      }
    }, 260);
  }

  showMap();
}
```

- [ ] **Step 2: Wire the `#capture` route**

In `app.js`, find (`renderRoute()`, currently lines 391-396):

```javascript
  const [route, arg] = location.hash.replace(/^#/, "").split("/");
  if (route === "type") renderType(arg);
  else if (route === "dex") renderDetail(Number(arg));
  else if (route === "game") renderGame();
  else if (route === "info") renderInfo();
  else renderHome();
```

Replace with:

```javascript
  const [route, arg] = location.hash.replace(/^#/, "").split("/");
  if (route === "type") renderType(arg);
  else if (route === "dex") renderDetail(Number(arg));
  else if (route === "game") renderGame();
  else if (route === "capture") renderCapture();
  else if (route === "info") renderInfo();
  else renderHome();
```

- [ ] **Step 3: Add the Home screen button**

In `app.js`, find (`renderHome()`, currently lines 137-140):

```javascript
  const gameBtn = el("button", "game-btn bounce", "❓ Quem é esse Pokémon?");
  gameBtn.onclick = () => go("#game");
  elApp.append(gameBtn);
  renderShelf();                       // no-op until Task 8
```

Replace with:

```javascript
  const gameBtn = el("button", "game-btn bounce", "❓ Quem é esse Pokémon?");
  gameBtn.onclick = () => go("#game");
  elApp.append(gameBtn);
  const captureBtn = el("button", "game-btn bounce", "🎯 Capturar Pokémon");
  captureBtn.onclick = () => go("#capture");
  elApp.append(captureBtn);
  renderShelf();                       // no-op until Task 8
```

(The stray `// no-op until Task 8` comment is pre-existing leftover from an earlier plan's numbering — leave it as-is, out of scope here.)

- [ ] **Step 4: Load `capture.js` in `index.html`**

Find:

```html
<script src="audio.js"></script>
<script src="app.js"></script>
```

Replace with:

```html
<script src="audio.js"></script>
<script src="capture.js"></script>
<script src="app.js"></script>
```

- [ ] **Step 5: Precache `capture.js`**

In `sw.template.js`, find:

```javascript
const SHELL_CORE = ["./", "index.html", "style.css", "app.js", "version.js", "audio.js",
  "data/dex.js", "data/type-icons.js", "manifest.json", "assets/fonts/baloo2.woff2",
  "assets/fonts/quicksand.woff2", "assets/fonts/materialsymbolsrounded.woff2"];
```

Replace with:

```javascript
const SHELL_CORE = ["./", "index.html", "style.css", "app.js", "version.js", "audio.js",
  "capture.js", "data/dex.js", "data/type-icons.js", "manifest.json",
  "assets/fonts/baloo2.woff2", "assets/fonts/quicksand.woff2",
  "assets/fonts/materialsymbolsrounded.woff2"];
```

- [ ] **Step 6: Append capture-game styles**

Append to the end of `style.css`:

```css

/* Capture game */
.capture-stage { position: relative; min-height: 340px; display: flex;
  flex-direction: column; align-items: center; justify-content: flex-end; }
.grass-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%; }
.grass-patch { aspect-ratio: 1; border-radius: var(--radius); background: #78c850;
  box-shadow: var(--shadow); font-size: 40px; }
.grass-patch.shake { animation: patchShake .4s; }
@keyframes patchShake { 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
@media (prefers-reduced-motion: reduce) { .grass-patch.shake { animation: none; } }
.encounter-scene { position: relative; width: 100%; min-height: 340px; display: flex;
  flex-direction: column; align-items: center; justify-content: flex-end; gap: 34px; padding-bottom: 10px; }
.encounter-mon { width: min(66vw, 260px); aspect-ratio: 1; filter: drop-shadow(0 10px 8px rgba(0,0,0,.25)); }
.throw-ball { width: 56px; height: 56px; touch-action: none; position: relative; }
.throw-ball.miss { animation: ballBounce .35s; }
@keyframes ballBounce { 50% { transform: translateY(10px); } }
@media (prefers-reduced-motion: reduce) { .throw-ball.miss { animation: none; } }
```

- [ ] **Step 7: Regenerate `sw.js`**

```bash
python3 build.py
```

Expected: exits with no error; `git diff sw.js` shows the `VERSION` build-timestamp constant changed AND the new `"capture.js"` entry in `SHELL_CORE`, carried through from Step 5.

- [ ] **Step 8: Regression check**

```bash
pytest -q
```

Expected: all pre-existing tests pass (no Python touched by this task).

- [ ] **Step 9: Local verification**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` and confirm, in order:
- Home screen shows a new "🎯 Capturar Pokémon" button below "❓ Quem é esse Pokémon?".
- Tapping it opens a green-tinted screen with 6 grass patches in a 3×3-ish grid.
- Tapping a patch either shakes it (miss, patch stays interactive) or opens an encounter: a Gen-1 Pokémon sprite with a grey Pokéball beneath it.
- Drag the ball a short distance (well under ~40px) and release: it snaps back, no throw counted.
- Drag the ball a long distance (upward, past the Pokémon) and release: it animates up; after a beat, either (a) it turns into the red/white/black "caught" ball, a fanfare + confetti + "Você capturou `<nome>`!" TTS plays, and the screen returns to the grass map after ~1.6s, or (b) it bounces back to its start position and the same Pokémon is still there, throwable again. Repeat a handful of throws to see both outcomes (capture chance is 60%, so misses should appear too).
- Reload the page, tap into `#capture`, catch one more, then check in DevTools → Application → Local Storage that `rafadex.game.caught` contains an array of ids that only grows, never resets on reload.
- Airplane-mode / offline reload still loads the shell (no console errors about `capture.js` 404ing) — this specifically checks Step 5's `SHELL_CORE` entry took effect (may require a hard-reload / SW re-register first, this project's service worker is cache-first and can serve a stale shell — see `CLAUDE.md`'s Verification note).

- [ ] **Step 10: Commit**

```bash
git add capture.js app.js index.html sw.template.js sw.js style.css
git commit -m "$(cat <<'EOF'
feat: add grass-map capture minigame

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Collection screen

**Files:**
- Modify: `capture.js` (append `renderCollection()`)
- Modify: `app.js:387-397` (`renderRoute()` — add the `#collection` route)
- Modify: `capture.js`'s `renderCapture()` (this task adds the "📦 Minha Coleção" button — see Step 1)
- Modify: `style.css` (one small addition: `.empty-hint`)

**Interfaces:**
- Consumes: `GameCaught.list()` (Task 1), `byId`, `sprite()`, `el()`, `elApp`, `topbar()`, `go()`, `contextIds` (existing mutable global in `app.js`, reused the same way `renderShelf()`/`renderSearchPanel()` already do to make the Pokédex detail screen's ‹ › arrows browse the right list).
- Produces: `renderCollection()` — wired to `#collection` in this task.

- [ ] **Step 1: Add the "Minha Coleção" button to `renderCapture()`**

In `capture.js`, find (inside `renderCapture()`, from Task 1):

```javascript
function renderCapture() {
  elApp.innerHTML = "";
  topbar("🎯", "#home", window.TYPES.grass.color, undefined, "grass");
  const stage = el("div", "capture-stage");
  elApp.append(stage);
```

Replace with:

```javascript
function renderCapture() {
  elApp.innerHTML = "";
  topbar("🎯", "#home", window.TYPES.grass.color, undefined, "grass");
  const collectionBtn = el("button", "game-btn bounce", "📦 Minha Coleção");
  collectionBtn.onclick = () => go("#collection");
  elApp.append(collectionBtn);
  const stage = el("div", "capture-stage");
  elApp.append(stage);
```

- [ ] **Step 2: Add `renderCollection()`**

Append to `capture.js`:

```javascript
function renderCollection() {
  elApp.innerHTML = "";
  topbar("📦", "#capture");
  const ids = GameCaught.list();
  if (!ids.length) {
    elApp.append(el("div", "empty-hint", "Ainda não capturou nenhum Pokémon. Volta pro mapinha! 🌿"));
    return;
  }
  const grid = el("div", "mon-grid");
  for (const id of ids) {
    const mon = byId[id];
    const card = el("button", "mon-card bounce shine",
      `<img loading="lazy" src="${sprite(id, "thumb")}" alt=""><span class="name">${mon.name}</span>`);
    card.onclick = () => { contextIds = ids; go(`#dex/${id}`); };
    grid.append(card);
  }
  elApp.append(grid);
}
```

- [ ] **Step 3: Wire the `#collection` route**

In `app.js`, find (as left by Task 1):

```javascript
  else if (route === "capture") renderCapture();
  else if (route === "info") renderInfo();
```

Replace with:

```javascript
  else if (route === "capture") renderCapture();
  else if (route === "collection") renderCollection();
  else if (route === "info") renderInfo();
```

- [ ] **Step 4: Add the empty-state style**

Append to `style.css`, right after the `/* Capture game */` block added in Task 1:

```css
.empty-hint { text-align: center; font-size: 17px; font-weight: 700; margin-top: 40px;
  color: var(--ink); opacity: .7; }
```

- [ ] **Step 5: Regression check**

```bash
pytest -q
```

Expected: still all green.

- [ ] **Step 6: Local verification**

```bash
python3 -m http.server 8000
```

- With `rafadex.game.caught` empty (clear it in DevTools if needed), open `#capture` → "📦 Minha Coleção": shows the friendly empty-state text, no grid, no crash.
- Catch a Pokémon (per Task 1's flow), then open the collection: the caught Pokémon's card appears (same visual style as a Pokédex type-world card).
- Tap the card: opens the normal Pokédex detail screen for that Pokémon (sprite, sounds, favorite pokéball, evolution strip all work exactly as elsewhere in the app).
- From the detail screen, the back arrow goes to that Pokémon's type world (existing behavior, unchanged — same as the favorites shelf/search already do).
- From the collection screen itself, the header back button returns to `#capture`.

- [ ] **Step 7: Commit**

```bash
git add capture.js app.js style.css
git commit -m "$(cat <<'EOF'
feat: add in-game caught collection screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Battle mode

**Files:**
- Create: `battle.js`
- Modify: `app.js:133-142` (`renderHome()` — add the conditional "⚔️ Batalhar" button)
- Modify: `app.js:387-398` (`renderRoute()` — add the `#battle` route)
- Modify: `index.html:19-24` (new `<script>` tag)
- Modify: `sw.template.js:5-7` (new `SHELL_CORE` entry)
- Modify: `style.css` (append new `/* Battle */` section)
- Regenerate: `sw.js`

**Interfaces:**
- Consumes: `GameCaught.list()/has()/add()` and `gen1Ids()` (Task 1), `byId`, `sprite()`, `el()`, `elApp`, `topbar()`, `go()`, `Sound.fanfare()`, `Sound.speak()`, `confettiBurst()`.
- Produces: `renderBattleSelect()` — wired to `#battle`; `renderBattleFight(playerId: number)` — called directly from the select screen's card `onclick`, no hash change (same in-place-transition pattern `renderGame()` already uses for its rounds).

- [ ] **Step 1: Create `battle.js`**

```javascript
"use strict";

const BATTLE_START_HP = 100;
const BATTLE_HIT = 20;
const BATTLE_COUNTER_DELAY = 500;

function renderBattleSelect() {
  elApp.innerHTML = "";
  topbar("⚔️", "#home", window.TYPES.fighting.color, undefined, "fighting");
  const ids = GameCaught.list();
  if (!ids.length) {
    elApp.append(el("div", "battle-select-hint", "Capture um Pokémon primeiro! 🎯"));
    return;
  }
  elApp.append(el("div", "battle-select-hint", "Escolha seu Pokémon:"));
  const grid = el("div", "mon-grid");
  for (const id of ids) {
    const mon = byId[id];
    const card = el("button", "mon-card bounce shine",
      `<img loading="lazy" src="${sprite(id, "thumb")}" alt=""><span class="name">${mon.name}</span>`);
    card.onclick = () => renderBattleFight(id);
    grid.append(card);
  }
  elApp.append(grid);
}

function renderBattleFight(playerId) {
  const pool = gen1Ids().filter(id => id !== playerId);
  const oppId = pool[Math.floor(Math.random() * pool.length)];
  const opp = byId[oppId];
  let playerHp = BATTLE_START_HP, oppHp = BATTLE_START_HP;

  elApp.innerHTML = "";
  const stage = el("div", "battle-stage");
  const playerCol = el("div", "battle-mon",
    `<img src="${sprite(playerId, "full")}" alt=""><div class="hp-track"><div class="hp-fill"></div></div>`);
  const oppCol = el("div", "battle-mon",
    `<img src="${sprite(oppId, "full")}" alt=""><div class="hp-track"><div class="hp-fill"></div></div>`);
  stage.append(playerCol, oppCol);
  elApp.append(stage);

  const attackBtn = el("button", "attack-btn bounce", "⚔️ Atacar!");
  elApp.append(attackBtn);
  const resultBox = el("div", "battle-result", "");
  elApp.append(resultBox);

  function setHp(col, hp) {
    const fill = col.querySelector(".hp-fill");
    fill.style.width = `${Math.max(0, hp)}%`;
    fill.classList.toggle("low", hp <= 30);
  }
  setHp(playerCol, playerHp);
  setHp(oppCol, oppHp);

  attackBtn.onclick = () => {
    attackBtn.disabled = true;
    oppHp -= BATTLE_HIT;
    setHp(oppCol, oppHp);
    if (oppHp <= 0) { win(); return; }
    setTimeout(() => {
      playerHp -= BATTLE_HIT;
      setHp(playerCol, playerHp);
      if (playerHp <= 0) { lose(); return; }
      attackBtn.disabled = false;
    }, BATTLE_COUNTER_DELAY);
  };

  function endBattle(text) {
    attackBtn.remove();
    resultBox.textContent = text;
    const retry = el("button", "game-btn bounce", "⬅️ Escolher outro");
    retry.onclick = () => renderBattleSelect();
    elApp.append(retry);
  }

  function win() {
    Sound.fanfare();
    confettiBurst(stage);
    const newCatch = !GameCaught.has(oppId);
    GameCaught.add(oppId);
    const phrase = newCatch
      ? `Você venceu! E capturou ${opp.speak || opp.name}!`
      : "Você venceu!";
    setTimeout(() => Sound.speak(phrase), 300);
    endBattle("Você venceu! 🎉");
  }

  function lose() {
    endBattle("Não foi dessa vez!");
  }
}
```

- [ ] **Step 2: Wire the `#battle` route**

In `app.js`, find (as left by Task 2):

```javascript
  else if (route === "collection") renderCollection();
  else if (route === "info") renderInfo();
```

Replace with:

```javascript
  else if (route === "collection") renderCollection();
  else if (route === "battle") renderBattleSelect();
  else if (route === "info") renderInfo();
```

- [ ] **Step 3: Add the conditional Home screen button**

In `app.js`, find (as left by Task 1):

```javascript
  const captureBtn = el("button", "game-btn bounce", "🎯 Capturar Pokémon");
  captureBtn.onclick = () => go("#capture");
  elApp.append(captureBtn);
  renderShelf();                       // no-op until Task 8
```

Replace with:

```javascript
  const captureBtn = el("button", "game-btn bounce", "🎯 Capturar Pokémon");
  captureBtn.onclick = () => go("#capture");
  elApp.append(captureBtn);
  if (GameCaught.list().length) {
    const battleBtn = el("button", "game-btn bounce", "⚔️ Batalhar");
    battleBtn.onclick = () => go("#battle");
    elApp.append(battleBtn);
  }
  renderShelf();                       // no-op until Task 8
```

- [ ] **Step 4: Load `battle.js` in `index.html`**

Find:

```html
<script src="audio.js"></script>
<script src="capture.js"></script>
<script src="app.js"></script>
```

Replace with:

```html
<script src="audio.js"></script>
<script src="capture.js"></script>
<script src="battle.js"></script>
<script src="app.js"></script>
```

- [ ] **Step 5: Precache `battle.js`**

In `sw.template.js`, find (as left by Task 1):

```javascript
const SHELL_CORE = ["./", "index.html", "style.css", "app.js", "version.js", "audio.js",
  "capture.js", "data/dex.js", "data/type-icons.js", "manifest.json",
  "assets/fonts/baloo2.woff2", "assets/fonts/quicksand.woff2",
  "assets/fonts/materialsymbolsrounded.woff2"];
```

Replace with:

```javascript
const SHELL_CORE = ["./", "index.html", "style.css", "app.js", "version.js", "audio.js",
  "capture.js", "battle.js", "data/dex.js", "data/type-icons.js", "manifest.json",
  "assets/fonts/baloo2.woff2", "assets/fonts/quicksand.woff2",
  "assets/fonts/materialsymbolsrounded.woff2"];
```

- [ ] **Step 6: Append battle styles**

Append to the end of `style.css`:

```css

/* Battle */
.battle-select-hint { text-align: center; font-size: 17px; font-weight: 700; margin: 10px 0 16px; }
.battle-stage { display: flex; justify-content: space-around; align-items: flex-end; gap: 14px; margin: 10px 0 20px; }
.battle-mon { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 42%; }
.battle-mon img { width: 100%; aspect-ratio: 1; filter: drop-shadow(0 8px 6px rgba(0,0,0,.25)); }
.hp-track { width: 100%; height: 14px; border-radius: 8px; background: rgba(0,0,0,.12); overflow: hidden; }
.hp-fill { height: 100%; width: 100%; background: #4caf50; transition: width .3s ease; }
.hp-fill.low { background: var(--brand); }
.attack-btn { width: 100%; padding: 18px; border-radius: var(--radius); background: var(--brand);
  color: #fff; box-shadow: var(--shadow); font-size: 22px; font-weight: 800; }
.attack-btn:disabled { opacity: .5; }
.battle-result { text-align: center; font-size: 22px; font-weight: 800; margin: 16px 0; }
```

- [ ] **Step 7: Regenerate `sw.js`**

```bash
python3 build.py
```

Expected: `git diff sw.js` shows the updated `VERSION` timestamp and the new `"battle.js"` entry in `SHELL_CORE`.

- [ ] **Step 8: Regression check**

```bash
pytest -q
```

Expected: still all green.

- [ ] **Step 9: Local verification**

```bash
python3 -m http.server 8000
```

With `rafadex.game.caught` still empty: confirm the Home screen shows **no** "⚔️ Batalhar" button, and opening `#battle` directly shows the "Capture um Pokémon primeiro! 🎯" hint with no grid.

Catch at least one Pokémon via `#capture`, then:
- Home screen now shows "⚔️ Batalhar".
- Tapping it shows a red-tinted screen with a grid of your caught Pokémon.
- Tap one: battle screen with two sprites (yours + a random Gen-1 opponent, never the same species you picked) and two full green HP bars, plus a big "⚔️ Atacar!" button.
- Tap "Atacar!" repeatedly: the opponent's bar drops immediately each tap, the button disables briefly, then your bar drops (the opponent's "counter"), bars turn red under ~30%.
- Play to a win: confetti + fanfare + "Você venceu!" TTS (mentioning the capture if the opponent wasn't already in your collection) + a "⬅️ Escolher outro" button that returns to the picker with no penalty.
- Play to a loss (deliberately stop attacking / let HP run out — or temporarily lower `BATTLE_HIT` while testing if needed): neutral "Não foi dessa vez!" message, same "⬅️ Escolher outro" button, no state change, immediately retryable.
- Check `rafadex.game.caught` in DevTools after a win against a previously-uncaught opponent — the new id should be present.

- [ ] **Step 10: Commit**

```bash
git add battle.js app.js index.html sw.template.js sw.js style.css
git commit -m "$(cat <<'EOF'
feat: add simple tap-to-attack battle mode

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Release (minor version bump, PRs, deploy, verify)

**Files:** none besides what `bump_version.py` writes (`VERSION`) and a hand-written `CHANGELOG.md` entry.

- [ ] **Step 1: Merge the feature branch into `develop`**

```bash
git checkout develop && git pull
git merge --no-ff feat/pokemon-capture-game -m "merge: Pokémon capture game (map, throw-catch, collection, battle)"
```

- [ ] **Step 2: Get the human partner's explicit go-ahead, then push `develop`**

Push per this repo's established ref-push workaround for branch protection (push from a non-protected branch checkout, never `--no-verify`).

- [ ] **Step 3: Bump the version and regenerate build artifacts**

```bash
git checkout -b chore/pokemon-capture-game-release
python3 bump_version.py minor
cat VERSION
```

Expected: prints the new minor-bumped version — use that printed value below, not a hardcoded guess.

```bash
python3 build.py
```

Expected: `version.js` reflects the new version string (both the version and the build-date line).

- [ ] **Step 4: Add the `CHANGELOG.md` entry**

Add a new heading at the top of `CHANGELOG.md`, above the current topmost entry, using the version `bump_version.py` printed and today's date:

```markdown
## v<VERSION> — 2026-08-23

### Added
- New "Capturar Pokémon" game mode: a grass map that triggers random Generation 1
  encounters, a drag-the-Pokéball capture minigame with no permanent "flee" (always
  retryable), and a personal in-game collection screen — kept separate from the
  existing Pokédex favorites.
- New "Batalhar" mode: pick a captured Pokémon and fight a random Generation 1
  opponent with a simple tap-to-attack HP-bar battle. Winning can also add the
  opponent to your collection.
```

(Replace `<VERSION>` with the real printed value.)

- [ ] **Step 5: Commit, push, and open the release PR into `develop`**

```bash
git add VERSION CHANGELOG.md version.js sw.js
git commit -m "$(cat <<'EOF'
chore: bump version for the capture game release

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git push -u origin chore/pokemon-capture-game-release
gh pr create --base develop --head chore/pokemon-capture-game-release \
  --title "chore: bump version for capture game release" \
  --body "Minor bump for the Pokémon capture game feature. See CHANGELOG.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Report the PR URL, wait for explicit confirmation, then:

```bash
gh pr merge --merge
```

- [ ] **Step 6: Open the release PR into `master`**

```bash
git checkout develop && git pull
gh pr create --base master --head develop \
  --title "release: Pokémon capture game" \
  --body "Adds the capture game (grass map, throw-catch, collection) and the simple battle mode. See CHANGELOG.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
```

Expected: the `version-check` CI check passes.

- [ ] **Step 7: Get the human partner's explicit go-ahead, then merge**

Report the PR URL and wait for explicit confirmation before merging — this deploys to production.

```bash
gh pr merge --merge
```

- [ ] **Step 8: Verify production**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://atavaresm.github.io/rafadex/
curl -s -o /dev/null -w "%{http_code}\n" https://amaix-dev.com/pokedex/
```

Expected: `200` from both — the raw GitHub Pages origin and the custom-domain proxy the parent actually has installed on the real iPhone (`amaix-dev-proxy` sits in front of it; that proxy's own cache previously served stale content for up to 4h after a deploy, see the 11/08 diary entry — if this check returns old content, that's the known suspect, not this feature). Then, in a real browser (ideally the real iPhone, per `CLAUDE.md`'s standing Verification rule) against `amaix-dev.com/pokedex`: hard-reload / unregister any existing service worker + clear caches first (this app is cache-first, a plain reload can silently serve a stale copy), then repeat Task 1/2/3's Step 9 checks — including actually *hearing* the TTS lines and *feeling* the drag-to-throw gesture with a finger, which can't be confirmed by automated/synthetic clicks.

- [ ] **Step 9: Hand back to the human partner**

Report: the capture game is live. Add a diary entry to `docs/diario-de-bordo.md` summarizing the round (mechanic tuning notes — encounter/capture chance, HP numbers — are worth capturing if anything changed from the plan during real-device testing).

---

## Self-Review (done at writing time)

- **Spec coverage:** Grass map + encounter roll (Task 1 Step 1 `showMap`/`tryEncounter`) · drag-to-throw with no-precision-aim + fixed capture chance + infinite retry, no fleeing (Task 1 Step 1 `wireThrow`/`resolveThrow`) · TTS + fanfare + confetti on success (same) · Home entry point coexisting with the silhouette game (Task 1 Step 3) · Collection screen reusing the Pokédex card/detail UI (Task 2) · Battle gated on having ≥1 catch, random Gen-1 opponent, tap-to-attack with HP bars, win adds a catch, loss is neutral and retryable (Task 3) · `GameCaught` kept separate from `Favs` (Global Constraints, `GameCaught`'s own key) · Gen-1-only pool everywhere (`gen1Ids()`, used by both `capture.js` and `battle.js`) · offline/precache correctness (`SHELL_CORE` entries in Tasks 1 & 3) · manual verification standard, no JS test suite (Global Constraints + every task's Step 9/Step 10-equivalent) · version bump + changelog + branch-protected release flow (Task 4). No spec section is without a task.
- **Placeholder scan:** no TBD/TODO; every code step is complete, runnable code matched against the files as actually read (`app.js`, `audio.js`, `index.html`, `style.css`, `sw.template.js`, `data/dex.js` all read in full before writing this plan). Task 4's "use the printed value" is a genuine runtime dependency (same pattern the type-icons release plan used), not a vague placeholder.
- **Type consistency:** `GameCaught` (Task 1) is used identically in Task 2 (`.list()`), Task 3 (`.list()`, `.has()`, `.add()`), and `app.js`'s Home button (Task 3, `.list().length`) — same three-method shape throughout. `gen1Ids()` (Task 1, `number[]`) is called the same way in Task 3's opponent roll. `renderCapture()`/`renderCollection()`/`renderBattleSelect()` take no arguments everywhere they're referenced (router, buttons); `renderBattleFight(playerId)` is only ever called with a numeric id from a caught-Pokémon card's `onclick`, consistently.
- **Sequencing check:** Task 1 creates `capture.js`/`GameCaught`/`gen1Ids()` before Task 3's `battle.js` needs them (script tag order in Task 3 Step 4 places `battle.js` after `capture.js`, before `app.js`). Task 2 only appends to `capture.js` and only touches the router/button code exactly as Task 1 left it (find/replace blocks quote Task 1's exact resulting text). Task 3's find/replace blocks likewise quote Task 2's exact resulting text. `SHELL_CORE`/`sw.js` regeneration happens after each task's file additions, in the same task, so no task ships with a stale precache list.
- **Known project hazard, called out rather than hidden:** the cache-first service worker can mask a broken/missing file behind a stale shell during verification — flagged explicitly in Global Constraints and repeated in Task 1's and Task 4's verification steps, per `CLAUDE.md`'s own standing note and this project's diary history of being bitten by it before.
