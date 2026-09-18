import dotenv from "dotenv";
import path from "node:path";
import { findProjectRoot } from "./paths";

dotenv.config({ path: path.resolve(findProjectRoot(), "../.env") });

export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "3100", 10),
  frontendUrl: process.env.FRONTEND_URL ?? "",
  spellLlmProvider: process.env.SPELL_LLM_PROVIDER ?? "groq",
  spellLlmApiKey: process.env.SPELL_LLM_API_KEY ?? "",
  spellLlmFallbackProviders: process.env.SPELL_LLM_FALLBACK_PROVIDERS ?? "gemini,openrouter",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  imageGenApiKey: process.env.IMAGE_GEN_API_KEY ?? "",
  metricsKey: process.env.METRICS_KEY ?? "",
};
