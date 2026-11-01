// Instruments and mixer for the content-video scores (scores/*.mjs). Same synthesis as audio.mjs
// (the launch score, which predates this file). createMixer(duration) returns the instruments,
// all writing into one stereo bus with a reverb send, and write(file) renders a WAV at about -14 LUFS.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

export const SR = 48000;
const TAU = Math.PI * 2;
export const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createMixer(duration) {
  const N = Math.round(duration * SR);
  const L = new Float32Array(N), R = new Float32Array(N), SL = new Float32Array(N), SRv = new Float32Array(N);
  let seed = 1234567;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const idx = (t) => Math.round(t * SR);
  function put(i, v, pan = 0, send = 0) {
    if (i < 0 || i >= N) return;
    const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
    L[i] += v * gl; R[i] += v * gr;
    if (send) { SL[i] += v * gl * send; SRv[i] += v * gr * send; }
  }
  const onePoleLP = (fc) => { const a = Math.exp((-TAU * fc) / SR); let y = 0; return (x) => (y = (1 - a) * x + a * y); };
  const svfBP = () => { let lp = 0, bp = 0; return (x, fc, q = 0.6) => { const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR); const hp = x - lp - q * bp; bp += f * hp; lp += f * bp; return bp; }; };

  const m = {
    kick(t, gain = 1) {
      const i0 = idx(t), len = idx(0.45);
      let ph = 0;
      for (let k = 0; k < len; k++) {
        const tt = k / SR;
        ph += (TAU * (44 + 120 * Math.exp(-tt * 32))) / SR;
        const click = k < 120 ? rand() * 0.25 * (1 - k / 120) : 0;
        put(i0 + k, (Math.sin(ph) * Math.exp(-tt * 7.5) + click) * 0.9 * gain, 0, 0.05);
      }
    },
    hat(t, gain = 0.12, pan = 0.3) {
      const i0 = idx(t), len = idx(0.05);
      let prev = 0;
      for (let k = 0; k < len; k++) { const x = rand(); put(i0 + k, (x - prev) * Math.exp((-k / SR) * 90) * gain, pan, 0.1); prev = x; }
    },
    boom(t, gain = 1, f0 = 90, f1 = 28, decay = 1.6, send = 0.5) {
      const i0 = idx(t), len = idx(decay * 2.2);
      let ph = 0;
      const lp = onePoleLP(900);
      for (let k = 0; k < len; k++) {
        const tt = k / SR;
        ph += (TAU * (f1 + (f0 - f1) * Math.exp(-tt * 3.2))) / SR;
        const env = Math.exp(-tt / (decay * 0.45)) * Math.min(1, k / 60);
        put(i0 + k, (Math.sin(ph) * 0.95 + Math.sin(ph * 2) * 0.12 + lp(rand()) * Math.exp(-tt * 9) * 1.6) * env * gain, 0, send);
      }
    },
    crash(t, gain = 0.35, decay = 2.2) {
      const i0 = idx(t), len = idx(decay * 1.8);
      let p1 = 0, p2 = 0;
      for (let k = 0; k < len; k++) {
        const x = rand(); const hp = x - p1; p1 = x; const hp2 = hp - p2; p2 = hp;
        put(i0 + k, hp2 * Math.exp(-(k / SR) / (decay * 0.35)) * gain * 0.6, rand() * 0.6, 0.6);
      }
    },
    bell(t, f, gain = 0.25, pan = 0, decay = 2.6, send = 0.55) {
      const i0 = idx(t), len = idx(decay * 1.6);
      for (let k = 0; k < len; k++) {
        const tt = k / SR;
        const env = Math.exp(-tt / (decay * 0.3)) * Math.min(1, k / 40);
        const v = Math.sin(TAU * f * tt + 2.2 * Math.exp(-tt * 3) * Math.sin(TAU * f * 3.5 * tt)) + 0.35 * Math.sin(TAU * f * 2.01 * tt) * Math.exp(-tt * 2);
        put(i0 + k, v * env * gain, pan, send);
      }
    },
    tick(t, gain = 0.09) {
      const i0 = idx(t), len = idx(0.03), f = 2200 + rand() * 900;
      let prev = 0;
      for (let k = 0; k < len; k++) {
        const tt = k / SR, x = rand();
        put(i0 + k, ((x - prev) * 0.6 + Math.sin(TAU * f * tt) * 0.4) * Math.exp(-tt * 180) * gain, rand() * 0.3, 0.08);
        prev = x;
      }
    },
    sweep(t0, t1, f0, f1, gain, env, panFrom = 0, panTo = 0, q = 0.5, send = 0.4) {
      const i0 = idx(t0), len = idx(t1 - t0);
      const bp = svfBP(), bp2 = svfBP();
      for (let k = 0; k < len; k++) {
        const p = k / len, fc = f0 * Math.pow(f1 / f0, p);
        put(i0 + k, bp2(bp(rand(), fc, q), fc, q) * env(p) * gain, panFrom + (panTo - panFrom) * p, send);
      }
    },
    pad(t0, t1, notes, gain, { attack = 0.6, release = 0.8, bright = 6, detune = 0.004, send = 0.5, lfo = 0.15 } = {}) {
      const i0 = idx(t0), len = idx(t1 - t0 + release), sustain = t1 - t0;
      const voices = [];
      notes.forEach((n, j) => [-1, 0, 1].forEach((d) => voices.push({ f: midi(n) * (1 + d * detune), ph: (j * 1.7 + d) % TAU, pan: d * 0.5 })));
      const amps = Array.from({ length: bright }, (_, h) => 1 / (h + 1) ** 1.3);
      for (let k = 0; k < len; k++) {
        const i = i0 + k;
        if (i >= N) break;
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
        L[i] += l * g; R[i] += r * g; SL[i] += l * g * send; SRv[i] += r * g * send;
      }
    },
    pluck(t, n, gain = 0.16, pan = 0) {
      const i0 = idx(t), len = idx(0.5), f = midi(n);
      for (let k = 0; k < len; k++) {
        const tt = k / SR;
        let s = 0;
        for (let h = 1; h <= 8; h++) s += (Math.sin(TAU * f * h * tt) / h) * Math.exp(-tt * (6 + h * 5));
        put(i0 + k, s * gain * Math.min(1, k / 30), pan, 0.25);
      }
    },
    // A fast roll of ticks rising in density and volume (suspense before a reveal).
    roll(t0, t1, gain = 0.1) {
      for (let t = t0, step = 0.12; t < t1; t += step, step = Math.max(0.03, step * 0.93)) m.hat(t, gain * (0.4 + 0.6 * ((t - t0) / (t1 - t0))), Math.sin(t * 20) * 0.4);
    },
    write(file, ducks = []) {
      const revL = reverb(SL, N), revR = reverb(SRv, N, 23);
      const out = Buffer.alloc(44 + N * 4);
      const mixL = new Float32Array(N), mixR = new Float32Array(N);
      let peak = 0;
      for (let n = 0; n < N; n++) {
        const t = n / SR;
        let duck = 1;
        for (const [a, b] of ducks) if (t > a && t < b) duck = 0.15;
        const f = Math.min(1, n / 200) * Math.min(1, (duration - t) / 1.2) * duck * 0.9;
        mixL[n] = Math.tanh((L[n] + revL[n] * 1.1) * f);
        mixR[n] = Math.tanh((R[n] + revR[n] * 1.1) * f);
        peak = Math.max(peak, Math.abs(mixL[n]), Math.abs(mixR[n]));
      }
      const g = 0.89 / (peak || 1);
      out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVE", 8);
      out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
      out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
      out.write("data", 36); out.writeUInt32LE(N * 4, 40);
      for (let n = 0; n < N; n++) {
        out.writeInt16LE(Math.round(mixL[n] * g * 32767), 44 + n * 4);
        out.writeInt16LE(Math.round(mixR[n] * g * 32767), 46 + n * 4);
      }
      const raw = file.replace(/\.wav$/, "_raw.wav");
      fs.writeFileSync(raw, out);
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", file]);
    },
  };
  return m;
}

// Freeverb-style reverb: 8 combs into 4 allpasses.
function reverb(inp, N, spread = 0) {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ buf: new Float32Array(Math.round(d * scale * 1.3) + spread), i: 0, f: 0 }));
  const aps = [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round(d * scale) + spread), i: 0 }));
  const out = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const x = inp[n] * 0.015;
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.f = y * 0.75 + c.f * 0.25;
      c.buf[c.i] = x + c.f * 0.86;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    for (const a of aps) {
      const b = a.buf[a.i];
      a.buf[a.i] = s + b * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      s = b - s;
    }
    out[n] = s;
  }
  return out;
}
