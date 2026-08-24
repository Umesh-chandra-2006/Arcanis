import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";

async function runFlux() {
  const token = process.env.IMAGE_GEN_API_KEY;
  console.log("[FLUX Test] Starting FLUX model request...");
  console.log("[FLUX Test] Token prefix:", token ? token.substring(0, 8) + "..." : "NONE");

  const prompt = "A frostbolt projectile of jagged glowing blue ice crystals roaring through a dark frozen blizzard atmosphere, pure central illustration art, fantasy magic artwork, no text, no UI elements, no borders, no frames, no stats, no watermarks";

  const models = [
    "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
    "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
    "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
  ];

  let imageBuffer = null;

  for (const modelUrl of models) {
    console.log(`[FLUX Test] Fetching model: ${modelUrl}...`);
    try {
      const resp = await fetch(modelUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: prompt,
          parameters: { height: 512, width: 512 },
        }),
      });

      console.log(`[FLUX Test] Status for ${modelUrl}:`, resp.status);
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuf);
        console.log(`[FLUX Test] Successfully received PNG buffer (${imageBuffer.length} bytes)!`);
        break;
      } else {
        const errText = await resp.text();
        console.warn(`[FLUX Test] Model Error (${resp.status}):`, errText.substring(0, 300));
      }
    } catch (err) {
      console.error(`[FLUX Test] Fetch exception:`, err);
    }
  }

  if (!imageBuffer) {
    console.error("[FLUX Test] Failed to generate image from FLUX endpoints.");
    process.exit(1);
  }

  // Save image to client/public
  const publicPath = "d:/Arcanis/client/public/frostbolt_flux.png";
  fs.writeFileSync(publicPath, imageBuffer);
  console.log(`[FLUX Test] Saved FLUX image to ${publicPath}`);

  // Save image to artifact directory for artifact review
  const artifactPath = "C:/Users/H S R KRISHNA/.gemini/antigravity/brain/3d17fff4-85dc-443e-ad7d-35b87074285d/frostbolt_flux.png";
  fs.writeFileSync(artifactPath, imageBuffer);
  console.log(`[FLUX Test] Saved FLUX image to artifact directory: ${artifactPath}`);

  // Update MySQL database
  if (process.env.DATABASE_URL) {
    try {
      const conn = await mysql.createConnection(process.env.DATABASE_URL);
      await conn.execute("UPDATE spells SET image_url = ? WHERE name = ?", ["/frostbolt_flux.png", "Frostbolt"]);
      await conn.end();
      console.log("[FLUX Test] Updated Frostbolt record in MySQL database with /frostbolt_flux.png!");
    } catch (dbErr) {
      console.error("[FLUX Test] Database update error:", dbErr);
    }
  }

  process.exit(0);
}

runFlux();
