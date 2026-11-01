// Renders the launch video: serves this folder, drives headless Chrome over the DevTools
// protocol, steps window.renderAt(t) frame by frame and pipes PNG frames into ffmpeg.
//
//   node render.mjs [--v launch|moods|name|rate|forge|elements] --stills 0.5,5.6   PNG stills into ./out/
//   node render.mjs --out D:/video.mp4 [--audio out/audio.wav] [--url arcanis.world] [--from 0 --to 30]
//
// Needs Chrome and ffmpeg on the machine. Makes no network calls except Google Fonts.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const DIR = import.meta.dirname;
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1] ?? true]] : acc), [])
);
const CHROME = args.chrome || ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome"].find((p) => fs.existsSync(p));
const PORT = 9333;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".wav": "audio/wav" };

const server = http.createServer((req, res) => {
  const file = path.join(DIR, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const pageUrl = `http://127.0.0.1:${server.address().port}/index.html?v=${encodeURIComponent(args.v || "launch")}&url=${encodeURIComponent(args.url || "arcanis.world")}`;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "arcanis-video-"));
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
  "--hide-scrollbars", "--mute-audio", "--force-color-profile=srgb", "--window-size=1080,1920", "about:blank",
], { stdio: "ignore" });

async function waitFor(fn, ms = 20000) {
  const end = Date.now() + ms;
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch {}
    if (Date.now() > end) throw new Error("timed out waiting for Chrome");
    await new Promise((r) => setTimeout(r, 200));
  }
}
const target = await waitFor(async () => {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  return list.find((t) => t.type === "page");
});

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let nextId = 1;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: pageUrl });
await waitFor(() => evaluate("typeof window.videoReady !== 'undefined'"));
await evaluate("window.videoReady");

const shot = async (t) => {
  await evaluate(`window.renderAt(${t})`);
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  return Buffer.from(data, "base64");
};

try {
  if (args.stills) {
    const out = path.join(DIR, "out");
    fs.mkdirSync(out, { recursive: true });
    for (const t of String(args.stills).split(",").map(Number)) {
      fs.writeFileSync(path.join(out, `${args.v || "launch"}_${t.toFixed(2)}.png`), await shot(t));
      console.log("still", t);
    }
  } else {
    const fps = Number(args.fps ?? (await evaluate("window.TL.fps")) ?? 60);
    const from = Number(args.from ?? 0), to = Number(args.to ?? (await evaluate("window.TL.duration")));
    const outFile = args.out || path.join(DIR, "out", "arcanis_launch.mp4");
    if (!fs.existsSync(path.dirname(outFile))) fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const ff = ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-"];
    if (args.audio) ff.push("-ss", String(from), "-i", args.audio);
    ff.push("-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high", "-tune", "film", "-movflags", "+faststart");
    if (args.audio) ff.push("-c:a", "aac", "-b:a", "256k", "-shortest");
    ff.push(outFile);
    const enc = spawn("ffmpeg", ff, { stdio: ["pipe", "inherit", "inherit"] });
    const total = Math.round((to - from) * fps);
    const t0 = Date.now();
    for (let f = 0; f < total; f++) {
      const png = await shot(from + f / fps);
      if (!enc.stdin.write(png)) await new Promise((r) => enc.stdin.once("drain", r));
      if (f % 60 === 0) console.log(`frame ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    enc.stdin.end();
    await new Promise((r) => enc.on("close", r));
    console.log("wrote", outFile);
  }
} finally {
  ws.close();
  chrome.kill();
  server.close();
  setTimeout(() => fs.rmSync(profile, { recursive: true, force: true }), 1500);
}
