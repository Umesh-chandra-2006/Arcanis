/**
 * Phase 0 content moderation — profanity blocklist for generated spell identity.
 */
const PROFANITY_PATTERN =
  /\b(fuck|shit|bitch|asshole|cunt|nigger|faggot|whore|slut|retard|dick|pussy|rape|kill yourself)\b/i;

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  return PROFANITY_PATTERN.test(text);
}

export function validateSpellIdentityText(text: string): {
  valid: boolean;
  reason?: string;
} {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { valid: false, reason: "Content cannot be empty." };
  }

  if (trimmed.length > 400) {
    return { valid: false, reason: "Content exceeds the 400 character limit." };
  }

  if (containsProfanity(trimmed)) {
    return { valid: false, reason: "Content contains inappropriate or offensive language." };
  }

  return { valid: true };
}
