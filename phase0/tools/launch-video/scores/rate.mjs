// Score for "Rate this spell": a quiet pulse, a suspense roll into the flip, a comic buzz under the
// bees, a ticking dial, and the logo.
import { midi } from "../sound.mjs";

export default function score(m, TL) {
  const D2 = 38, D3 = 50;
  m.pad(0, TL.flip[0], [D2, D2 + 7, D3 + 3], 0.28, { attack: 0.5, release: 0.1, bright: 5 });
  m.boom(0.05, 0.5, 110, 45, 0.6, 0.3);
  m.bell(0.3, midi(74), 0.1, 0, 2);
  m.roll(TL.roll[0], TL.flip[0], 0.16);
  m.sweep(TL.roll[0], TL.flip[0], 300, 5000, 0.5, (p) => p ** 2.5);
  m.sweep(TL.flip[0], TL.flip[1], 3500, 700, 0.45, (p) => Math.sin(Math.PI * p), 0.6, -0.6, 0.8);
  m.boom(TL.reveal, 1.2, 100, 26, 2.0, 0.6);
  m.crash(TL.reveal, 0.5, 2.4);
  m.bell(TL.reveal, midi(69), 0.18, 0, 3.0, 0.8);
  m.pad(TL.reveal, TL.comment, [D3, D3 + 4, D3 + 7, D3 + 11], 0.24, { attack: 0.05, release: 0.4, bright: 6 });
  // Bees: a buzzing sawtooth-ish pad wobbling under the prompt.
  m.pad(TL.prompt, TL.lore[0], [D3 + 19, D3 + 19.3], 0.05, { attack: 0.3, release: 0.3, bright: 9, detune: 0.02, lfo: 0.6, send: 0.1 });
  for (let t = TL.prompt, n = 0; t < TL.comment; t += 0.25, n++) {
    if (n % 2 === 0) m.kick(t, 0.5);
    m.pluck(t, D3 + 12 + [0, 4, 7, 4][n % 4], 0.1, n % 2 ? 0.3 : -0.3);
  }
  m.boom(TL.lore[0] + 0.1, 0.5, 90, 40, 0.8, 0.5);
  m.boom(TL.comment, 0.6, 90, 40, 0.6, 0.4);
  // The dial: one tick per number change, then a bell on "?".
  for (let i = 0; i < 27; i++) {
    const t = TL.ticker[0] + Math.pow(i / 27, 1 / 0.6) * (TL.ticker[1] - TL.ticker[0]);
    m.tick(t, 0.12);
  }
  m.bell(TL.ticker[1], midi(81), 0.18, 0, 2.2);
  m.boom(TL.end + 0.1, 0.8, 90, 30, 2.0, 0.8);
  m.pad(TL.end, TL.duration - 1.2, [D2, D3, D3 + 4, D3 + 7, D3 + 12, D3 + 16], 0.32, { attack: 1.0, release: 1.2, bright: 7, send: 0.7 });
  [86, 90, 93, 98].forEach((n, k) => m.bell(TL.end + 0.9 + k * 0.13, midi(n), 0.08, -0.4 + k * 0.27, 3, 0.8));
  return [[TL.reveal - 0.1, TL.reveal]];
}
