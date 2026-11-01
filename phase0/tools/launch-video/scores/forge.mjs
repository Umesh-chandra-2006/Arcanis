// Score for "How the forge thinks": a calm explainer pulse, ticks as the prompt types, a rising
// alarm as the spend overflows, a heavy clamp, then the card and the logo.
import { midi } from "../sound.mjs";
import { typeTicks } from "./moods.mjs";

export default function score(m, TL, D) {
  const D2 = 38, D3 = 50;
  const B = TL.budget, S = TL.spend, C = TL.cap, R = TL.result;
  m.pad(0, B.start, [D2, D2 + 7], 0.28, { attack: 0.4, release: 0.3, bright: 5 });
  m.boom(0.05, 0.45, 110, 45, 0.6, 0.3);
  m.bell(0.4, midi(74), 0.1, 0, 2);
  // A steady, thoughtful pulse through the explanation (Dm, Bb, F, C).
  const CHORDS = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]];
  for (let b = 0, t = B.start; t < R.start - 0.01; b++, t += 2) {
    const ch = CHORDS[b % 4];
    m.pad(t, Math.min(t + 2, R.start), ch.map((x) => D3 + x).concat([D2 + ch[0]]), 0.2, { attack: 0.3, release: 0.4, bright: 5, send: 0.4 });
    for (let s = 0; s < 4; s++) if (t + s * 0.5 < R.start) m.kick(t + s * 0.5, s === 0 ? 0.6 : 0.35);
  }
  // I: the bar fills, the marker cuts.
  m.sweep(B.fill[0], B.fill[1], 400, 2400, 0.3, (p) => Math.sin(Math.PI * p));
  m.boom(B.marker, 0.6, 120, 50, 0.5, 0.3);
  m.bell(B.marker + 0.05, midi(81), 0.12, 0, 1.6);
  // II: typing, then each stat a rising pluck, then an alarm.
  typeTicks(m, D.forge.card.prompt, S.type[0], S.type[1]);
  [0, 1, 2, 3].forEach((i) => m.pluck(S.grow[0] + i * 0.5, D3 + 12 + [0, 3, 7, 12][i], 0.18, -0.4 + i * 0.27));
  for (let t = S.over; t < C.clamp[0]; t += 0.5) m.bell(t, midi(83), 0.06, 0, 0.4, 0.2);
  m.sweep(S.over, C.clamp[0], 500, 3000, 0.25, (p) => p);
  // III: the vise.
  m.sweep(C.start + 0.3, C.clamp[0], 3000, 600, 0.35, (p) => Math.sin(Math.PI * p), 0.8, 0.2, 0.8);
  m.sweep(C.clamp[0], C.clamp[1], 200, 2000, 0.45, (p) => p * p);
  m.boom(C.clamp[1], 1.1, 90, 26, 1.6, 0.5);
  m.crash(C.clamp[1], 0.3, 1.6);
  m.bell(C.clamp[1] + 0.05, midi(74), 0.16, 0, 2.5);
  // Result.
  m.sweep(R.start - 0.6, R.reveal, 300, 5000, 0.4, (p) => p ** 2);
  m.boom(R.reveal, 1.2, 100, 24, 2.2, 0.6);
  m.crash(R.reveal, 0.5, 2.4);
  m.bell(R.reveal, midi(62), 0.18, -0.2, 3.2, 0.8);
  m.pad(R.reveal, TL.end, [D2, D3, D3 + 3, D3 + 7], 0.28, { attack: 0.05, release: 0.5, bright: 6 });
  m.boom(R.cap + 0.7, 0.5, 90, 40, 0.6, 0.4);
  m.boom(TL.end + 0.1, 0.8, 90, 30, 2.0, 0.8);
  m.pad(TL.end, TL.duration - 1.2, [D2, D3, D3 + 4, D3 + 7, D3 + 12, D3 + 16], 0.32, { attack: 1.0, release: 1.2, bright: 7, send: 0.7 });
  [86, 90, 93, 98].forEach((n, k) => m.bell(TL.end + 0.9 + k * 0.13, midi(n), 0.08, -0.4 + k * 0.27, 3, 0.8));
  return [[R.reveal - 0.1, R.reveal]];
}
