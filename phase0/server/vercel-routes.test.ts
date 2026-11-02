import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Real pages get the SPA and any other address is a true 404, so a route missing
// from vercel.json would 404 when someone opens or reloads it on the live site.
const root = path.resolve(import.meta.dirname, "..");
const app = fs.readFileSync(path.join(root, "client/src/App.tsx"), "utf8");
const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8")) as {
  rewrites: { source: string; destination: string; has?: unknown }[];
};

const normalise = (route: string) => route.replace(/:[A-Za-z]+/g, ":id");

describe("vercel.json routes", () => {
  const spa = config.rewrites.filter((r) => r.destination === "/index.html").map((r) => r.source);

  it("serves every route in App.tsx", () => {
    const routes = [...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]).filter((r) => r !== "*");
    expect(routes.length).toBeGreaterThan(10);
    for (const route of routes) expect(spa).toContain(normalise(route));
  });

  it("has no catch-all, so unknown addresses are a real 404", () => {
    expect(spa.filter((s) => s.includes("(.*)"))).toEqual([]);
    expect(fs.existsSync(path.join(root, "client/public/404.html"))).toBe(true);
  });

  it("sends preview bots to the server before people get the SPA", () => {
    const sources = config.rewrites.map((r) => r.source);
    const bot = config.rewrites.findIndex((r) => r.source === "/spell/:id" && r.has);
    expect(bot).toBeGreaterThanOrEqual(0);
    expect(bot).toBeLessThan(sources.lastIndexOf("/spell/:id"));
  });
});
