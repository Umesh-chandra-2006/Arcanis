// Element art: the face of every card while generated art is out of Phase 0/1a
// (founder decision 2026-10-10). One SVG per element, shared by the client
// (card face) and the server (1200x630 share image), so both always match.
import { ELEMENT_COLORS, type Element } from "./taxonomy";

interface Glyph {
  d: string;
  /** Filled silhouette or a stroked line drawing. */
  mode: "fill" | "stroke";
}

// Glyphs drawn in a 100x100 box, centred.
const GLYPHS: Record<Element, Glyph[]> = {
  Fire: [
    { d: "M50 12 C61 32 77 41 73 62 C70 79 60 88 50 88 C40 88 29 79 27 62 C25 47 38 39 42 26 C46 37 49 43 50 12 Z", mode: "fill" },
    { d: "M50 52 C55 60 60 64 58 72 C57 79 53 82 50 82 C47 82 43 79 42 72 C41 66 47 62 50 52 Z", mode: "fill" },
  ],
  Water: [
    { d: "M50 12 C62 32 75 47 75 62 C75 77 64 88 50 88 C36 88 25 77 25 62 C25 47 38 32 50 12 Z", mode: "fill" },
    { d: "M38 66 C40 74 46 78 53 78", mode: "stroke" },
  ],
  Wind: [
    { d: "M14 38 H60 C70 38 74 30 70 24 C66 18 56 20 56 28", mode: "stroke" },
    { d: "M14 54 H76 C86 54 90 64 84 70 C78 76 68 72 68 64", mode: "stroke" },
    { d: "M14 70 H46", mode: "stroke" },
  ],
  Earth: [
    { d: "M10 82 L38 34 L52 56 L64 42 L90 82 Z", mode: "fill" },
    { d: "M31 46 L38 34 L45 46", mode: "stroke" },
  ],
  Lightning: [{ d: "M58 10 L28 54 H48 L40 90 L74 42 H54 L64 10 Z", mode: "fill" }],
  Void: [
    { d: "M50 18 A32 32 0 1 1 49.9 18 Z", mode: "stroke" },
    { d: "M50 34 A16 16 0 1 1 49.9 34 Z", mode: "fill" },
    { d: "M14 50 H30 M70 50 H86", mode: "stroke" },
  ],
  Arcane: [
    { d: "M50 10 L57 43 L90 50 L57 57 L50 90 L43 57 L10 50 L43 43 Z", mode: "fill" },
    { d: "M50 28 A22 22 0 1 1 49.9 28 Z", mode: "stroke" },
  ],
  Light: [
    { d: "M50 34 A16 16 0 1 1 49.9 34 Z", mode: "fill" },
    { d: "M50 10 V22 M50 78 V90 M10 50 H22 M78 50 H90 M22 22 L30 30 M70 70 L78 78 M78 22 L70 30 M30 70 L22 78", mode: "stroke" },
  ],
  Shadow: [
    { d: "M60 14 A36 36 0 1 0 86 64 A28 28 0 1 1 60 14 Z", mode: "fill" },
    { d: "M28 76 C36 84 52 88 66 82", mode: "stroke" },
  ],
  Nature: [
    { d: "M20 80 C20 42 48 18 84 16 C84 52 60 80 20 80 Z", mode: "fill" },
    { d: "M20 80 L62 38", mode: "stroke" },
  ],
  Frost: [
    {
      d: "M50 10 V90 M15 30 L85 70 M15 70 L85 30 M42 18 L50 26 L58 18 M42 82 L50 74 L58 82 M20 42 L28 38 L24 30 M80 58 L72 62 L76 70 M20 58 L28 62 L24 70 M80 42 L72 38 L76 30",
      mode: "stroke",
    },
  ],
  Chaos: [{ d: "M50 10 L58 38 L86 28 L65 52 L88 72 L58 64 L50 90 L42 64 L14 74 L35 52 L12 30 L42 38 Z", mode: "fill" }],
};

export function elementArtSvg(element: string, width = 400, height = 560): string {
  const el = (Object.keys(GLYPHS) as Element[]).find((e) => e.toLowerCase() === element.toLowerCase()) ?? "Arcane";
  const { accent, dark } = ELEMENT_COLORS[el];
  const size = Math.min(width, height);
  const glyphSize = size * 0.48;
  const gx = (width - glyphSize) / 2;
  const gy = height * 0.44 - glyphSize / 2;
  const cx = width / 2;
  const cy = height * 0.44;
  const r = size * 0.36;
  const glyphs = GLYPHS[el]
    .map((g) =>
      g.mode === "fill"
        ? `<path d="${g.d}" fill="${accent}" fill-opacity="0.92"/>`
        : `<path d="${g.d}" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
<radialGradient id="bg" cx="50%" cy="44%" r="70%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.38"/><stop offset="55%" stop-color="${dark}"/><stop offset="100%" stop-color="#07070a"/></radialGradient>
<radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${width}" height="${height}" fill="url(#bg)"/>
<circle cx="${cx}" cy="${cy}" r="${r * 1.25}" fill="url(#halo)"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#c9a24b" stroke-opacity="0.55" stroke-width="1.5"/>
<circle cx="${cx}" cy="${cy}" r="${r * 0.86}" fill="none" stroke="${accent}" stroke-opacity="0.45" stroke-width="1" stroke-dasharray="4 6"/>
<circle cx="${cx}" cy="${cy}" r="${r * 1.12}" fill="none" stroke="#c9a24b" stroke-opacity="0.18" stroke-width="1"/>
<g transform="translate(${gx} ${gy}) scale(${glyphSize / 100})">${glyphs}</g>
</svg>`;
}

/** For <img src>. */
export function elementArtDataUri(element: string, width = 400, height = 560): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(elementArtSvg(element, width, height))}`;
}
