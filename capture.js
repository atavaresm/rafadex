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
  const collectionBtn = el("button", "game-btn bounce", "📦 Minha Coleção");
  collectionBtn.onclick = () => go("#collection");
  elApp.append(collectionBtn);
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
    let startX = 0, startY = 0, dragging = false, resolving = false;
    ball.addEventListener("pointerdown", e => {
      if (resolving) return;
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
      resolving = true;
      resolveThrow(ball, scene, id, () => { resolving = false; });
    });
  }

  function resolveThrow(ball, scene, id, onMissSettled) {
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
        // `resolving` intentionally stays true: this ball is caught and about to
        // be replaced by showMap() in 1.6s, so it must not accept another drag
        // (and re-resolve a second time) while it waits.
      } else {
        ball.classList.add("miss");
        setTimeout(() => {
          ball.classList.remove("miss");
          ball.style.transition = "";
          ball.style.transform = "";
          onMissSettled();
        }, 350);
      }
    }, 260);
  }

  showMap();
}

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
