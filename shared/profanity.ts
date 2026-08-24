/**
 * Server-side profanity blocklist and content validation for The Hearth.
 */
const PROFANITY_PATTERN = /\b(fuck|shit|bitch|asshole|cunt|nigger|faggot|whore|slut|retard|dick|pussy)\b/i;

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  return PROFANITY_PATTERN.test(text);
}

export function validateHearthPostContent(content: string): { valid: boolean; reason?: string } {
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { valid: false, reason: "Post content cannot be empty." };
  }

  if (trimmed.length > 500) {
    return { valid: false, reason: "Post exceeds the 500 character limit." };
  }

  if (containsProfanity(trimmed)) {
    return { valid: false, reason: "Post content contains inappropriate or offensive language." };
  }

  return { valid: true };
}
