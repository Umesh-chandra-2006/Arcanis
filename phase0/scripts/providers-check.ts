// Live check of every configured provider (task A2). Exit code 1 when a model
// is retired or a key is rejected.
//   pnpm providers:check            text, moderation, storage
//   pnpm providers:check --images   also generates one image per image provider
import { checkAllProviders, FATAL_OUTCOMES } from "../server/providers/check";

const results = await checkAllProviders({ images: process.argv.includes("--images") });
for (const r of results) {
  const mark = r.outcome === "success" ? "ok  " : FATAL_OUTCOMES.includes(r.outcome) ? "FAIL" : "warn";
  console.log(`${mark} ${r.surface.padEnd(10)} ${r.provider}:${r.model}  ${r.outcome}  ${r.detail}`);
}
const fatal = results.filter((r) => FATAL_OUTCOMES.includes(r.outcome));
process.exit(fatal.length ? 1 : 0);
