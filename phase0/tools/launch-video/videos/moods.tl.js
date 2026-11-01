// "Same element, three moods": three Fire prompts, three different cards.
(function () {
  const beats = [2.4, 7.0, 11.6];
  globalThis.TL = {
    duration: 24,
    fps: 60,
    hook: 0,
    hookOut: 2.1,
    beats,
    type: [0.25, 1.45], // typing window inside a beat
    press: 1.65,
    reveal: 2.1,
    beatLen: 4.6,
    row: 16.2,
    rowCap: 16.4,
    end: 20.0,
  };
})();
