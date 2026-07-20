"use strict";
const elApp = document.getElementById("app");
const byId = Object.fromEntries(window.DEX.map(m => [m.id, m]));

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}
function sprite(id, kind) { return `assets/sprites/${kind}/${id}.webp`; }
function go(hash) { location.hash = hash; }

function renderHome() {
  elApp.innerHTML = "";
  const brand = el("div", "brand", `<div class="ball"></div><h1>RafaDex</h1>`);
  elApp.append(brand);
  const gameBtn = el("button", "game-btn bounce", "❓ Quem é esse Pokémon?");
  gameBtn.onclick = () => go("#game");
  elApp.append(gameBtn);
  renderShelf();                       // no-op until Task 8
  const grid = el("div", "type-grid");
  for (const [key, info] of Object.entries(window.TYPES)) {
    const btn = el("button", "type-btn bounce",
      `<span class="emoji">${info.emoji}</span><span class="label">${info.name}</span>`);
    btn.style.background = info.color;
    btn.onclick = () => go(`#type/${key}`);
    grid.append(btn);
  }
  elApp.append(grid);
}

function renderShelf() {}              // Task 8
function renderType(key) {}            // Task 5
function renderDetail(id) {}           // Task 5
function renderGame() {}               // Task 10

function renderRoute() {
  const [route, arg] = location.hash.replace(/^#/, "").split("/");
  window.scrollTo(0, 0);
  if (route === "type") renderType(arg);
  else if (route === "dex") renderDetail(Number(arg));
  else if (route === "game") renderGame();
  else renderHome();
}
window.addEventListener("hashchange", renderRoute);
renderRoute();
