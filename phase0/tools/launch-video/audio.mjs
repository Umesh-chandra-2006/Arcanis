// Procedural score and sound design for the launch video, timed from timeline.js.
// Writes out/audio_raw.wav (48 kHz stereo, 16-bit); render.mjs muxes it after loudness normalisation.
//
//   node audio.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import "./timeline.js";

const TL = globalThis.TL;
const SR = 48000;
const N = Math.round(TL.duration * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const SL = new Float32Array(N), SRv = new Float32Array(N); // reverb send
const TAU = Math.PI * 2;

// Deterministic noise
let seed = 1234567;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const idx = (t) => Math.round(t * SR);

function put(i, v, pan = 0, send = 0) {
  if (i < 0 || i >= N) return;
  const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
  L[i] += v * gl; R[i] += v * gr;
  if (send) { SL[i] += v * gl * send; SRv[i] += v * gr * send; }
}

// One-pole filters and a state-variable bandpass, as small closures.
const onePoleLP = (fc) => { const a = Math.exp((-TAU * fc) / SR); let y = 0; return (x, f) => { const aa = f ? Math.exp((-TAU * f) / SR) : a; y = (1 - aa) * x + aa * y; return y; }; };
const svfBP = () => { let lp = 0, bp = 0; return (x, fc, q = 0.6) => { const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR); const hp = x - lp - q * bp; bp += f * hp; lp += f * bp; return bp; }; };

