// Renders a content video's score: node score.mjs <id>  ->  out/<id>_audio.wav
// Reads the same timeline as the picture (videos/<id>.tl.js) and the score in scores/<id>.mjs.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createMixer } from "./sound.mjs";

const id = process.argv[2];
if (!id) throw new Error("usage: node score.mjs <id>");
const dir = import.meta.dirname;
await import(pathToFileURL(path.join(dir, "videos", `${id}.tl.js`)).href);
const TL = globalThis.TL;
globalThis.window = globalThis; // data.js assigns window.VIDEO_DATA
await import(pathToFileURL(path.join(dir, "data.js")).href);
const D = globalThis.VIDEO_DATA;
const { default: score } = await import(pathToFileURL(path.join(dir, "scores", `${id}.mjs`)).href);
const m = createMixer(TL.duration);
const ducks = score(m, TL, D) || [];
fs.mkdirSync(path.join(dir, "out"), { recursive: true });
m.write(path.join(dir, "out", `${id}_audio.wav`), ducks);
console.log(`wrote out/${id}_audio.wav`);
