# Pokémon Maze Game — Design Spec

**Date:** 2026-09-05
**Status:** Approved design, pending implementation plan

## What

A third game mode inside RafaDex: an 8×8 maze that Rafael solves by dragging his finger
from the entrance to the exit, painting the corridor as he goes. Pokémon-themed in look
only — the Pokémon scattered along the way are per-round collectibles, and reaching the
exit is the win. Nothing here feeds the Pokédex favorites or the capture game's
collection.

## Non-goals

- **Not connected to any collection.** The Pokémon picked up inside a maze do not enter
  `Favs` or `GameCaught`. They are worth exactly one round. This is a deliberate
  separation of concerns between game modes: capture is where Pokémon are won, the maze
  is where paths are traced. Merging them would make the maze the fastest route into the
  collection and hollow out the capture game.
- No score, no timer, no lives, no failure state, no progressive difficulty. Grid size is
  fixed at 8×8.
- No type advantages, levels, or stats — no shared mechanics with battle mode.
- No persisted state of any kind. No `localStorage` key is added by this feature.
- No changes to the existing "Who's that Pokémon?", capture, or battle modes.
- No canvas, no new library, no bundler — same vanilla constraints as the rest of the app.

## Product & UX

One new screen, reachable from a new Home button, playable with no reading — consistent
with RafaDex's kid-first constraint (3–6yo, non-reader).

### Entry

New Home button "🌀 Labirinto", alongside the existing "❓ Quem é esse Pokémon?",
"🎯 Capturar Pokémon" and "⚔️ Batalhar". Always enabled — unlike battle mode, it has no
precondition.

### The maze screen (`#maze`)

An 8×8 grid filling the screen width, generated fresh on entry. Entrance at the top-left
cell, exit at the bottom-right cell marked with a **Pokémon Center** (red-roofed
building). Above the grid, a row of small Pokéball pips — one per collectible actually placed in
this maze (normally three; see placement below) — the round's counter, empty at the
start.

Below the grid, two always-visible controls:

- **🧽 Borracha** — clears the whole painted path in one tap. Does not reset collected
  Pokémon and does not generate a new maze.
- **➡️ Próximo** — discards the current maze and generates a new one. Always enabled,
  whether or not the maze was solved.

### The core interaction

Rafael presses anywhere on the entrance cell and drags. Painting is **cell-granular**:
the moment his finger enters a cell, that whole cell lights up in the trail color. There
is no pixel-level stroke to smudge — snapping to the corridor is a consequence of the
model, not a correction applied afterwards. The trail is one fixed vivid color for the
whole app: the theme is visual-only, so it is not tinted per Pokémon type.

Three rules govern every pointer move, evaluated against the **head** of the current path
(the last cell painted):

1. **Adjacent, no wall between → paint.** The cell is appended to the path and becomes the
   new head.
2. **The previous cell in the path → erase.** The head is popped and un-painted. Dragging
   backwards retraces, like a snake. This is the undo, and it needs no button and no mode.
3. **Anything else → ignore.** Crossing a wall, jumping cells, or wandering off the grid
   does nothing at all: no sound, no penalty, no reset. The finger is free to move
   anywhere; the paint simply waits until it is back at a legal cell.

There is no way to lose and no way to make an illegal move — only moves that do nothing.

### Collectibles

Three Gen 1 Pokémon per maze, each placed in a **dead-end cell that is not on the
solution path**. This inverts the meaning of a dead end: exploring a wrong turn is never
wasted, it is where the reward is. Painting over a collectible cell:

- pops its sprite **above** the finger (never below — at 46px cells the hand covers what
  is under it),
- plays `Sound.pop()`,
- speaks the Pokémon's name through the existing pronunciation pipeline,
- fills the next Pokéball pip in the counter,
- and removes the sprite from the grid; the cell stays painted like any other trail cell.

Collecting all three is optional. Reaching the exit always wins, at any count. A collected
Pokémon stays collected for the round even if the path is erased — erasing is about the
drawing, not about taking anything away.