// ---------- instruments ----------
function kick(t, gain = 1) {
  const i0 = idx(t), len = idx(0.45);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const f = 44 + 120 * Math.exp(-tt * 32);
    ph += (TAU * f) / SR;
    const env = Math.exp(-tt * 7.5);
    const click = k < 120 ? rand() * 0.25 * (1 - k / 120) : 0;
    put(i0 + k, (Math.sin(ph) * env + click) * 0.9 * gain, 0, 0.05);
  }
}
function hat(t, gain = 0.12, pan = 0.3) {
  const i0 = idx(t), len = idx(0.05);
  let prev = 0;
  for (let k = 0; k < len; k++) {
    const x = rand(); const hp = x - prev; prev = x;
    put(i0 + k, hp * Math.exp((-k / SR) * 90) * gain, pan, 0.1);
  }
}
function boom(t, gain = 1, f0 = 90, f1 = 28, decay = 1.6, send = 0.5) {
  const i0 = idx(t), len = idx(decay * 2.2);
  let ph = 0;
  const lp = onePoleLP(900);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const f = f1 + (f0 - f1) * Math.exp(-tt * 3.2);
    ph += (TAU * f) / SR;
    const env = Math.exp(-tt / (decay * 0.45)) * Math.min(1, k / 60);
    const nz = lp(rand()) * Math.exp(-tt * 9) * 1.6;
    const v = (Math.sin(ph) * 0.95 + Math.sin(ph * 2) * 0.12 + nz) * env * gain;
    put(i0 + k, v, 0, send);
  }
}
function crash(t, gain = 0.35, decay = 2.2) {
  const i0 = idx(t), len = idx(decay * 1.8);
  let p1 = 0, p2 = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const x = rand(); const hp = x - p1; p1 = x; const hp2 = hp - p2; p2 = hp;
    const env = Math.exp(-tt / (decay * 0.35));
    put(i0 + k, hp2 * env * gain * 0.6, (rand() * 0.6), 0.6);
  }
}
function bell(t, f, gain = 0.25, pan = 0, decay = 2.6, send = 0.55) {
  const i0 = idx(t), len = idx(decay * 1.6);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const env = Math.exp(-tt / (decay * 0.3)) * Math.min(1, k / 40);
    const idxm = 2.2 * Math.exp(-tt * 3);
    const v = Math.sin(TAU * f * tt + idxm * Math.sin(TAU * f * 3.5 * tt)) + 0.35 * Math.sin(TAU * f * 2.01 * tt) * Math.exp(-tt * 2);
    put(i0 + k, v * env * gain, pan, send);
  }
}
function tick(t, gain = 0.09) {
  const i0 = idx(t), len = idx(0.03);
  const f = 2200 + rand() * 900;
  let prev = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const x = rand(); const hp = x - prev; prev = x;
    put(i0 + k, (hp * 0.6 + Math.sin(TAU * f * tt) * 0.4) * Math.exp(-tt * 180) * gain, rand() * 0.3, 0.08);
  }
}
// Filtered-noise sweep (whoosh or riser). f0 to f1 over the span, amp shaped by env(p).
function sweep(t0, t1, f0, f1, gain, env, panFrom = 0, panTo = 0, q = 0.5, send = 0.4) {
  const i0 = idx(t0), len = idx(t1 - t0);
  const bp = svfBP(), bp2 = svfBP();
  for (let k = 0; k < len; k++) {
    const p = k / len;
    const fc = f0 * Math.pow(f1 / f0, p);
    const v = bp2(bp(rand(), fc, q), fc, q) * env(p) * gain;
    put(i0 + k, v, panFrom + (panTo - panFrom) * p, send);
  }
}
// Harmonic tone with soft attack and release: pads and drones.
function pad(t0, t1, notes, gain, { attack = 0.6, release = 0.8, bright = 6, detune = 0.004, send = 0.5, lfo = 0.15 } = {}) {
  const i0 = idx(t0), len = idx(t1 - t0 + release);
  const voices = [];
  notes.forEach((m, n) => [-1, 0, 1].forEach((d) => voices.push({ f: midi(m) * (1 + d * detune), ph: (n * 1.7 + d) % TAU, pan: d * 0.5 })));
  const amps = Array.from({ length: bright }, (_, h) => 1 / (h + 1) ** 1.3);
  const sustain = t1 - t0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const env = Math.min(1, tt / attack) * (tt > sustain ? Math.max(0, 1 - (tt - sustain) / release) : 1) * (1 + lfo * Math.sin(TAU * 0.3 * tt));
    if (env <= 0) continue;
    let l = 0, r = 0;
    for (const v of voices) {
      let s = 0;
      for (let h = 0; h < bright; h++) s += amps[h] * Math.sin(TAU * v.f * (h + 1) * tt + v.ph * (h + 1));
      l += s * (1 - v.pan) * 0.5; r += s * (1 + v.pan) * 0.5;
    }
    const g = (env * gain) / voices.length;
    const i = i0 + k;
    if (i >= N) break;
    L[i] += l * g; R[i] += r * g; SL[i] += l * g * send; SRv[i] += r * g * send;
  }
}
function pluck(t, m, gain = 0.16, pan = 0) {
  const i0 = idx(t), len = idx(0.5);
  const f = midi(m);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    let s = 0;
    for (let h = 1; h <= 8; h++) s += (Math.sin(TAU * f * h * tt) / h) * Math.exp(-tt * (6 + h * 5));
    put(i0 + k, s * gain * Math.min(1, k / 30), pan, 0.25);
  }
}

// ---------- the score ----------
const D2 = 38, D3 = 50;

