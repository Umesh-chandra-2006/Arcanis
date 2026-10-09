// Background regeneration for spells that fell back to the placeholder (Build
// Plan 7.6). DB-driven, so a restart loses nothing; runs in-process on an
// interval and stops early when image quota is exhausted.
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { p0Spells } from "../drizzle/schema";
import { generateImage } from "./providers/image";
import { AllProvidersFailedError } from "./providers/errors";
import { moderate } from "./moderation";
import { storeSpellImage } from "./spell-images";

export const IMAGE_RETRY = { maxAttempts: 4, batch: 3, intervalMs: 15 * 60_000, maxAgeDays: 14 };

const STYLE =
  "Dark fantasy digital painting, semi-realistic, dramatic chiaroscuro lighting, painterly brushwork, atmospheric depth, single-subject cinematic composition, highly detailed";
const EXCLUSIONS = "no text, no letters, no numbers, no UI, no border, no frame, no watermark, no signature";

export async function retryMissingImages(now = new Date()): Promise<{ attempted: number; stored: number }> {
  const db = requireDb();
  const since = new Date(now.getTime() - IMAGE_RETRY.maxAgeDays * 86_400_000);
  const rows = await db
    .select()
    .from(p0Spells)
    .where(
      and(
        eq(p0Spells.imageUrl, ""),
        lt(p0Spells.imageAttempts, IMAGE_RETRY.maxAttempts),
        gt(p0Spells.createdAt, since),
        eq(p0Spells.isPublic, true)
      )
    )
    .limit(IMAGE_RETRY.batch);

  let stored = 0;
  for (const spell of rows) {
    await db.update(p0Spells).set({ imageAttempts: sql`${p0Spells.imageAttempts} + 1` }).where(eq(p0Spells.id, spell.id));
    const prompt = spell.imagePrompt ?? `${spell.name}, a ${spell.element} spell: ${spell.flavorText}`;
    const ids = { userId: spell.ownerId, runId: spell.id };
    try {
      const image = await generateImage({ surface: "image", ...ids }, { prompt: `${STYLE}, ${prompt}, ${EXCLUSIONS}`, width: 1024, height: 1024 });
      const dataUrl = `data:${image.mime};base64,${Buffer.from(image.bytes).toString("base64")}`;
      const decision = await moderate(ids, "spell_image", [{ type: "image", url: dataUrl }]);
      if (decision.verdict !== "pass") continue;
      const urls = await storeSpellImage(ids, spell.id, image, { name: spell.name, element: spell.element });
      await db.update(p0Spells).set(urls).where(eq(p0Spells.id, spell.id));
      stored++;
    } catch (error) {
      if (error instanceof AllProvidersFailedError && (error.quotaExhausted || error.errors.length === 0)) break;
    }
  }
  return { attempted: rows.length, stored };
}

export function startImageRetryLoop(): NodeJS.Timeout {
  const timer = setInterval(() => {
    void retryMissingImages().catch((error) => console.warn("[Image retry] failed:", error));
  }, IMAGE_RETRY.intervalMs);
  timer.unref();
  return timer;
}