Pool is **Generation 1 only** (#1–151), which is the set guaranteed to be precached and
therefore available in airplane mode.

### Winning

The path reaches the exit cell: confetti burst, fanfare, and spoken praise. The finished
maze stays on screen with the full painted path visible — he gets to look at what he drew.
The "Próximo" button starts pulsing to invite the next round. Nothing auto-advances; the
pace is his.

### Visual identity

Reuses the existing RafaDex system with no new visual language: rounded chunky controls,
springy animations, the app's existing sound effects. The maze walls are themed as a
Pokémon route (grass/rock), the entrance is a Pokéball, the exit a Pokémon Center. The
trail is painted thick and vivid so that what his hand covered is unmistakable the moment
he lifts his finger.

## Design rationale (decisions made during brainstorming)

**Why 8×8 and not larger or smaller.** Usable screen width is ~366px, so cell size runs
73px at 5×5, 61px at 6×6, 46px at 8×8, 37px at 10×10. A 5-year-old's fingertip contacts
roughly 40–45px. Below ~46px per cell the hand occludes the play area faster than the
maze gets interesting — difficulty stops coming from the maze and starts coming from the
finger. 8×8 (26-step solution, 9 dead ends) was chosen as the accepted edge of that
tradeoff, with the occlusion paid down visually (thick trail, collectibles popping
upward) rather than by shrinking the maze. A taller-than-wide scrolling route was
considered and rejected for v1: scroll fighting the drag gesture is the expensive part.

**Why the eraser is not a mode.** A toggled erase mode is invisible state, and invisible
state is the single largest source of confusion at this age — he would paint, see no
paint, and conclude the app is broken. Backwards-retrace covers the real need (backing
out of a dead end) with a gesture the hand already makes, leaving the button to mean one
unambiguous thing: clear everything.

**Why nothing persists.** The maze has no collection, no progress, and no best score, so
there is nothing worth surviving a reload. Adding storage would create state to
invalidate for no gain.

## Architecture

One new vanilla JS module, `maze.js`, loaded via a `<script>` tag in `index.html` between
`battle.js` and `app.js` — the same pattern as `capture.js` and `battle.js`. One new hash
route, `#maze`, wired into the existing router in `app.js`.

### Generation

Recursive-backtracker (depth-first) generation over the 8×8 grid, producing a **perfect
maze**: exactly one path between any two cells, fully connected, guaranteed solvable,
guaranteed to contain dead ends. Represented as a per-cell set of open directions.

Collectible placement, after generation:

1. Solve entrance → exit (BFS) to get the solution path.
2. Collect all dead-end cells (exactly one open direction) not on the solution path and
   not the entrance or exit.
3. Pick three at random; assign each a random Gen 1 id.

If fewer than three qualifying dead ends exist, place as many as there are — the round is
still playable and still winnable. (Empirically an 8×8 has ~9 dead ends, so this is a
guard, not an expected case.)

### Rendering and input

The grid is a `<div>` of 64 cell `<div>`s; walls are CSS borders on each cell, painted
cells carry a trail class. Pointer handling lives on the grid container:

- `pointerdown` starts a drag only on the **entrance cell** (when the path is empty) or
  on the **head of the existing path** (to resume after lifting). A press on any other
  cell is ignored — it does not start, move, or clear anything. `setPointerCapture` keeps
  the drag alive if the finger leaves the grid.
- `pointermove` resolves the cell under the finger with `document.elementFromPoint` and
  applies the three rules above.
- `pointerup` ends the drag. The path is kept; he can lift, rest, and resume from the head.

The grid gets `touch-action: none` so iOS does not scroll the page while he draws.

### Reuse

- `byId` and `sprite()` from `app.js` for collectible sprites.
- `Sound.speak()` / `Sound.fanfare()` / `Sound.pop()` from `audio.js`, plus the
  `pronounce-dex.js` pronunciation dictionary.
- `confettiBurst()` from `app.js` for the win.
- `topbar()` and the existing `game-btn` / `bounce` / `shine` classes.

### State

None. Everything lives in the closure of the render function for the current round and
dies when the route changes.

## Error handling / edge cases

- **Collecting several Pokémon in quick succession** cancels the previous utterance before
  speaking the next (`Sound.stopSpeech()` then `Sound.speak()`), otherwise `speechSynthesis`
  queues and the names run several seconds behind the finger.
- **Erasing back past a collected cell** leaves the Pokémon collected and its pip filled.
  Re-painting the cell does not re-award or re-speak it.
- **Tapping "Borracha" after winning** clears the path but leaves the maze and the round's
  collected count intact.
- **Leaving and re-entering `#maze`** generates a fresh maze; there is nothing to restore.
- **`maze.js` must be added to `SHELL_CORE` in `sw.template.js`**, and `sw.js` regenerated
  by `build.py`. A new file missing from that list works online and disappears in airplane
  mode — the exact precache trap this project has hit before.
- No network calls. Gen 1 sprites are already precached, so the mode works fully offline.

## Testing

The repo has no JS test suite (`pytest` covers only the Python build pipeline), and the
established practice for game modes is manual verification on the real device. That holds
for the interaction.

The generator is the exception: an unsolvable maze or a maze with no valid collectible
placement fails silently and ruins the round without raising an error. So `maze.js`
exports its generator under a Node guard, and a committed `tools/verify-maze.js` asserts
over 1000 generated mazes that each is fully connected, that entrance→exit is solvable,
and that at least three off-path dead ends exist. Run with `node tools/verify-maze.js`
(Node 26 is installed locally). No test runner or CI job is added.

Manual verification, per the project's existing standard: serve over LAN, open on the real
iPhone, install to Home Screen, and check — drag painting follows the finger without the
page scrolling, backwards-retrace erases, the eraser clears, "Próximo" always works,
collectible names are actually spoken, the win celebration fires, and the whole mode plays
in airplane mode.
