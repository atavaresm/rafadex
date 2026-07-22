"use strict";
const elApp = document.getElementById("app");
const byId = Object.fromEntries(window.DEX.map(m => [m.id, m]));
let contextIds = [];                  // ordered ids of the active browsing context

const Favs = {
  key: "rafadex.favorites",
  list() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
  has(id) { return this.list().includes(id); },
  toggle(id) {
    const list = this.list();
    const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
    localStorage.setItem(this.key, JSON.stringify(next));
  },
};

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

function currentList() { return contextIds; }

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

function renderHome() {
  elApp.innerHTML = "";
  const gameBtn = el("button", "game-btn bounce", "❓ Quem é esse Pokémon?");
  gameBtn.onclick = () => go("#game");
  elApp.append(gameBtn);
  renderShelf();                       // no-op until Task 8
  const grid = el("div", "type-grid");
  for (const [key, info] of Object.entries(window.TYPES)) {
    const btn = el("button", "type-btn bounce",
      `<span class="emoji">${info.emoji}</span><span class="label">${info.name}</span>`);
    btn.style.background = typeGradient(info.color);
    btn.onclick = () => go(`#type/${key}`);
    grid.append(btn);
  }
  elApp.append(grid);
  const gear = el("button", "gear", "⚙️");
  gear.setAttribute("aria-label", "Downloads para uso offline");
  const search = el("button", "gear", "🔍");
  search.setAttribute("aria-label", "Buscar Pokémon por nome");
  let panelOpen = null;
  function closePanels() {
    elApp.querySelector(".parent-panel")?.remove();
    elApp.querySelector(".search-panel")?.remove();
    panelOpen = null;
  }
  gear.onclick = () => {
    const wasOpen = panelOpen === "gear";
    closePanels();
    if (!wasOpen) { elApp.append(renderParentPanel()); panelOpen = "gear"; }
  };
  search.onclick = () => {
    const wasOpen = panelOpen === "search";
    closePanels();
    if (!wasOpen) { elApp.append(renderSearchPanel()); panelOpen = "search"; }
  };
  const toolRow = el("div", "tool-row");
  toolRow.append(gear, search);
  elApp.append(toolRow);
}

function renderShelf() {
  const ids = Favs.list();
  if (!ids.length) return;
  const shelf = el("div", "shelf");
  for (const id of ids) {
    const img = el("img", "bounce");
    img.src = sprite(id, "thumb");
    img.onclick = () => { contextIds = Favs.list(); go(`#dex/${id}`); };
    shelf.append(img);
  }
  elApp.append(shelf);
}

