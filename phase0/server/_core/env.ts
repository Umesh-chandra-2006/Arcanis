import dotenv from "dotenv";
import path from "node:path";
import { findProjectRoot } from "./paths";

dotenv.config({ path: path.resolve(findProjectRoot(), "../.env"), quiet: true });

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== undefined && value !== "" ? parsed : fallback;
};

export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
  port: parseInt(process.env.PORT || "3100", 10),
  frontendUrl: process.env.FRONTEND_URL ?? "",
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS ?? "",

  // Text (Layer 1 and Layer 2c). Lists are "provider" or "provider:model", in cascade order.
  spellLlmProvider: process.env.SPELL_LLM_PROVIDER ?? "groq",
  spellLlmApiKey: process.env.SPELL_LLM_API_KEY ?? "", // Groq key (historical name)
  spellLlmFallbackProviders:
    process.env.SPELL_LLM_FALLBACK_PROVIDERS ?? "gemini:gemini-flash-lite-latest,gemini,openrouter",
  semanticCheckProviders:
    process.env.SEMANTIC_CHECK_PROVIDERS ?? "gemini:gemini-flash-lite-latest,groq:openai/gpt-oss-20b",
  groqModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openrouterModel: process.env.OPENROUTER_MODEL ?? "google/gemma-4-31b-it:free",

  // Image
  imageProviders: process.env.IMAGE_PROVIDER ?? "cloudflare,huggingface",
  imageGenApiKey: process.env.IMAGE_GEN_API_KEY ?? "", // Hugging Face
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
  cloudflareAiToken: process.env.CLOUDFLARE_AI_TOKEN ?? "",

  // Moderation (Layer 2b)
  moderationProvider: process.env.MODERATION_PROVIDER ?? "openai",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",

  // Storage
  storageProvider: process.env.STORAGE_PROVIDER ?? "cloudinary",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",

  // Email. Cascade order.
  emailProviders: process.env.EMAIL_PROVIDER ?? "brevo,resend",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM ?? "Arcanis <onboarding@resend.dev>",
  brevoApiKey: process.env.BREVO_API_KEY ?? "",
  brevoFrom: process.env.BREVO_FROM ?? "",

  // Spend protection (Build Plan 7.7)
  dailySpendLimitUsd: num(process.env.DAILY_SPEND_LIMIT_USD, 2),
  dailyCreationLimit: num(process.env.DAILY_CREATION_LIMIT, 50),
  /** Providers that bill real money; spend from others is shadow cost. Empty while all keys are free. */
  billedProviders: (process.env.BILLED_PROVIDERS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  founderAlertEmail: process.env.FOUNDER_ALERT_EMAIL ?? "",
};
