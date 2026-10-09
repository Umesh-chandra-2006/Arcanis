// Writes vercel.json for the split deploy (task A10): Vercel serves the client;
// /api/*, the share page and its image are rewritten to the Render API so the
// session cookie is first-party and share links get server-rendered OG tags.
//   node scripts/vercel-config.mjs https://<render-service>.onrender.com
//   node scripts/vercel-config.mjs --check     fails while the placeholder remains (runs on Vercel builds)
import fs from "node:fs";
import path from "node:path";

const file = path.resolve(import.meta.dirname, "../vercel.json");
export const PLACEHOLDER = "https://RENDER_API_ORIGIN";

export function buildConfig(origin) {
  return {
    buildCommand: "pnpm build:client",
    outputDirectory: "dist/public",
    // Order matters: API and share routes before the SPA catch-all.
    rewrites: [
      { source: "/api/:path*", destination: `${origin}/api/:path*` },
      { source: "/health", destination: `${origin}/health` },
      { source: "/spell/:id/image", destination: `${origin}/spell/:id/image` },
      { source: "/spell/:id", destination: `${origin}/spell/:id` },
      { source: "/(.*)", destination: "/index.html" },
    ],
  };
}

const arg = process.argv[2];
if (arg === "--check") {
  const config = fs.readFileSync(file, "utf8");
  if (process.env.VERCEL && config.includes(PLACEHOLDER)) {
    console.error("vercel.json still points at RENDER_API_ORIGIN. Run: node scripts/vercel-config.mjs https://<render-service>.onrender.com");
    process.exit(1);
  }
} else if (arg) {
  const origin = arg.replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin)) throw new Error(`Not an https origin: ${arg}`);
  fs.writeFileSync(file, JSON.stringify(buildConfig(origin), null, 2) + "\n");
  console.log(`vercel.json now rewrites to ${origin}`);
} else {
  fs.writeFileSync(file, JSON.stringify(buildConfig(PLACEHOLDER), null, 2) + "\n");
  console.log("vercel.json written with the placeholder origin");
}
