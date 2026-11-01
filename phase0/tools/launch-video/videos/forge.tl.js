// "How the forge thinks": the Power Budget, explained with the real numbers.
globalThis.TL = {
  duration: 31,
  fps: 60,
  hook: [0, 2.8],
  budget: { start: 3.0, bar: 3.4, fill: [3.9, 4.9], marker: 5.3, sub: 5.9, out: 8.6 },
  spend: { start: 8.8, type: [9.3, 10.8], grow: [11.0, 13.0], over: 13.1, sub: 13.5, out: 15.3 },
  cap: { start: 15.5, clamp: [16.4, 17.2], sub: 17.6, sub2: 18.6, out: 20.9 },
  result: { start: 21.2, reveal: 21.5, cap: 21.8, strip: 22.4, out: 26.3 },
  end: 26.6,
};
