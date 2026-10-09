// Runs before every test file. Loads the repo .env, then replaces DATABASE_URL
// with the test database so no module can reach production data.
import dotenv from "dotenv";
import path from "node:path";
import { resolveTestDatabaseUrl } from "./test-db-guard";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env"), quiet: true });

const decision = resolveTestDatabaseUrl(process.env);
// An empty string (not delete) so env.ts's dotenv call cannot restore the real URL.
process.env.DATABASE_URL = decision.ok ? decision.url : "";
process.env.ARCANIS_TEST_DB = decision.ok ? "1" : "";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ||= "test-secret";
// The shared test database accumulates creations across runs; breaker tests set
// their own limits explicitly.
process.env.DAILY_CREATION_LIMIT = "1000000";

// Tests never call live providers (no quota spent, no real email) unless asked.
if (process.env.LIVE_PROVIDERS !== "1") {
  for (const key of [
    "SPELL_LLM_API_KEY",
    "GEMINI_API_KEY",
    "OPENROUTER_API_KEY",
    "IMAGE_GEN_API_KEY",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_AI_TOKEN",
    "OPENAI_API_KEY",
    "RESEND_API_KEY",
    "BREVO_API_KEY",
    "CLOUDINARY_API_SECRET",
  ]) {
    process.env[key] = "";
  }
  process.env.EMAIL_PROVIDER = "none";
  process.env.MODERATION_PROVIDER = "local";
  process.env.STORAGE_PROVIDER = "inline";
}

if (!decision.ok && process.env.REQUIRE_TEST_DB === "1") {
  throw new Error(`Test database required: ${decision.reason}`);
}
