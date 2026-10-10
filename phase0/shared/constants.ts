export const UNAUTHED_ERR_MSG = "Please login (10001)";

// Spark economy, Phase 1a values (Master Doc v7.2 22.1, founder decision F7).
export const SPARK = {
  creationCost: 1,
  signupGrant: 3,
  weeklyAllowance: 3,
  /** The weekly allowance never raises a balance above this. */
  rolloverCap: 10,
  referralInviter: 3,
  referralInvitee: 0,
} as const;

/**
 * Fake-door Spark packs (Phase Plan 5, task A13). Prices are deliberately not
 * shown yet (founder decision 2026-10-10); Spark counts are placeholders.
 * Nothing is sold.
 */
export const SPARK_PACKS = [
  { id: "small", spark: 10 },
  { id: "medium", spark: 30 },
  { id: "large", spark: 90 },
] as const;
export type SparkPackId = (typeof SPARK_PACKS)[number]["id"];

export const SPARK_SIGNUP_GRANT = SPARK.signupGrant;
export const SPARK_CREATION_COST = SPARK.creationCost;

/** Sign-in link and code lifetime (Build Plan 5). */
export const LOGIN_TOKEN_TTL_MS = 10 * 60 * 1000;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;

/** Abuse strikes from user-caused moderation rejections (Build Plan 13). */
export const ABUSE = {
  restrictAtStrikes: 3,
  restrictHours: 24,
  banAtStrikes: 6,
} as const;

/** Silent retries of Layer 1 or image generation before giving up (Build Plan 7.1). */
export const GENERATION_RETRIES = 2;

/** First N spells per account skip research (Master Doc 6.3, v7.1). */
export const RESEARCH_EXEMPT_SPELLS = 2;

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
  SIGNIN_RATE_LIMITED: "Too many sign-in attempts. Please wait a few minutes and try again.",
  PASSWORD_INVALID: "That email and password don't match. New here or forgot it? Summon a sigil instead.",
  CURRENT_PASSWORD_INVALID: "That is not your current password.",
  PASSWORD_REQUIRED: "Choose a password to finish.",
  CODE_INVALID: "That code is not valid. Check the newest email, or request a new code.",
  SPELL_NOT_FOUND: "Spell not found",
  TOKEN_INVALID: "This link is invalid, expired or already used. Request a new one.",
  SPELL_NAME_REQUIRED: "Give your spell a name",
  SPELL_DESCRIPTION_REQUIRED: "Describe your spell",
  NO_SPARKS: "You're out of Spark. Your free Spark refills every Monday.",
  INVALID_LLM_OUTPUT: "The forge could not shape that spell. Your Spark was returned; please try again.",
  CONTENT_MODERATED: "That description can't be forged. Please rephrase it.",
  INPUT_REJECTED: "That description breaks the forge's rules, so it can't be made. The Spark was spent.",
  ACCOUNT_RESTRICTED: "Your account can't create spells right now.",
  GENERATION_FAILED: "The forge is busy. Please try again in a moment.",
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
