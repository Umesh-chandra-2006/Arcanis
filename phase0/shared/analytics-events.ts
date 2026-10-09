// Analytics event names and the client-sendable subset (Build Plan 12, task A11).
// Server-side events are written directly by the server; the public endpoint
// accepts only the schemas below, drops unknown props, and limits size.
import { z } from "zod";

export const SHARE_CHANNELS = ["copy", "twitter", "whatsapp", "discord", "native", "other"] as const;

const spellId = z.string().min(1).max(36);
const shortText = z.string().max(200);

/** Events an anonymous visitor may send. */
export const ANONYMOUS_EVENTS = {
  landing_view: z.object({ referrer: shortText.optional(), path: shortText.optional() }),
  preview_viewed: z.object({ spellId, referrer: shortText.optional() }),
  preview_cta_clicked: z.object({ spellId }),
  share_clicked: z.object({ spellId, channel: z.enum(SHARE_CHANNELS) }),
} as const;

/** Additional events a signed-in player may send; the user always comes from the session. */
export const AUTHENTICATED_EVENTS = {
  ...ANONYMOUS_EVENTS,
  lab_opened: z.object({}),
  spark_low_viewed: z.object({ balance: z.number().int().min(0).max(1000) }),
} as const;

export type ClientEventName = keyof typeof AUTHENTICATED_EVENTS;
export const MAX_EVENT_PROPS_BYTES = 1024;

/** Every event name the server writes, for reference and the admin page. */
export const SERVER_EVENTS = [
  "magic_link_requested",
  "signup_confirmed", // props: signup_method (link | code), referred
  "signin_completed",
  "creation_started",
  "creation_succeeded",
  "creation_refunded",
  "creation_rejected",
  "creation_blocked_spend_cap",
  "preview_viewed", // server-recorded on share page open, deduplicated per IP
  "referral_link_opened",
  "referral_paid",
  "review_submitted",
  "session_day_n",
  "spark_pack_intent",
  "spark_waitlist_joined",
  "spark_zero_reached",
] as const;
