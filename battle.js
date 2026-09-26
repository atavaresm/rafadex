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
