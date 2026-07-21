"use strict";
const elApp = document.getElementById("app");
const byId = Object.fromEntries(window.DEX.map(m => [m.id, m]));
let contextIds = [];                  // ordered ids of the active browsing context

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}
function sprite(id, kind) { return `assets/sprites/${kind}/${id}.webp`; }
function go(hash) { location.hash = hash; }

function currentList() { return contextIds; }

function topbar(title, backHash, tint) {
  const bar = el("div", "topbar");
  const back = el("button", "back-btn bounce", "⬅️");
  back.onclick = () => go(backHash);
  bar.append(back, el("span", "title", title));
  if (tint) document.body.style.background = tint + "33";
  return bar;
}

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
  const gear = el("button", "gear", "⚙️");
  gear.setAttribute("aria-label", "Downloads para uso offline");
  let panelOpen = false;
  gear.onclick = () => {
    if (panelOpen) { elApp.querySelector(".parent-panel")?.remove(); panelOpen = false; return; }
    elApp.append(renderParentPanel()); panelOpen = true;
  };
  elApp.append(gear);
}

function renderShelf() {}              // Task 8

function renderType(key) {
  const info = window.TYPES[key];
  contextIds = window.DEX.filter(m => m.types.includes(key)).map(m => m.id);
  elApp.innerHTML = "";
  elApp.append(topbar(`${info.emoji} ${info.name}`, "#home", info.color));
  const grid = el("div", "mon-grid");
  for (const id of contextIds) {
    const mon = byId[id];
    const card = el("button", "mon-card bounce",
      `<img loading="lazy" src="${sprite(id, "thumb")}" alt=""><span class="name">${mon.name}</span>`);
    card.querySelector("img").onerror = e => { e.target.src = ""; e.target.style.background = "#ddd"; };
    card.onclick = () => go(`#dex/${id}`);
    grid.append(card);
  }
  elApp.append(grid);
}

function renderDetail(id) {
  const mon = byId[id];
  if (!mon) return go("#home");
  if (!contextIds.length) contextIds = window.DEX.map(m => m.id);
  const tint = window.TYPES[mon.types[0]].color;
  elApp.innerHTML = "";
  elApp.append(topbar(mon.types.map(t => window.TYPES[t].emoji).join(" "),
    `#type/${mon.types[0]}`, tint));
  const box = el("div", "detail");
  box.append(el("img", "hero", undefined));
  const hero = box.querySelector("img");
  hero.src = sprite(id, "full");
  const blankPixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7";
  hero.onerror = () => { hero.src = blankPixel; hero.classList.add("hero-missing"); };
  box.append(el("div", "mon-name", mon.name));
  box.append(el("div", "sound-row", ""), el("div", "", ""));
  box.children[2].id = "soundBtns";
  box.children[3].id = "favBtn";
  box.append(el("div", "", "")); box.lastChild.id = "evoStrip";
  elApp.append(box);
  const idx = contextIds.indexOf(id);
  const arrows = el("div", "nav-arrows");
  const prev = el("button", "bounce", "‹"), next = el("button", "bounce", "›");
  prev.onclick = () => go(`#dex/${contextIds[(idx - 1 + contextIds.length) % contextIds.length]}`);
  next.onclick = () => go(`#dex/${contextIds[(idx + 1) % contextIds.length]}`);
  arrows.append(prev, next);
  elApp.append(arrows);
}

function renderGame() {}               // Task 10

function renderRoute() {
  document.body.style.background = "";
  const [route, arg] = location.hash.replace(/^#/, "").split("/");
  window.scrollTo(0, 0);
  if (route === "type") renderType(arg);
  else if (route === "dex") renderDetail(Number(arg));
  else if (route === "game") renderGame();
  else renderHome();
}
window.addEventListener("hashchange", renderRoute);
renderRoute();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
  navigator.storage?.persist?.();
}

async function cachedFullIds() {
  if (!("caches" in window)) return new Set();
  const runtime = await caches.open("rafadex-runtime");
  const keys = await runtime.keys();
  const ids = new Set();
  for (const req of keys) {
    const match = req.url.match(/sprites\/full\/(\d+)\.webp$/);
    if (match) ids.add(Number(match[1]));
  }
  return ids;
}

function genAssets(gen) {
  return window.DEX.filter(m => m.gen === gen).flatMap(m =>
    [sprite(m.id, "thumb"), sprite(m.id, "full"), `assets/cries/${m.id}.m4a`]);
}

async function cacheGen(gen, onProgress) {
  const urls = genAssets(gen);
  let done = 0, failed = 0;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) failed++;
    } catch (err) { failed++; }
    onProgress(++done, urls.length);
  }
  return failed;
}

function renderParentPanel() {
  const panel = el("div", "parent-panel");
  panel.append(el("div", "title", "Baixar para usar sem internet"));
  const gens = [...new Set(window.DEX.map(m => m.gen))];
  for (const gen of gens) {
    const row = el("button", "gen-row bounce", `Geração ${gen}`);
    row.onclick = async () => {
      row.disabled = true;
      const failed = await cacheGen(gen, (done, total) => { row.textContent = `Geração ${gen} — ${done}/${total}`; });
      if (failed === 0) {
        row.textContent = `Geração ${gen} ✓`;
      } else {
        row.textContent = `Geração ${gen} — ⚠ ${failed} falharam`;
        row.disabled = false;
      }
    };
    panel.append(row);
  }
  return panel;
}
