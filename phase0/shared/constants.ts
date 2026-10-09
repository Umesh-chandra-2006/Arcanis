export const UNAUTHED_ERR_MSG = "Please login (10001)";

export const PHASE0_ELEMENTS = ["Fire", "Water", "Earth", "Wind"] as const;
export const PHASE0_CATEGORIES = ["Attack", "Defense", "Regen", "Debuff"] as const;
export const PHASE0_CAST_TYPES = ["Instant"] as const;
export const PHASE0_TIERS = ["Basic"] as const;

export type Phase0Element = (typeof PHASE0_ELEMENTS)[number];
export type Phase0Category = (typeof PHASE0_CATEGORIES)[number];
export type Phase0CastType = (typeof PHASE0_CAST_TYPES)[number];
export type Phase0Tier = (typeof PHASE0_TIERS)[number];

// Spark economy, Phase 1a values (Master Doc v7.2 22.1, founder decision F7).
export const SPARK = {
  creationCost: 1,
  signupGrant: 5,
  weeklyAllowance: 3,
  /** The weekly allowance never raises a balance above this. */
  rolloverCap: 10,
  referralInviter: 3,
  referralInvitee: 0,
} as const;

export const SPARK_SIGNUP_GRANT = SPARK.signupGrant;
export const SPARK_CREATION_COST = SPARK.creationCost;

/** Sign-in link and code lifetime (Build Plan 5). */
export const LOGIN_TOKEN_TTL_MS = 10 * 60 * 1000;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;

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
  SIGNIN_RATE_LIMITED: "Too many sign-in attempts. Please wait a few minutes and try again.",
  CODE_INVALID: "That code is not valid. Check the newest email, or request a new code.",
  SPELL_NOT_FOUND: "Spell not found",
  TOKEN_INVALID: "This link is invalid, expired or already used. Request a new one.",
  SPELL_NAME_REQUIRED: "Give your spell a name",
  SPELL_DESCRIPTION_REQUIRED: "Describe your spell",
  NO_SPARKS: "You're out of Spark. Your free Spark refills every Monday.",
  INVALID_LLM_OUTPUT: "The forge could not shape that spell. Your Spark was returned; please try again.",
  CONTENT_MODERATED: "That description can't be forged. Please rephrase it.",
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
