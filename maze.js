"use strict";

const MAZE_SIZE = 8;
const MAZE_COLLECTIBLES = 3;
const MAZE_DIRS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const MAZE_OPP = { N: "S", S: "N", E: "W", W: "E" };

// Recursive-backtracker generation. Produces a perfect maze: fully connected,
// exactly one path between any two cells, guaranteed to contain dead ends.
function mazeGenerate(size = MAZE_SIZE, rand = Math.random) {
  const open = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) row.push(new Set());
    open.push(row);
  }
  const seen = open.map(row => row.map(() => false));
  const stack = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const candidates = [];
    for (const dir of Object.keys(MAZE_DIRS)) {
      const [dx, dy] = MAZE_DIRS[dir];
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && !seen[ny][nx]) {
        candidates.push([dir, nx, ny]);
      }
    }
    if (!candidates.length) { stack.pop(); continue; }
    const [dir, nx, ny] = candidates[Math.floor(rand() * candidates.length)];
    open[y][x].add(dir);
    open[ny][nx].add(MAZE_OPP[dir]);
    seen[ny][nx] = true;
    stack.push([nx, ny]);
  }
  return open;
}

// Breadth-first search from the entrance to the exit. Returns the cells of the
// solution path in order, or null when the exit cannot be reached.
function mazeSolve(open, size = MAZE_SIZE) {
  const prev = { "0,0": null };
  const queue = [[0, 0]];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === size - 1 && y === size - 1) break;
    for (const dir of open[y][x]) {
      const [dx, dy] = MAZE_DIRS[dir];
      const key = `${x + dx},${y + dy}`;
      if (!(key in prev)) { prev[key] = [x, y]; queue.push([x + dx, y + dy]); }
    }
  }
  if (!(`${size - 1},${size - 1}` in prev)) return null;
  const path = [];
  let cell = [size - 1, size - 1];
  while (cell) { path.push(cell); cell = prev[`${cell[0]},${cell[1]}`]; }
  return path.reverse();
}

// Hides collectibles in dead ends that are NOT on the solution path, so that
// exploring a wrong turn is where the reward is. Falls back to fewer items when
// a maze somehow offers fewer spots; the round stays playable and winnable.
function mazePlaceCollectibles(open, size = MAZE_SIZE, rand = Math.random, pool = null) {
  const path = mazeSolve(open, size);
  const onPath = new Set((path || []).map(([x, y]) => `${x},${y}`));
  const spots = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (open[y][x].size === 1 && !onPath.has(`${x},${y}`)) spots.push([x, y]);
    }
  }
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  const ids = pool || gen1Ids();
  return spots.slice(0, MAZE_COLLECTIBLES).map(([x, y]) =>
    ({ x, y, id: ids[Math.floor(rand() * ids.length)] }));
}

// Measured over 20,000 mazes: about 1 in 1100 offers only two dead ends that are
// off the solution path, which would silently short the round one collectible.
// Rather than degrade the round, roll again — each attempt succeeds ~99.9% of the
// time, so this effectively never loops twice, and the bound keeps it honest.
const MAZE_MAX_ATTEMPTS = 20;

function mazeNewRound(size = MAZE_SIZE, rand = Math.random, pool = null) {
  let best = null;
  for (let attempt = 0; attempt < MAZE_MAX_ATTEMPTS; attempt++) {
    const open = mazeGenerate(size, rand);
    const items = mazePlaceCollectibles(open, size, rand, pool);
    if (items.length === MAZE_COLLECTIBLES) return { open, items };
    if (!best || items.length > best.items.length) best = { open, items };
  }
  return best;
}

// Tracks the win-praise timeout outside any single round's closure, so it can
// be cancelled no matter how the round ends: the next-maze button and the
// eraser call mazeClearPraiseTimer() directly (neither goes through a hash
// change), and this one listener — registered once, not per round, so replaying
// many rounds never piles up listeners — catches leaving the screen entirely.
let mazePraiseTimer = null;
function mazeClearPraiseTimer() {
  if (mazePraiseTimer !== null) { clearTimeout(mazePraiseTimer); mazePraiseTimer = null; }
}
if (typeof window !== "undefined") {
  window.addEventListener("hashchange", mazeClearPraiseTimer);
}

