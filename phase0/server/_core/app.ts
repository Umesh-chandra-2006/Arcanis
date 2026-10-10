import express, { type Express } from "express";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import helmet from "helmet";
import cors from "cors";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getDb } from "../db";
import { serveStatic, setupVite } from "./vite";
import { getSpellRow, isTakenDown } from "../spell-pipeline";
import { ENV } from "./env";
import { findProjectRoot } from "./paths";
import { deviceCookieMiddleware } from "./cookies";
import sharp from "sharp";
import { ogVariant } from "../spell-images";
import { ELEMENT_COLORS, type Element } from "../../shared/taxonomy";
import { checkTextModels } from "../providers/check";
import { startImageRetryLoop } from "../image-retry";

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
    `<title>${escapeHtml(spell.name)} | Arcanis</title>`,
    `<meta property="og:title" content="${escapeHtml(spell.name)} | Arcanis" />`,
    `<meta property="og:description" content="${escapeHtml(spell.flavorText.slice(0, 200))}" />`,
    `<meta property="og:image" content="${absoluteImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:site_name" content="Arcanis" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${baseUrl}/spell/${spell.id}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(spell.name)} | Arcanis" />`,
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

// Behind the Vercel rewrite the Host header is Render's; share URLs must use the public domain.
async function getBaseUrl(req: express.Request): Promise<string> {
  return ENV.frontendUrl.replace(/\/+$/, "") || `${req.protocol}://${req.get("host") ?? `localhost:${ENV.port}`}`;
}

/**
 * Link-preview crawlers. Vercel sends only these to Render for /spell/:id
 * (scripts/vercel-config.mjs uses the same list); people get the SPA.
 */
export const PREVIEW_BOT_UA = /bot|crawler|spider|facebookexternalhit|facebookcatalog|twitterbot|discordbot|slackbot|whatsapp|telegrambot|linkedinbot|embedly|pinterest|redditbot|skypeuripreview|vkshare|quora link preview|applebot|google-inspectiontool|iframely/i;

export async function registerOgRoutes(app: Express) {
  // Only production serves its own built index; in dev Vite serves the SPA.
  let prodIndexHtml: string | null = null;
  if (ENV.isProduction) {
    try {
      prodIndexHtml = fs.readFileSync(path.resolve(findProjectRoot(), "dist/public/index.html"), "utf-8");
    } catch {
      console.warn("[OG] dist/public/index.html missing; share pages fall back to bare OG HTML");
    }
  }

  app.get("/spell/:spellId/image", async (req, res) => {
    try {
      const spell = await getSpellRow(req.params.spellId);
      if (!spell) {
        return res.status(404).send("Not found");
      }
      if (isTakenDown(spell)) {
        return res.status(410).send("Gone");
      }

      // Prefer the composed 1200x630 share image (A9); fall back to the art.
      const shareImage = spell.ogImageUrl || spell.imageUrl;
      if (shareImage.startsWith("http")) {
        res.set("Cache-Control", "public, max-age=86400");
        return res.redirect(302, shareImage);
      }

      if (shareImage.startsWith("data:")) {
        const [header, payload] = shareImage.split(",");
        const mime = header.match(/^data:([^;]+)/)?.[1] ?? "image/png";
        const buffer = Buffer.from(payload ?? "", "base64");
        res.set({
          "Content-Type": mime,
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        return res.send(buffer);
      }

      // No art yet: still a 1200x630 JPEG, since preview crawlers ignore SVG.
      const art = await sharp(Buffer.from(placeholderSvg(spell.element))).png().toBuffer();
      const jpeg = await ogVariant(new Uint8Array(art), { name: spell.name, element: spell.element, accent: "#c9a24b" });
      res.set({ "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" });
      return res.send(jpeg);
    } catch (error) {
      console.error("[OG Image] error:", error);
      return res.status(500).send("Error");
    }
  });

  app.get("/spell/:spellId", async (req, res, next) => {
    const isBot = PREVIEW_BOT_UA.test(req.get("user-agent") ?? "");
    // People in dev get the Vite SPA; it renders the page client-side.
    if (!isBot && !prodIndexHtml) return next();
    try {
      const spell = await getSpellRow(req.params.spellId);
      const baseUrl = await getBaseUrl(req);

      if (!spell || isTakenDown(spell)) {
        const status = spell ? 410 : 404;
        if (prodIndexHtml && !isBot) return res.status(status).send(prodIndexHtml);
        return res.status(status).send(spell ? "This spell was removed." : "Spell not found");
      }

      const ogTags = renderOgTags(baseUrl, spell);

      if (isBot || !prodIndexHtml) {
        // Crawlers need only the tags; no scripts or assets that could 404.
        return res
          .status(200)
          .set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" })
          .send(`<!doctype html><html lang="en"><head><meta charset="utf-8" />
    ${ogTags}
  </head><body><a href="${baseUrl}/s/${spell.id}">${escapeHtml(spell.name)} on Arcanis</a><script>location.replace("/s/${spell.id}" + location.search)</script></body></html>`);
      }

      const page = prodIndexHtml.replace(/<title>.*<\/title>/, "").replace("</head>", `${ogTags}
  </head>`);
      return res.status(200).set({ "Content-Type": "text/html" }).send(page);
    } catch (error) {
      console.error("[OG Page] error:", error);
      return res.status(500).send("Error");
    }
  });
}

function placeholderSvg(element: string): string {
  const { accent, dark } = ELEMENT_COLORS[element as Element] ?? { accent: "#c9a24b", dark: "#14141c" };
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

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Not initialized; DB-backed routes will fail. Check DATABASE_URL.");
  }

  if (!ENV.isTest && db) startImageRetryLoop();

  if (!ENV.isProduction && !ENV.isTest) {
    // Non-blocking live check so a retired model ID shows up loudly in dev.
    void checkTextModels().then((results) => {
      for (const r of results.filter((x) => x.outcome !== "success")) {
        console.error(`[Model check] ${r.provider}:${r.model} ${r.outcome}: ${r.detail}`);
      }
    });
  }

  app.use(helmet({
    // Explicit policy: the default would block Cloudinary art and Google Fonts on
    // pages Render serves itself. Inline scripts stay blocked; the bot OG page's
    // redirect script is a convenience and its plain link still works without it.
    contentSecurityPolicy: ENV.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            connectSrc: ["'self'"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  }));
  const extraOrigins = ENV.corsAllowedOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = [
    ENV.frontendUrl,
    `http://localhost:${ENV.port}`,
    `http://127.0.0.1:${ENV.port}`,
    ...extraOrigins,
  ].filter(Boolean);
  app.use(cors({ origin: allowedOrigins, credentials: true }));

  // Hops of trusted proxies in front of the app (Render = 1; Vercel rewrite then Render = 2).
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));

  app.get("/health", (_req, res) => res.send("OK"));
  app.use(deviceCookieMiddleware);

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
  } else if (!ENV.isTest) {
    await setupVite(app, server);
  }

  return server;
}