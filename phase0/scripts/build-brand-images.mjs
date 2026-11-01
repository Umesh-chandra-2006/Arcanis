// Writes the static brand images in client/public: the home page's link preview and the PNG icons.
// Run by hand after changing the wording or the mark; the output is committed.
//   node scripts/build-brand-images.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = path.resolve(import.meta.dirname, "../client/public");
const GOLD = "#c9a24b";
const INK = "#0d0d12";

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="0%" r="85%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${INK}"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="28" y="28" width="1144" height="574" rx="10" fill="none" stroke="${GOLD}" stroke-opacity="0.5" stroke-width="2"/>
  <text x="600" y="160" text-anchor="middle" font-family="Georgia, serif" font-size="46" letter-spacing="18" fill="${GOLD}">ARCANIS</text>
  <text x="600" y="305" text-anchor="middle" font-family="Georgia, serif" font-size="74" fill="#f2efe6">Invent a spell</text>
  <text x="600" y="395" text-anchor="middle" font-family="Georgia, serif" font-size="74" fill="${GOLD}">in your own words.</text>
  <text x="600" y="492" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#b9b5aa">The forge turns it into a balanced card you can share.</text>
</svg>`;

await sharp(Buffer.from(og)).jpeg({ quality: 88 }).toFile(path.join(out, "og.jpg"));

const icon = fs.readFileSync(path.join(out, "favicon.svg"));
await sharp(icon, { density: 512 }).resize(32, 32).png().toFile(path.join(out, "favicon-32.png"));
// iOS rounds the corners itself and shows transparency as black, so no special background is needed.
await sharp(icon, { density: 512 }).resize(180, 180).png().toFile(path.join(out, "apple-touch-icon.png"));

for (const name of ["og.jpg", "favicon-32.png", "apple-touch-icon.png"]) {
  console.log(name, fs.statSync(path.join(out, name)).size, "bytes");
}
