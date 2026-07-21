"use strict";
const Sound = (() => {
  let ctx = null;
  let voice = null;

  function unlock() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    if (window.speechSynthesis && !voice) pickVoice();
  }

  function pickVoice() {
    const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith("pt"));
    voice = voices.find(v => /luciana/i.test(v.name)) || voices[0] || null;
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = pickVoice;

  function tone(freq, start, duration, gainValue) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + duration);
  }

  function pop() { if (ctx) tone(880, 0, .09, .15); }

  function fanfare() {
    if (!ctx) return;
    [[523, 0], [659, .12], [784, .24], [1047, .36]].forEach(([f, t]) => tone(f, t, .28, .2));
  }

  let cryEl = null;
  function cry(id) {
    stopSpeech();
    if (cryEl) cryEl.pause();
    cryEl = new Audio(`assets/cries/${id}.m4a`);
    cryEl.play().catch(() => pop());
    return new Promise(resolve => { cryEl.onended = resolve; cryEl.onerror = resolve; });
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    if (voice) utterance.voice = voice;
    utterance.rate = .95;
    speechSynthesis.speak(utterance);
  }

  function stopSpeech() { window.speechSynthesis?.cancel(); }

  return { unlock, cry, speak, stopSpeech, pop, fanfare };
})();
window.addEventListener("pointerdown", () => Sound.unlock(), { once: true });
