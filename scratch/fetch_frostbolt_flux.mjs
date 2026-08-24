import "dotenv/config";
import fs from "fs";
import mysql from "mysql2/promise";

async function main() {
  const token = process.env.IMAGE_GEN_API_KEY;
  console.log("Sending request to Hugging Face Router Together provider for FLUX.1-schnell...");
  
  const resp = await fetch("https://router.huggingface.co/together/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-schnell",
      prompt: "A frostbolt projectile of jagged glowing blue ice crystals roaring through a dark frozen blizzard atmosphere, pure central illustration art, fantasy magic artwork, no text, no UI elements, no borders, no frames, no stats",
      width: 512,
      height: 512
    })
  });

  console.log("Status:", resp.status);
  const data = await resp.json();
  console.log("Response data:", data);

  const imgUrl = data?.data?.[0]?.url;
  if (!imgUrl) {
    console.error("No image URL returned!");
    process.exit(1);
  }

  console.log("Fetching image binary from:", imgUrl);
  const imgResp = await fetch(imgUrl);
  const arrayBuf = await imgResp.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  fs.writeFileSync("d:/Arcanis/client/public/frostbolt_flux.png", buffer);
  fs.writeFileSync("C:/Users/H S R KRISHNA/.gemini/antigravity/brain/3d17fff4-85dc-443e-ad7d-35b87074285d/frostbolt_flux.png", buffer);
  console.log("✓ Saved FLUX image to d:/Arcanis/client/public/frostbolt_flux.png!");

  if (process.env.DATABASE_URL) {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    await conn.execute("UPDATE spells SET image_url = ? WHERE name = ?", ["/frostbolt_flux.png", "Frostbolt"]);
    await conn.end();
    console.log("✓ Updated Frostbolt record in MySQL database with /frostbolt_flux.png!");
  }

  process.exit(0);
}

main().catch(console.error);
