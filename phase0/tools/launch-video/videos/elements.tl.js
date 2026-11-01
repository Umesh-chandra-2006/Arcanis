// "12 elements. Which one are you?": each element in turn, then the full grid.
(function () {
  const start = 2.6, each = 1.05;
  globalThis.TL = {
    duration: 23,
    fps: 60,
    hook: [0, 2.4],
    start,
    each,
    count: 12,
    grid: start + 12 * each + 0.2,
    ask: start + 12 * each + 0.5,
    end: start + 12 * each + 3.8,
  };
})();