function renderMaze() {
  elApp.innerHTML = "";
  topbar("🌀", "#home", window.TYPES.grass.color, undefined, "grass");

  const { open, items } = mazeNewRound();
  const collected = new Set();

  const stage = el("div", "maze-stage");
  const grid = el("div", "maze-grid");
  grid.style.setProperty("--maze-size", MAZE_SIZE);

  const cells = [];
  for (let y = 0; y < MAZE_SIZE; y++) {
    for (let x = 0; x < MAZE_SIZE; x++) {
      const cell = el("div", "maze-cell");
      cell.dataset.x = x;
      cell.dataset.y = y;
      // Each cell draws only its north and west walls; the grid container draws
      // the outer east and south edges. Drawing both sides of a shared wall
      // would double its thickness.
      if (!open[y][x].has("N")) cell.classList.add("wall-n");
      if (!open[y][x].has("W")) cell.classList.add("wall-w");
      cells.push(cell);
      grid.append(cell);
    }
  }
  cells[0].classList.add("maze-start");
  cells[MAZE_SIZE * MAZE_SIZE - 1].classList.add("maze-goal");

  for (const item of items) {
    const img = el("img", "maze-item");
    img.src = sprite(item.id, "thumb");
    img.alt = "";
    cellAt(item.x, item.y).append(img);
  }

  const pipRow = el("div", "maze-pips");
  const pips = items.map(() => {
    const pip = el("span", "pokeball maze-pip");
    pipRow.append(pip);
    return pip;
  });
  elApp.append(pipRow);

  let path = [];
  let dragging = false;
  let dragPointerId = null;
  let won = false;

  function cellAt(x, y) { return cells[y * MAZE_SIZE + x]; }
  function head() { return path[path.length - 1]; }

  // Keeps the "head" class on exactly the current head of path (none when path
  // is empty), so the child can always see where the live end of the trail is.
  // Called after every mutation: painting, backwards-retrace, the pointerdown
  // truncation, the eraser, and winning.
  let headCell = null;
  function updateHead() {
    if (headCell) headCell.classList.remove("head");
    headCell = path.length ? cellAt(...head()) : null;
    if (headCell) headCell.classList.add("head");
  }

  function onPaint(x, y) {
    const item = items.find(it => it.x === x && it.y === y && !collected.has(it));
    if (item) {
      collected.add(item);
      const img = cellAt(x, y).querySelector(".maze-item");
      if (img) {
        img.classList.add("popped");
        setTimeout(() => img.remove(), 450);
      }
      pips[collected.size - 1].classList.add("caught");
      Sound.pop();
      const mon = byId[item.id];
      Sound.speak(mon.speak || mon.name);
    }
    if (x !== MAZE_SIZE - 1 || y !== MAZE_SIZE - 1) return;
    won = true;
    dragging = false;
    Sound.fanfare();
    confettiBurst(stage);
    mazePraiseTimer = setTimeout(() => {
      mazePraiseTimer = null;
      Sound.speak("Você conseguiu!");
    }, 300);
    nextBtn.classList.add("pulse");
  }

  function paintTo(x, y) {
    if (won) return;
    if (!path.length) {
      if (x === 0 && y === 0) {
        path.push([0, 0]);
        cellAt(0, 0).classList.add("trail");
        updateHead();
        onPaint(0, 0);
      }
      return;
    }
    const [hx, hy] = head();
    if (x === hx && y === hy) return;

    // Rule 2: dragging back onto the previous cell erases the head.
    if (path.length >= 2) {
      const [px, py] = path[path.length - 2];
      if (x === px && y === py) {
        cellAt(hx, hy).classList.remove("trail");
        path.pop();
        updateHead();
        return;
      }
    }

    // Rule 1: adjacent with no wall between -> paint.
    const dir = Object.keys(MAZE_DIRS).find(d =>
      MAZE_DIRS[d][0] === x - hx && MAZE_DIRS[d][1] === y - hy);
    // Rule 3: anything else (a wall, a skipped cell, off the grid) does nothing.
    if (!dir || !open[hy][hx].has(dir)) return;

    path.push([x, y]);
    cellAt(x, y).classList.add("trail");
    updateHead();
    onPaint(x, y);
  }

  function cellUnder(event) {
    return document.elementFromPoint(event.clientX, event.clientY)?.closest(".maze-cell");
  }

  grid.addEventListener("pointerdown", event => {
    const cell = cellUnder(event);
    if (!cell) return;
    const x = Number(cell.dataset.x), y = Number(cell.dataset.y);
    // A drag may only begin at the entrance (nothing painted yet) or at the head
    // of the existing path (resuming after lifting the finger). Anywhere else is
    // ignored: it must not start, move, or clear anything.
    const startable = path.length
      ? (x === head()[0] && y === head()[1])
      : (x === 0 && y === 0);
    if (!startable) return;
    dragging = true;
    dragPointerId = event.pointerId;
    grid.setPointerCapture(event.pointerId);
    paintTo(x, y);
  });

  grid.addEventListener("pointermove", event => {
    // A second finger resting on the grid never started a drag (rejected by
    // startable above), so it must not be allowed to move one that did.
    if (!dragging || event.pointerId !== dragPointerId) return;
    const cell = cellUnder(event);
    if (!cell) return;
    paintTo(Number(cell.dataset.x), Number(cell.dataset.y));
  });

  const endDrag = event => {
    if (event.pointerId !== dragPointerId) return;
    dragging = false;
    dragPointerId = null;
  };
  grid.addEventListener("pointerup", endDrag);
  grid.addEventListener("pointercancel", endDrag);

  stage.append(grid);
  elApp.append(stage);

  const controls = el("div", "maze-controls");
  const eraseBtn = el("button", "maze-btn bounce", "🧽");
  eraseBtn.setAttribute("aria-label", "Apagar o caminho");
  eraseBtn.onclick = () => {
    for (const [x, y] of path) cellAt(x, y).classList.remove("trail");
    path = [];
    updateHead();
    // Erasing after a win unlocks the same maze to be played again; collected
    // Pokemon and their pips are deliberately left alone. Also cancels any
    // pending win praise so it can't land after the round has been reset.
    won = false;
    mazeClearPraiseTimer();
    nextBtn.classList.remove("pulse");
  };
  const nextBtn = el("button", "maze-btn bounce", "➡️");
  nextBtn.setAttribute("aria-label", "Próximo labirinto");
  // Cancel any praise still pending from this round before the button tears
  // down this closure and builds the next one, so it can't speak over it.
  nextBtn.onclick = () => { mazeClearPraiseTimer(); renderMaze(); };
  controls.append(eraseBtn, nextBtn);
  elApp.append(controls);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { MAZE_SIZE, MAZE_COLLECTIBLES, MAZE_MAX_ATTEMPTS, MAZE_DIRS, MAZE_OPP,
    mazeGenerate, mazeSolve, mazePlaceCollectibles, mazeNewRound };
}
