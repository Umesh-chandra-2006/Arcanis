// Score for "I turned my name into a spell": riser and typing, the forge heartbeat, a big Earth hit,
// a playful pulse under "What would yours be?", and the logo.
import { midi } from "../sound.mjs";
import { typeTicks } from "./moods.mjs";

export default function score(m, TL, D) {
  const D2 = 38, D3 = 50;
  m.pad(0, TL.forge[0], [D2, D2 + 7], 0.3, { attack: 0.3, release: 0.2, bright: 5 });
  m.sweep(0, TL.press, 200, 1600, 0.45, (p) => p * p);
  [0, 0.4].forEach((d) => m.boom(0.05 + d, 0.35, 120, 50, 0.4, 0.2));
  typeTicks(m, D.nameSpell.prompt, TL.type[0], TL.type[1]);
  m.bell(TL.press, midi(74), 0.12, 0, 1.2, 0.4);
  m.sweep(TL.press, TL.forge[0] + 0.4, 3000, 500, 0.6, (p) => Math.sin(Math.PI * p), 0.8, -0.2, 0.7);
  m.sweep(TL.forge[0], TL.reveal - 0.1, 300, 6000, 0.6, (p) => p ** 2.2, 0, 0, 0.35, 0.3);
  m.pad(TL.forge[0], TL.reveal - 0.1, [D3, D3 + 1, D3 + 7], 0.2, { attack: 1.2, release: 0.05, bright: 7, detune: 0.01 });
  TL.status.forEach((s, i) => { m.boom(s, 0.5 + i * 0.12, 70, 40, 0.3, 0.15); m.boom(s + 0.16, 0.3, 70, 40, 0.25, 0.1); });
  m.bell(TL.status[2], midi(81), 0.14, 0.2, 1.4);
  m.boom(TL.reveal, 1.3, 100, 24, 2.4, 0.6);
  m.crash(TL.reveal, 0.55, 2.6);
  m.bell(TL.reveal, midi(62), 0.2, -0.2, 3.5, 0.8);
  m.bell(TL.reveal + 0.01, midi(69), 0.15, 0.2, 3.5, 0.8);
  m.pad(TL.reveal, TL.lore[1], [D2, D3, D3 + 3, D3 + 7], 0.28, { attack: 0.02, release: 0.4, bright: 6 });
  m.boom(TL.meet + 0.6, 0.5, 90, 40, 0.6, 0.4);
  m.sweep(TL.lore[0], TL.ask, 400, 2500, 0.35, (p) => p * p, 0, 0, 0.5, 0.5);
  // "What would yours be?": light and bouncy.
  for (let t = TL.ask, n = 0; t < TL.end - 0.01; t += 0.25, n++) {
    if (n % 2 === 0) m.kick(t, n % 8 === 0 ? 0.8 : 0.55);
    m.pluck(t, D3 + 12 + [0, 7, 12, 7, 3, 7, 12, 15][n % 8], 0.12, n % 2 ? 0.3 : -0.3);
  }
  m.pad(TL.ask, TL.end, [D3, D3 + 3, D3 + 7, D3 + 10], 0.22, { attack: 0.2, release: 0.4 });
  m.boom(TL.end + 0.1, 0.8, 90, 30, 2.0, 0.8);
  m.pad(TL.end, TL.duration - 1.2, [D2, D3, D3 + 4, D3 + 7, D3 + 12, D3 + 16], 0.32, { attack: 1.0, release: 1.2, bright: 7, send: 0.7 });
  [86, 90, 93, 98].forEach((n, k) => m.bell(TL.end + 0.9 + k * 0.13, midi(n), 0.08, -0.4 + k * 0.27, 3, 0.8));
  return [[TL.reveal - 0.12, TL.reveal]];
}
