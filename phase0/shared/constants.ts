export const UNAUTHED_ERR_MSG = "Please login (10001)";

export const PHASE0_ELEMENTS = ["Fire", "Water", "Earth", "Wind"] as const;
export const PHASE0_CATEGORIES = ["Attack", "Defense", "Regen", "Debuff"] as const;
export const PHASE0_CAST_TYPES = ["Instant"] as const;
export const PHASE0_TIERS = ["Basic"] as const;

export type Phase0Element = (typeof PHASE0_ELEMENTS)[number];
export type Phase0Category = (typeof PHASE0_CATEGORIES)[number];
export type Phase0CastType = (typeof PHASE0_CAST_TYPES)[number];
export type Phase0Tier = (typeof PHASE0_TIERS)[number];

export const SPARK_SIGNUP_GRANT = 5;
export const SPARK_CREATION_COST = 1;

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const SPELL_CAPS: Record<
  Phase0Tier,
  {
    damage: [number, number];
    mp: [number, number];
    will: [number, number];
    interruption: [number, number];
    castTimeMs: [number, number];
  }
> = {
  Basic: {
    damage: [10, 40],
    mp: [8, 20],
    will: [10, 25],
    interruption: [15, 25],
    castTimeMs: [800, 1200],
  },
};

export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "mailinator.net",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "grr.la",
  "spam4.me",
  "temp-mail.org",
  "temp-mail.io",
  "tempmail.com",
  "tempmail.net",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "maildrop.cc",
  "mailnesia.com",
  "mailcatch.com",
  "mailnull.com",
  "mintemail.com",
  "mytempemail.com",
  "discard.email",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getnada.com",
  "nada.email",
  "inboxbear.com",
  "trashmail.com",
  "trash-mail.com",
  "trashmail.de",
  "spambox.us",
  "mailtemp.net",
  "mailmetrash.com",
  "mailinator2.com",
  "mailinator3.com",
  "mailinator4.com",
  "mailinator5.com",
  "binkmail.com",
  "bobmail.info",
  "chammy.info",
  "devnullmail.com",
  "dodgeit.com",
  "dontreg.com",
  "e4ward.com",
  "emailias.com",
  "filzmail.com",
  "haltospam.com",
  "jetable.org",
  "mailmoat.com",
  "meltmail.com",
  "mytrashmail.com",
  "nepwk.com",
  "nospamfor.us",
  "pookmail.com",
  "rtrtr.com",
  "safetymail.info",
  "sneakemail.com",
  "spamgourmet.com",
  "spammotel.com",
  "spamthis.co.uk",
  "thankyou2010.com",
  "usermail.com",
  "wh4f.org",
]);

export const VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: "Email is required",
  EMAIL_INVALID: "Please enter a valid email address",
  EMAIL_DISPOSABLE: "Disposable email addresses are not allowed",
  EMAIL_RATE_LIMITED: "Please wait a minute before requesting another link",
  SIGNUP_IP_LIMITED: "Too many signups from this network today. Please try again tomorrow.",
  EMAIL_HAS_PASSWORD: "That account signs in with a password. Enter your password instead.",
  PASSWORD_REQUIRED: "Please enter your password",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters",
  PASSWORD_TOO_LONG: "Password must be at most 72 characters",
  PASSWORD_INVALID: "Incorrect email or password",
  PASSWORD_LOGIN_LIMITED: "Too many attempts. Please try again in a few minutes.",
  NO_PASSWORD_SET: "This account has no password yet. Request a magic link to sign in.",
  SPELL_NOT_FOUND: "Spell not found",
  TOKEN_INVALID: "This link is invalid or has expired. Please request a new one.",
  TOKEN_USED: "This link has already been used.",
  SPELL_NAME_REQUIRED: "Give your spell a name",
  SPELL_DESCRIPTION_REQUIRED: "Describe your spell",
  NO_SPARKS: "You're out of Sparks. New accounts receive 5 free Sparks.",
  INVALID_LLM_OUTPUT: "The Tower could not interpret your request. Please try again.",
  CONTENT_MODERATED: "That content was flagged by the Tower. Please rephrase.",
  GENERATION_FAILED: "The Tower is busy. Please try again in a moment.",
} as const;

export const ANALYTICS_EVENT_TYPES = [
  "spell_creation_started",
  "spell_creation_completed",
  "spell_shared",
  "share_link_copied",
  "share_page_viewed",
  "share_page_cta_clicked",
  "magic_link_requested",
  "magic_link_verified",
  "review_submitted",
  "reviews_page_viewed",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];
