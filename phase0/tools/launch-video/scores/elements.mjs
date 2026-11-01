// Score for "12 elements": a driving pulse, one rising bell per element (D minor pentatonic),
// a big lift into the grid, and the logo.
import { midi } from "../sound.mjs";

export default function score(m, TL) {
  const D2 = 38, D3 = 50;
  m.pad(0, TL.start, [D2, D2 + 7], 0.3, { attack: 0.4, release: 0.2, bright: 5 });
  m.sweep(0.2, TL.start, 300, 3000, 0.4, (p) => p * p);
  m.boom(0.05, 0.5, 110, 45, 0.6, 0.3);
  const PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89];
  const CHORDS = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]];
  for (let i = 0; i < TL.count; i++) {
    const t = TL.start + i * TL.each;
    m.kick(t, 0.85);
    m.kick(t + TL.each / 2, 0.45);
    m.hat(t + TL.each / 4, 0.07);
    m.hat(t + (3 * TL.each) / 4, 0.07);
    m.bell(t + 0.03, midi(PENTA[i]), 0.14, -0.5 + (i / 11), 1.6, 0.5);
    m.sweep(t - 0.18, t + 0.1, 3000, 800, 0.22, (p) => Math.sin(Math.PI * p), 0.6, -0.6, 0.8, 0.2);
    if (i % 3 === 0) {
      const ch = CHORDS[(i / 3) % 4];
      m.pad(t, t + TL.each * 3, ch.map((x) => D3 + x).concat([D2 + ch[0]]), 0.22, { attack: 0.1, release: 0.3, bright: 6 });
    }
  }
  m.sweep(TL.grid - 0.8, TL.grid, 300, 6000, 0.45, (p) => p ** 2.2);
  m.boom(TL.grid, 1.1, 100, 26, 2.0, 0.6);
  m.crash(TL.grid, 0.4, 2.4);
  m.pad(TL.grid, TL.end, [D2, D3, D3 + 3, D3 + 7, D3 + 10], 0.28, { attack: 0.1, release: 0.5, bright: 6 });
  [74, 77, 81, 86].forEach((n, k) => m.bell(TL.ask + 0.2 + k * 0.15, midi(n), 0.1, -0.3 + k * 0.2, 2));
  m.boom(TL.end + 0.1, 0.8, 90, 30, 2.0, 0.8);
  m.pad(TL.end, TL.duration - 1.2, [D2, D3, D3 + 4, D3 + 7, D3 + 12, D3 + 16], 0.32, { attack: 1.0, release: 1.2, bright: 7, send: 0.7 });
  [86, 90, 93, 98].forEach((n, k) => m.bell(TL.end + 0.9 + k * 0.13, midi(n), 0.08, -0.4 + k * 0.27, 3, 0.8));
  return [];
}