// Hook: a low drone and a riser that pulls into the forge.
pad(0, 5.0, [D2, D2 + 7], 0.32, { attack: 0.05, release: 0.15, bright: 5 });
sweep(0, 3.2, 200, 1800, 0.55, (p) => p * p, -0.3, 0.3, 0.4);
for (const kt of TL.keyTimes) tick(kt);
TL.clauseEnds.forEach((ce, i) => boom(ce, i === 3 ? 0.55 : 0.32, 120, 50, 0.35, 0.2));
// Button and the dissolve.
bell(TL.press, midi(74), 0.12, 0, 1.2, 0.4);
sweep(TL.press + 0.05, TL.dissolve[1] + 0.1, 3200, 500, 0.8, (p) => Math.sin(Math.PI * p) ** 1.5, 0.8, -0.2, 0.7);
// Forge: rising tension, heartbeat on every status line, a bell on VERIFIED.
sweep(TL.forge[0], TL.reveal - 0.12, 300, 6000, 0.7, (p) => p ** 2.2, 0, 0, 0.35, 0.3);
pad(TL.forge[0], TL.reveal - 0.12, [D3, D3 + 1, D3 + 7], 0.22, { attack: 1.4, release: 0.05, bright: 7, detune: 0.01 });
TL.status.forEach((st, i) => { boom(st, 0.5 + i * 0.12, 70, 40, 0.3, 0.15); boom(st + 0.16, 0.3 + i * 0.08, 70, 40, 0.25, 0.1); });
bell(TL.status[2], midi(81), 0.14, 0.2, 1.4);
// Reveal: the hit.
boom(TL.reveal, 1.25, 110, 26, 2.2, 0.6);
crash(TL.reveal, 0.55, 2.6);
bell(TL.reveal, midi(62), 0.22, -0.2, 3.5, 0.8);
bell(TL.reveal + 0.01, midi(69), 0.16, 0.2, 3.5, 0.8);
pad(TL.reveal, TL.lore[1], [D2, D3, D3 + 3, D3 + 7], 0.3, { attack: 0.02, release: 0.4, bright: 6, detune: 0.006 });
bell(TL.capA, midi(74), 0.1, -0.3, 1.6);
boom(TL.capB, 0.6, 80, 40, 0.6, 0.4);
bell(TL.capB, midi(77), 0.16, 0.3, 2.2);
// Lore swell, then the whip.
sweep(TL.lore[0], TL.whip, 400, 3000, 0.45, (p) => p ** 2, 0, 0, 0.5, 0.5);
sweep(TL.whip - 0.05, TL.whip + 0.5, 4000, 300, 0.9, (p) => Math.sin(Math.PI * p), 0.9, -0.9, 0.8);
boom(TL.whip + 0.12, 0.4, 100, 45, 0.4, 0.3);

// Pulse section: 120 bpm, i to VI to III to VII in D minor (Dm, Bb, F, C), one chord per bar.
const [p0, p1] = TL.pulse;
const CHORDS = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]];
const bar = TL.beat * 4;
for (let b = 0, t = p0; t < p1 - 0.01; b++, t += bar) {
  const ch = CHORDS[b % 4];
  pad(t, Math.min(t + bar, p1), ch.map((x) => D3 + x).concat([D2 + ch[0]]), 0.26, { attack: 0.08, release: 0.25, bright: 6, detune: 0.006, send: 0.35 });
  const pattern = [0, 0, 12, 0, 7, 0, 12, 7];
  for (let s = 0; s < 8; s++) {
    const tt = t + s * TL.beat * 0.5;
    if (tt >= p1) break;
    pluck(tt, D3 + ch[0] + pattern[s], 0.13, s % 2 ? 0.25 : -0.25);
  }
}
for (let t = p0, n = 0; t < p1 - 0.01; t += TL.beat, n++) {
  kick(t, n % 4 === 0 ? 1 : 0.75);
  if (t >= TL.fan) for (let s = 1; s < 4; s++) hat(t + (s * TL.beat) / 4, s === 2 ? 0.12 : 0.07);
  else hat(t + TL.beat / 2, 0.1);
}
// Card entrances.
const ENTRY_NOTES = [74, 77, 81];
TL.montage.forEach((s, i) => {
  sweep(s - 0.2, s + 0.35, 2500, 600, 0.5, (p) => Math.sin(Math.PI * p), 0.8, -0.6, 0.8, 0.3);
  bell(s + 0.32, midi(ENTRY_NOTES[i]), 0.16, 0, 1.8);
});
TL.fanLines.forEach((a, i) => { boom(a, 0.5 + 0.1 * i, 90, 40, 0.5, 0.35); bell(a, midi(74 + [0, 3, 7][i]), 0.1, 0, 1.5); });
bell(TL.vote, midi(86), 0.1, 0.3, 1.2);
sweep(TL.codex, TL.drop - 0.05, 300, 8000, 0.6, (p) => p ** 3, 0, 0, 0.3, 0.4);