function renderType(key) {
  const info = window.TYPES[key];
  contextIds = window.DEX.filter(m => m.types.includes(key)).map(m => m.id);
  elApp.innerHTML = "";
  elApp.append(topbar(`${info.emoji} ${info.name}`, "#home", info.color));
  const grid = el("div", "mon-grid");
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
  elApp.append(grid);
}

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
  const sounds = box.querySelector("#soundBtns") || box.children[2];
  let speaking = null;
  function setSpeaking(which) {
    speaking = which;
    nameBtn.classList.toggle("speaking", which === "name");
    readBtn.classList.toggle("speaking", which === "read");
  }
  const nameBtn = el("button", "bounce", "🔊");
  nameBtn.onclick = () => {
    if (speaking === "name") { Sound.stopSpeech(); setSpeaking(null); return; }
    setSpeaking("name");
    Sound.speak(mon.speak || mon.name, () => setSpeaking(null));
  };
  const cryBtn = el("button", "bounce", "⚡");
  cryBtn.onclick = () => Sound.cry(id);
  const readBtn = el("button", "bounce", "📖");
  readBtn.onclick = () => {
    if (speaking === "read") { Sound.stopSpeech(); setSpeaking(null); return; }
    setSpeaking("read");
    Sound.speak(`${mon.speak || mon.name}. ${mon.cat}. ${mon.flavor}`, () => setSpeaking(null));
  };
  if (!window.speechSynthesis) { nameBtn.hidden = true; readBtn.hidden = true; }
  sounds.append(nameBtn, cryBtn, readBtn);
  const favMount = box.querySelector("#favBtn") || box.children[3];
  const heart = el("button", "heart bounce", Favs.has(id) ? "❤️" : "🤍");
  heart.onclick = () => { Favs.toggle(id); heart.textContent = Favs.has(id) ? "❤️" : "🤍"; };
  favMount.append(heart);

  const evoMount = box.querySelector("#evoStrip") || box.lastChild;
  const chain = mon.evo.flat().filter(evoId => byId[evoId]);
  if (chain.length > 1) {
    const strip = el("div", "evo-strip");
    chain.forEach((evoId, i) => {
      if (i > 0) strip.append(el("span", "evo-arrow", "➡️"));
      const img = el("img", "bounce" + (evoId === id ? " current" : ""));
      img.src = sprite(evoId, "thumb");
      img.onclick = () => {
        if (evoId === id) { Sound.speak(byId[evoId].speak || byId[evoId].name); return; }
        const fromName = byId[id].speak || byId[id].name, toName = byId[evoId].speak || byId[evoId].name;
        go(`#dex/${evoId}`);
        const stageOfCurrent = mon.evo.findIndex(s => s.includes(id));
        const stageOfTarget = mon.evo.findIndex(s => s.includes(evoId));
        const phrase = stageOfTarget > stageOfCurrent ? `${fromName} evolui para ${toName}!` : toName;
        setTimeout(() => Sound.speak(phrase), 50);
      };
      strip.append(img);
    });
    evoMount.append(strip);
  }

  elApp.append(box);
  const idx = contextIds.indexOf(id);
  const goToIndex = delta => go(`#dex/${contextIds[(idx + delta + contextIds.length) % contextIds.length]}`);
  const arrows = el("div", "nav-arrows");
  const prev = el("button", "bounce", "‹"), next = el("button", "bounce", "›");
  prev.onclick = () => goToIndex(-1);
  next.onclick = () => goToIndex(1);
  arrows.append(prev, next);
  elApp.append(arrows);

  let touchStartX = 0, touchStartY = 0, touchOnEvoStrip = false;
  box.addEventListener("touchstart", e => {
    touchOnEvoStrip = !!e.target.closest(".evo-strip");
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  box.addEventListener("touchend", e => {
    if (touchOnEvoStrip) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    goToIndex(dx < 0 ? 1 : -1);
  }, { passive: true });
}

async function gameCandidates() {
  const gen1 = window.DEX.filter(m => m.gen === 1).map(m => m.id);
  const cached = await cachedFullIds();
  return [...new Set([...gen1, ...cached])];
}

function renderGame() {
  elApp.innerHTML = "";
  elApp.append(topbar("❓", "#home", "#ffcb05"));
  const stage = el("div", "game-stage");
  elApp.append(stage);
  let revealed = false;
  let current = null;

  async function nextRound() {
    const pool = await gameCandidates();
    current = pool[Math.floor(Math.random() * pool.length)];
    revealed = false;
    stage.innerHTML = "";
    const img = el("img", "silhouette");
    img.src = sprite(current, "full");
    stage.append(img, el("div", "game-hint", "Quem é esse Pokémon?"));
    Sound.cry(current);
    img.onclick = reveal;
    stage.onclick = reveal;
  }

  function reveal() {
    if (revealed || current === null) return;
    revealed = true;
    stage.querySelector("img").classList.remove("silhouette");
    stage.querySelector(".game-hint").textContent = byId[current].name;
    Sound.fanfare();
    setTimeout(() => Sound.speak(`É o ${byId[current].speak || byId[current].name}!`), 500);
    confettiBurst(stage);
    const next = el("button", "game-btn bounce", "➡️ Próximo");
    next.onclick = e => { e.stopPropagation(); nextRound(); };
    stage.append(next);
  }

  nextRound();
}

function confettiBurst(parent) {
  for (let i = 0; i < 24; i++) {
    const bit = el("span", "confetti");
    bit.style.left = 50 + (Math.random() * 60 - 30) + "%";
    bit.style.background = ["#e3350d", "#ffcb05", "#6890f0", "#78c850"][i % 4];
    bit.style.animationDelay = Math.random() * .3 + "s";
    parent.append(bit);
    setTimeout(() => bit.remove(), 1800);
  }
}

const scrollPositions = {};
let previousHash = null;

function renderRoute() {
  if (previousHash !== null) scrollPositions[previousHash] = window.scrollY;
  document.body.style.background = "";
  Sound.stopSpeech();
  const [route, arg] = location.hash.replace(/^#/, "").split("/");
  if (route === "type") renderType(arg);
  else if (route === "dex") renderDetail(Number(arg));
  else if (route === "game") renderGame();
  else renderHome();
  window.scrollTo(0, scrollPositions[location.hash] || 0);
  previousHash = location.hash;
}
window.addEventListener("hashchange", renderRoute);
renderRoute();

document.addEventListener("pointerdown", e => {
  if (e.target.closest("button")) Sound.pop();
});

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

function normalizeSearch(text) {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function renderSearchPanel() {
  const panel = el("div", "search-panel");
  const input = el("input", "search-input");
  input.type = "text";
  input.placeholder = "Buscar por nome...";
  panel.append(input);
  const results = el("div", "search-results");
  panel.append(results);

  input.oninput = () => {
    const query = normalizeSearch(input.value.trim());
    results.innerHTML = "";
    if (!query) return;
    const matches = window.DEX.filter(m => normalizeSearch(m.name).includes(query)).slice(0, 20);
    for (const mon of matches) {
      const row = el("button", "search-result bounce",
        `<img src="${sprite(mon.id, "thumb")}" alt=""><span>${mon.name}</span>`);
      row.onclick = () => { contextIds = window.DEX.map(m => m.id); go(`#dex/${mon.id}`); };
      results.append(row);
    }
  };
  return panel;
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
