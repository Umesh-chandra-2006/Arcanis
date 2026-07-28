// Vitest setup file
process.env.SPELL_LLM_PROVIDER = "groq";
process.env.SPELL_LLM_API_KEY = "mock-groq-api-key";
process.env.SPELL_LLM_FALLBACK_PROVIDERS = "gemini,openrouter";
process.env.GEMINI_API_KEY = "mock-gemini-api-key";
process.env.OPENROUTER_API_KEY = "mock-openrouter-api-key";
process.env.IMAGE_GEN_API_KEY = "mock-huggingface-api-key";
process.env.DATABASE_URL = "mysql://root:password@localhost:3306/arcanis";
