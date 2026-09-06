"use strict";

// Verifies the maze generator over many seeds. Run: node tools/verify-maze.js
// Not part of any CI job — this is a developer check for the one piece of the
// maze game that can fail silently.

const { mazeGenerate, mazeSolve, mazeNewRound, MAZE_SIZE, MAZE_COLLECTIBLES,
  MAZE_DIRS } = require("../maze.js");

const ROUNDS = 1000;
const POOL = Array.from({ length: 151 }, (_, i) => i + 1);

function fail(round, message) {
  console.error(`FAIL (round ${round}): ${message}`);
  process.exit(1);
}

function reachableCount(open) {
  const seen = new Set(["0,0"]);
  const queue = [[0, 0]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const d of open[y][x]) {
      const [dx, dy] = MAZE_DIRS[d];
      const key = `${x + dx},${y + dy}`;
      if (!seen.has(key)) { seen.add(key); queue.push([x + dx, y + dy]); }
    }
  }
  return seen.size;
}

for (let round = 0; round < ROUNDS; round++) {
  const open = mazeGenerate();

  if (reachableCount(open) !== MAZE_SIZE * MAZE_SIZE) {
    fail(round, "maze is not fully connected");
  }

  for (let y = 0; y < MAZE_SIZE; y++) {
    for (let x = 0; x < MAZE_SIZE; x++) {
      for (const d of open[y][x]) {
        const [dx, dy] = MAZE_DIRS[d];
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= MAZE_SIZE || ny < 0 || ny >= MAZE_SIZE) {
          fail(round, `cell ${x},${y} opens off the grid to the ${d}`);
        }
        const back = { N: "S", S: "N", E: "W", W: "E" }[d];
        if (!open[ny][nx].has(back)) {
          fail(round, `wall between ${x},${y} and ${nx},${ny} is not symmetric`);
        }
      }
    }
  }

  const path = mazeSolve(open);
  if (!path) fail(round, "entrance to exit is unsolvable");
  if (path[0][0] !== 0 || path[0][1] !== 0) fail(round, "solution does not start at 0,0");
  const last = path[path.length - 1];
  if (last[0] !== MAZE_SIZE - 1 || last[1] !== MAZE_SIZE - 1) {
    fail(round, "solution does not end at the exit");
  }

  // The screen always goes through mazeNewRound, so that is what gets the
  // full-set guarantee. Roughly 1 raw maze in 1100 can only hide two
  // collectibles; mazeNewRound is what makes that invisible to the player.
  const roundData = mazeNewRound(MAZE_SIZE, Math.random, POOL);
  if (roundData.items.length !== MAZE_COLLECTIBLES) {
    fail(round, `placed ${roundData.items.length} collectibles, expected ${MAZE_COLLECTIBLES}`);
  }
  const roundPath = mazeSolve(roundData.open);
  const onPath = new Set(roundPath.map(([x, y]) => `${x},${y}`));
  for (const item of roundData.items) {
    if (onPath.has(`${item.x},${item.y}`)) fail(round, "collectible sits on the solution path");
    if (roundData.open[item.y][item.x].size !== 1) fail(round, "collectible is not in a dead end");
    if (!POOL.includes(item.id)) fail(round, `collectible id ${item.id} is outside Gen 1`);
  }
}

console.log(`OK — ${ROUNDS} mazes: connected, solvable, symmetric walls, ` +
  `${MAZE_COLLECTIBLES} off-path dead-end collectibles per round.`);