// The drop: silence, a low drone, two deep hits.
pad(TL.drop, TL.logo, [D2 - 12, D2], 0.16, { attack: 0.5, release: 0.5, bright: 3, lfo: 0.3, send: 0.2 });
boom(TL.dropLines[0], 1.0, 70, 30, 1.6, 0.45);
boom(TL.dropLines[1], 0.7, 70, 30, 1.3, 0.45);
bell(TL.dropLines[1] + 0.05, midi(62), 0.08, 0, 3);
sweep(TL.logo - 1.2, TL.logo, 200, 3000, 0.45, (p) => p ** 2.5, 0, 0, 0.4, 0.6);

// Logo: the resolve to D major, a bright arpeggio on the gold rule, and ring out.
boom(TL.logo + 0.1, 0.9, 90, 30, 2.2, 0.8);
crash(TL.logo + 0.1, 0.3, 3.5);
pad(TL.logo, TL.duration - 1.6, [D2, D3, D3 + 4, D3 + 7, D3 + 12, D3 + 16], 0.34, { attack: 1.0, release: 1.5, bright: 7, detune: 0.005, send: 0.7 });
[86, 90, 93, 98].forEach((m, i) => bell(TL.logo + 0.9 + i * 0.13, midi(m), 0.09, -0.4 + i * 0.27, 3, 0.8));
bell(TL.url, midi(81), 0.1, 0, 2.5, 0.7);

// ---------- reverb (Freeverb style) on the send bus ----------
function reverb(inp, combs, aps) {
  const out = new Float32Array(N);
  const cb = combs.map((d) => ({ buf: new Float32Array(d), i: 0, f: 0 }));
  const ab = aps.map((d) => ({ buf: new Float32Array(d), i: 0 }));
  const fb = 0.86, damp = 0.25;
  for (let n = 0; n < N; n++) {
    const x = inp[n] * 0.015;
    let s = 0;
    for (const c of cb) {
      const y = c.buf[c.i];
      c.f = y * (1 - damp) + c.f * damp;
      c.buf[c.i] = x + c.f * fb;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    for (const a of ab) {
      const b = a.buf[a.i];
      const y = -s + b;
      a.buf[a.i] = s + b * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      s = y;
    }
    out[n] = s;
  }
  return out;
}
const scale = SR / 44100;
const CL = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => Math.round(d * scale * 1.3));
const AP = [556, 441, 341, 225].map((d) => Math.round(d * scale));
const revL = reverb(SL, CL, AP), revR = reverb(SRv, CL.map((d) => d + 23), AP.map((d) => d + 23));

// ---------- mix, duck before the hit, soft clip, write ----------
const out = Buffer.alloc(44 + N * 4);
let peak = 0;
const mixL = new Float32Array(N), mixR = new Float32Array(N);
for (let n = 0; n < N; n++) {
  const t = n / SR;
  // a breath of silence just before the reveal hit
  const duck = t > TL.reveal - 0.12 && t < TL.reveal ? 0.15 : 1;
  const fadeIn = Math.min(1, n / 200);
  const fadeOut = Math.min(1, (TL.duration - t) / 1.2);
  mixL[n] = Math.tanh((L[n] + revL[n] * 1.1) * duck * 0.9) * fadeIn * fadeOut;
  mixR[n] = Math.tanh((R[n] + revR[n] * 1.1) * duck * 0.9) * fadeIn * fadeOut;
  peak = Math.max(peak, Math.abs(mixL[n]), Math.abs(mixR[n]));
}
const g = 0.89 / peak;
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVE", 8);
out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write("data", 36); out.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  out.writeInt16LE(Math.round(mixL[n] * g * 32767), 44 + n * 4);
  out.writeInt16LE(Math.round(mixR[n] * g * 32767), 46 + n * 4);
}
const dir = path.join(import.meta.dirname, "out");
fs.mkdirSync(dir, { recursive: true });
const raw = path.join(dir, "audio_raw.wav");
fs.writeFileSync(raw, out);
// Loudness for social platforms: about -14 LUFS, true peak under -1.5 dB.
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", path.join(dir, "audio.wav")]);
console.log("wrote out/audio.wav");
