// Layer 2c (Build Plan 7.3): a small, cheap model that runs only when Layer 2a
// or 2b flags something borderline. Structured pass or fail with a reason code.
import { z } from "zod";
import type { CallContext, TextProvider } from "../shared/providers";
import { generateText } from "./providers/text";

export const SEMANTIC_REASON_CODES = ["ok", "unsafe", "contradicts_category", "off_premise", "incoherent", "real_person"] as const;
export type SemanticReasonCode = (typeof SEMANTIC_REASON_CODES)[number] | "check_unavailable";

export interface SemanticCheckResult {
  pass: boolean;
  reasonCode: SemanticReasonCode;
}

const ResponseSchema = z.object({
  pass: z.boolean(),
  reason_code: z.enum(SEMANTIC_REASON_CODES),
});

const SYSTEM = `You are a content reviewer for Arcanis, a fantasy spell-crafting game. Players describe spells; an AI writes the spell's text.
Fantasy combat, elemental destruction, curses and dark themes are normal and allowed.
Fail content that: sexualizes anyone; targets real people or real groups; promotes self-harm, hate or real-world violence or crime; is graphic gore; or that does not describe a spell at all.
For generated spell text also fail it if it clearly contradicts the requested category (for example a healing spell described as pure damage) or is incoherent.
Reply with JSON only: {"pass": boolean, "reason_code": "ok" | "unsafe" | "contradicts_category" | "off_premise" | "incoherent" | "real_person"}.`;

export async function semanticCheck(
  ctx: Omit<CallContext, "surface">,
  subject: { kind: "player_input" | "generated_text"; category: string; element: string; content: string; flag: string },
  providers?: TextProvider[]
): Promise<SemanticCheckResult> {
  const user = `Kind: ${subject.kind}
Requested element: ${subject.element}
Requested category: ${subject.category}
Why this was escalated: ${subject.flag}
Content:
"""${subject.content.slice(0, 3000)}"""`;
  try {
    const response = await generateText(
      { ...ctx, surface: "semantic_check" },
      { system: SYSTEM, user, json: true, temperature: 0, maxTokens: 400 },
      providers
    );
    const parsed = ResponseSchema.safeParse(JSON.parse(stripFences(response.text)));
    if (!parsed.success) return { pass: false, reasonCode: "check_unavailable" };
    return { pass: parsed.data.pass && parsed.data.reason_code === "ok", reasonCode: parsed.data.reason_code };
  } catch {
    // Fail closed: unverifiable output never reaches a player.
    return { pass: false, reasonCode: "check_unavailable" };
  }
}

export function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}
