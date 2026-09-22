import { z } from "zod";
import { PHASE0_CATEGORIES, PHASE0_ELEMENTS, PHASE0_CAST_TYPES } from "./constants";

export const SpellCreationInputSchema = z.object({
  name: z.string().trim().min(1).max(64),
  element: z.enum(PHASE0_ELEMENTS),
  category: z.enum(PHASE0_CATEGORIES),
  castType: z.enum(PHASE0_CAST_TYPES).default("Instant"),
  description: z.string().trim().min(1).max(1000),
});

export type SpellCreationInput = z.infer<typeof SpellCreationInputSchema>;

export const LLMSpellIdentitySchema = z.object({
  flavor_text: z.string().min(1).max(400),
  lore_line: z.string().min(1).max(400),
  assessment_question: z.string().max(200).nullable(),
  image_prompt: z.string().min(1).max(600),
});

export type LLMSpellIdentity = z.infer<typeof LLMSpellIdentitySchema>;

export const MagicLinkRequestSchema = z.object({
  email: z.string().trim().email().min(1).max(320),
});

export const MagicLinkVerifySchema = z.object({
  token: z.string().min(8).max(128),
});

export const PasswordSetSchema = z.object({
  password: z.string().min(8).max(72),
});

export const SignInWithPasswordSchema = z.object({
  email: z.string().trim().email().min(1).max(320),
  password: z.string().min(1).max(72),
});

export const ReviewSubmitSchema = z.object({
  spellId: z.string().min(1).max(36),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(500),
});

export const AccountStatusQuerySchema = z.object({
  email: z.string().trim().email().min(1).max(320),
});

export const TrackEventSchema = z.object({
  eventType: z.string().min(1).max(64),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
