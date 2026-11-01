// Shared timeline for the launch video: the page (picture) and audio.mjs (sound) both read it,
// so every hit lands on its frame. Times in seconds. Loaded as a plain script in the page and
// imported for its side effect in Node.
(function () {
  const PROMPT = ["Erases my enemy from existence.", " Costs nothing.", " Cannot be blocked.", " Cannot miss."];
  const CLAUSE_START = [0.2, 0.95, 1.55, 2.1];
  const CPS = 60; // typing speed, characters per second

  // Time each character of the hook prompt appears, for the caret and the key ticks.
  const keyTimes = [];
  const clauseEnds = [];
  PROMPT.forEach((clause, i) => {
    for (let c = 0; c < clause.length; c++) if (clause[c] !== " ") keyTimes.push(CLAUSE_START[i] + c / CPS);
    clauseEnds.push(CLAUSE_START[i] + clause.length / CPS);
  });

  const BEAT = 0.5; // 120 bpm
  const TL = {
    duration: 30,
    fps: 60,
    prompt: PROMPT,
    clauseStart: CLAUSE_START,
    cps: CPS,
    keyTimes,
    clauseEnds,
    press: 2.65,
    dissolve: [2.85, 3.45],
    forge: [3.2, 5.1],
    status: [3.4, 3.95, 4.5],
    reveal: 5.1,
    capA: 5.35,
    strip: 6.0,
    capB: 6.7,
    lore: [7.9, 9.0],
    whip: 9.0,
    montage: [9.6, 12.1, 14.6],
    montageLen: 2.5,
    fan: 17.1,
    fanLines: [17.4, 18.0, 18.6],
    codex: 19.6,
    vote: 20.6,
    drop: 21.6,
    dropLines: [22.0, 23.2],
    logo: 24.4,
    tagline: 25.6,
    url: 26.3,
    footer: 26.8,
    beat: BEAT,
    pulse: [9.6, 21.6], // driving rhythm section
  };
  globalThis.TL = TL;
})();
