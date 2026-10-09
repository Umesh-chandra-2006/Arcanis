// One-off (task A9): moves base64 images stored in p0_spells.image_url to object
// storage with card and OG variants. Idempotent: only rows whose image_url
// starts with "data:" are touched. Back up first (pnpm db:backup).
//   pnpm images:migrate [--dry-run]
//   pnpm images:migrate --refresh   rebuild card/OG variants for stored images (after a design change)
import { like, eq, isNotNull, and } from "drizzle-orm";
import { getDb } from "../server/db";
import { p0Spells } from "../drizzle/schema";
import { storeSpellImage } from "../server/spell-images";

function sniffMime(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp";
  return "image/png";
}

const dryRun = process.argv.includes("--dry-run");
const db = (await getDb())!;

if (process.argv.includes("--refresh")) {
  const stored = await db.select().from(p0Spells).where(and(like(p0Spells.imageUrl, "http%"), isNotNull(p0Spells.cardImageUrl)));
  for (const spell of stored) {
    const bytes = new Uint8Array(await (await fetch(spell.imageUrl)).arrayBuffer());
    const urls = await storeSpellImage(
      { userId: spell.ownerId, runId: spell.id },
      spell.id,
      { bytes, mime: sniffMime(bytes), provider: "migration", model: "refresh", width: 0, height: 0 },
      { name: spell.name, element: spell.element }
    );
    await db.update(p0Spells).set(urls).where(eq(p0Spells.id, spell.id));
    console.log(`  refreshed ${spell.id} (${spell.name}) accent ${urls.dominantColor}`);
  }
  process.exit(0);
}
const rows = await db.select().from(p0Spells).where(like(p0Spells.imageUrl, "data:%"));
console.log(`${rows.length} spells with inline images${dryRun ? " (dry run)" : ""}`);

let moved = 0;
for (const spell of rows) {
  const payload = spell.imageUrl.slice(spell.imageUrl.indexOf(",") + 1);
  const bytes = new Uint8Array(Buffer.from(payload, "base64"));
  const mime = sniffMime(bytes);
  if (dryRun) {
    console.log(`  would move ${spell.id} (${spell.name}), ${bytes.length} bytes, ${mime}`);
    continue;
  }
  const urls = await storeSpellImage(
    { userId: spell.ownerId, runId: spell.id },
    spell.id,
    { bytes, mime, provider: "migration", model: "base64", width: 0, height: 0 },
    { name: spell.name, element: spell.element }
  );
  await db.update(p0Spells).set(urls).where(eq(p0Spells.id, spell.id));
  moved++;
  console.log(`  moved ${spell.id} (${spell.name}) -> ${urls.imageUrl}`);
}

const left = await db.select({ id: p0Spells.id }).from(p0Spells).where(like(p0Spells.imageUrl, "data:%"));
console.log(`moved ${moved}; inline images remaining: ${left.length}`);
process.exit(left.length && !dryRun ? 1 : 0);
