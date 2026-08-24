import express, { type Express } from "express";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import helmet from "helmet";
import cors from "cors";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getSpellPublic } from "../spell-pipeline";
import { ENV } from "./env";

function renderOgTags(
  baseUrl: string,
  spell: {
    name: string;
    flavorText: string;
    imageUrl: string;
    id: string;
    element: string;
    category: string;
  }
): string {
  const absoluteImage = `${baseUrl}/spell/${spell.id}/image`;
  return [
    `<title>${escapeHtml(spell.name)} — Arcanis</title>`,
    `<meta property="og:title" content="${escapeHtml(spell.name)} — Arcanis" />`,
    `<meta property="og:description" content="${escapeHtml(spell.flavorText.slice(0, 200))}" />`,
    `<meta property="og:image" content="${absoluteImage}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${baseUrl}/spell/${spell.id}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(spell.name)} — Arcanis" />`,
    `<meta name="twitter:description" content="${escapeHtml(spell.flavorText.slice(0, 200))}" />`,
    `<meta name="twitter:image" content="${absoluteImage}" />`,
  ].join("\n    ");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getBaseUrl(req: express.Request): Promise<string> {
  return `${req.protocol}://${req.get("host") ?? `localhost:${ENV.port}`}`;
}

export async function registerOgRoutes(app: Express) {
  const prodIndexPath = path.resolve(import.meta.dirname, "../dist/public/index.html");
  let prodIndexHtml: string | null = null;
  try {
    prodIndexHtml = fs.readFileSync(prodIndexPath, "utf-8");
  } catch {
    // not in production or dist not built yet
  }

  app.get("/spell/:spellId/image", async (req, res) => {
    try {
      const spell = await getSpellPublic(req.params.spellId);
      if (!spell) {
        return res.status(404).send("Not found");
      }

      if (spell.imageUrl.startsWith("data:")) {
        const [header, payload] = spell.imageUrl.split(",");
        const mime = header.match(/^data:([^;]+)/)?.[1] ?? "image/png";
        const buffer = Buffer.from(payload ?? "", "base64");
        res.set({
          "Content-Type": mime,
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        return res.send(buffer);
      }

      if (spell.imageUrl.startsWith("http")) {
        return res.redirect(302, spell.imageUrl);
      }

      const svg = placeholderSvg(spell.element);
      res.set({ "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" });
      return res.send(svg);
    } catch (error) {
      console.error("[OG Image] error:", error);
      return res.status(500).send("Error");
    }
  });

  app.get("/spell/:spellId", async (req, res) => {
    try {
      const spell = await getSpellPublic(req.params.spellId);
      const baseUrl = await getBaseUrl(req);

      if (!spell) {
        if (prodIndexHtml) return res.status(404).send(prodIndexHtml);
        return res.status(404).send("Spell not found");
      }

      const ogTags = renderOgTags(baseUrl, {
        ...spell,
        flavorText: spell.flavorText,
        imageUrl: spell.imageUrl,
      });

      if (prodIndexHtml) {
        const page = prodIndexHtml
          .replace(/<title>.*<\/title>/, "")
          .replace("</head>", `${ogTags}\n  </head>`);
        return res.status(200).set({ "Content-Type": "text/html" }).send(page);
      }

      const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    ${ogTags}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
      return res.status(200).set({ "Content-Type": "text/html" }).send(page);
    } catch (error) {
      console.error("[OG Page] error:", error);
      return res.status(500).send("Error");
    }
  });
}

function placeholderSvg(element: string): string {
  const colors: Record<string, [string, string]> = {
    Fire: ["#d4713a", "#3a1d0d"],
    Water: ["#6da2c9", "#0d1d33"],
    Earth: ["#6e9a5f", "#1a2410"],
    Wind: ["#a8b8c8", "#141c26"],
  };
  const [accent, dark] = colors[element] ?? ["#c9a24b", "#14141c"];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <radialGradient id="g" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${dark}"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="${dark}"/>
  <rect width="512" height="512" fill="url(#g)"/>
  <circle cx="256" cy="240" r="90" fill="none" stroke="${accent}" stroke-opacity="0.5" stroke-width="3"/>
  <circle cx="256" cy="240" r="55" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="2"/>
  <circle cx="256" cy="240" r="22" fill="${accent}" fill-opacity="0.55"/>
</svg>`;
}

export async function startApp(app: Express) {
  const server = createServer(app);

  app.use(helmet({
    contentSecurityPolicy: ENV.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  }));
  app.use(cors());

  app.get("/health", (_req, res) => res.send("OK"));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  await registerOgRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (ENV.isProduction) {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  return server;
}