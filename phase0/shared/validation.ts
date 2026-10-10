import { z } from "zod";
import { CREATION_ENABLED } from "./taxonomy";

export const SpellCreationInputSchema = z.object({
  name: z.string().trim().min(1).max(64),
  element: z.enum(CREATION_ENABLED.elements),
  category: z.enum(CREATION_ENABLED.categories),
  castType: z.enum(CREATION_ENABLED.castTypes).default("Instant"),
  description: z.string().trim().min(1).max(1000),
});

export type SpellCreationInput = z.infer<typeof SpellCreationInputSchema>;

/** Layer 1 output. Stats are checked separately by enforceAllocation (Layer 2a). */
export const LLMSpellIdentitySchema = z.object({
  flavor_text: z.string().trim().min(1).max(600),
  lore_line: z.string().trim().min(1).max(300),
  image_prompt: z.string().trim().min(1).max(600),
  /** Display only: how grand the concept is. Never affects stats or tier. */
  potential: z.enum(["Basic", "Advanced", "Mega"]).catch("Basic"),
  research_complexity: z.coerce.number().int().min(1).max(10).catch(5),
  stats: z.record(z.string(), z.unknown()),
});

export type LLMSpellIdentity = z.infer<typeof LLMSpellIdentitySchema>;

export const SignInRequestSchema = z.object({
  email: z.string().trim().email().min(1).max(320),
});

export const SignInPasswordSchema = z.object({
  email: z.string().trim().email().min(1).max(320),
  password: z.string().min(1).max(72),
});

export const SignInLinkSchema = z.object({
  token: z.string().min(16).max(128),
});

export const SignInCodeSchema = z.object({
  email: z.string().trim().email().min(1).max(320),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const ReviewSubmitSchema = z.object({
  spellId: z.string().min(1).max(36),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(500),
});

export const TrackEventSchema = z.object({
  eventType: z.string().min(1).max(64),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
