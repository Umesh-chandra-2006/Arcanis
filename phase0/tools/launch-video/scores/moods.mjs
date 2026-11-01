// Score for "Same element, three moods": a pulse in D minor, each mood revealed with its own colour
// (scary: low and dark, cute: bright plucks, poetic: warm major pad), resolving to D major on the logo.
import { midi } from "../sound.mjs";

export function typeTicks(m, prompt, a, b) {
  [...prompt].forEach((ch, i) => { if (ch !== " ") m.tick(a + (i / prompt.length) * (b - a)); });
}

export default function score(m, TL, D) {
  const D2 = 38, D3 = 50;
  m.pad(0, TL.beats[0], [D2, D2 + 7], 0.3, { attack: 0.4, release: 0.3, bright: 5 });
  m.sweep(0.2, TL.beats[0], 300, 1500, 0.35, (p) => p * p);
  m.bell(0.05, midi(74), 0.12, 0, 2);
  // Pulse from the first beat to the row.
  const [p0, p1] = [TL.beats[0], TL.row];
  for (let t = p0, n = 0; t < p1 - 0.01; t += 0.5, n++) {
    m.kick(t, n % 4 === 0 ? 0.9 : 0.6);
    m.hat(t + 0.25, 0.08);
  }
  const moodNotes = [[D2, D3, D3 + 3, D3 + 6], [D3 + 12, D3 + 16, D3 + 19], [D2, D3, D3 + 4, D3 + 7, D3 + 11]];
  TL.beats.forEach((s, i) => {
    const c = D.moods[i];
    typeTicks(m, c.prompt, s + TL.type[0], s + TL.type[1]);
    m.bell(s + TL.press, midi(74), 0.1, 0, 1.0, 0.4);
    m.sweep(s + TL.press, s + TL.reveal, 800, 5000, 0.4, (p) => p * p, 0, 0, 0.4, 0.3);
    const rv = s + TL.reveal;
    m.boom(rv, i === 0 ? 1.1 : 0.8, i === 0 ? 80 : 110, i === 0 ? 24 : 32, 1.6, 0.6);
    m.crash(rv, 0.35, 2.0);
    m.pad(rv, s + TL.beatLen, moodNotes[i], 0.26, { attack: 0.05, release: 0.4, bright: i === 0 ? 4 : 7, detune: i === 0 ? 0.012 : 0.005 });
    if (i === 1) [86, 90, 93, 98, 93].forEach((n, k) => m.pluck(rv + 0.3 + k * 0.18, n - 12, 0.16, k % 2 ? 0.3 : -0.3));
    else m.bell(rv, midi(i === 0 ? 62 : 69), 0.2, 0, 3.2, 0.8);
    m.sweep(s + TL.beatLen - 0.5, s + TL.beatLen + 0.1, 3000, 500, 0.35, (p) => Math.sin(Math.PI * p), 0.7, -0.7, 0.8, 0.3);
  });
  // The row: a lift, three hits for the three cards.
  m.sweep(TL.row - 0.8, TL.row, 300, 4000, 0.4, (p) => p ** 2);
  m.pad(TL.row, TL.end, [D2, D3, D3 + 3, D3 + 7, D3 + 10], 0.3, { attack: 0.3, release: 0.6, bright: 6 });
  [0, 0.12, 0.24].forEach((d, k) => m.bell(TL.row + 0.3 + d, midi([74, 77, 81][k]), 0.12, -0.4 + k * 0.4, 2));
  m.boom(TL.rowCap, 0.6, 90, 40, 0.8, 0.4);
  // Logo.
  m.boom(TL.end + 0.1, 0.8, 90, 30, 2.0, 0.8);
  m.pad(TL.end, TL.duration - 1.2, [D2, D3, D3 + 4, D3 + 7, D3 + 12, D3 + 16], 0.32, { attack: 1.0, release: 1.2, bright: 7, send: 0.7 });
  [86, 90, 93, 98].forEach((n, k) => m.bell(TL.end + 0.9 + k * 0.13, midi(n), 0.08, -0.4 + k * 0.27, 3, 0.8));
  return TL.beats.map((s) => [s + TL.reveal - 0.1, s + TL.reveal]);
}
