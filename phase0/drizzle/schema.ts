import {
  int,
  double,
  varchar,
  timestamp,
  mysqlEnum,
  json,
  index,
  boolean,
  uniqueIndex,
  mysqlTable,
  text,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { CAST_TYPES, CATEGORIES, ELEMENTS, TIERS } from "../shared/taxonomy";

export const p0Users = mysqlTable(
  "p0_users",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    username: varchar("username", { length: 64 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(true),
    role: mysqlEnum("role", ["user", "admin"]).notNull().default("user"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastSignedInAt: timestamp("last_signed_in_at"),
    /** User-caused moderation rejections (Build Plan 13). */
    abuseStrikes: int("abuse_strikes").notNull().default(0),
    restrictedUntil: timestamp("restricted_until"),
    bannedAt: timestamp("banned_at"),
    /** Carried on share links as ?ref= (task A10). */
    referralCode: varchar("referral_code", { length: 16 }),
    /** False until the player picks a mage name (asked when first needed, Master Doc 18.2). */
    nameChosen: boolean("name_chosen").notNull().default(false),
  },
  (table) => ({
    emailIdx: uniqueIndex("p0_users_email_idx").on(table.email),
    usernameIdx: uniqueIndex("p0_users_username_idx").on(table.username),
    referralIdx: uniqueIndex("p0_users_referral_code_idx").on(table.referralCode),
  })
);

export const p0Spells = mysqlTable(
  "p0_spells",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    ownerId: int("owner_id").notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    element: mysqlEnum("element", ELEMENTS).notNull(),
    category: mysqlEnum("category", CATEGORIES).notNull(),
    secondaryCategory: mysqlEnum("secondary_category", CATEGORIES),
    castType: mysqlEnum("cast_type", CAST_TYPES).notNull().default("Instant"),
    tier: mysqlEnum("tier", TIERS).notNull().default("Basic"),
    damageMin: int("damage_min").notNull(),
    damageMax: int("damage_max").notNull(),
    mpCost: int("mp_cost").notNull(),
    willCostMin: int("will_cost_min").notNull(),
    willCostMax: int("will_cost_max").notNull(),
    castTimeMs: int("cast_time_ms").notNull(),
    scalingFactor: double("scaling_factor"),
    mpModifier: double("mp_modifier"),
    interruptionThreshold: int("interruption_threshold"),
    maintenanceCostPerTurn: int("maintenance_cost_per_turn"),
    drainRatio: double("drain_ratio"),
    flavorText: text("flavor_text").notNull(),
    loreLine: text("lore_line").notNull(),
    imageUrl: text("image_url").notNull(),
    /** Portrait card crop and 1200x630 Open Graph composition (Build Plan 7.6). */
    cardImageUrl: text("card_image_url"),
    ogImageUrl: text("og_image_url"),
    dominantColor: varchar("dominant_color", { length: 7 }),
    imagePrompt: text("image_prompt"),
    imageAttempts: int("image_attempts").notNull().default(0),
    researchComplexity: int("research_complexity").notNull().default(1),
    /** "Researching" is simply now < research_ready_at (Build Plan 7.5). */
    researchReadyAt: timestamp("research_ready_at").notNull().defaultNow(),
    verificationTrace: json("verification_trace"),
    isPublic: boolean("is_public").notNull().default(true),
    removedAt: timestamp("removed_at"),
    shareCount: int("share_count").notNull().default(0),
    generationMetadata: json("generation_metadata").notNull(),
    isPlatformSpell: boolean("is_platform_spell").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index("p0_spells_owner_idx").on(table.ownerId),
    createdAtIdx: index("p0_spells_created_at_idx").on(table.createdAt),
  })
);

// Append-only Spark ledger (Build Plan 6). Balance = sum of amounts whose status
// is not "reversed". Amounts never change; only status moves
// pending -> committed or pending -> reversed. Written only by server/spark.ts.
export const SPARK_ENTRY_TYPES = [
  "grant_signup",
  "grant_referral_inviter",
  "grant_referral_invitee",
  "grant_weekly_allowance",
  "spend_creation",
  "refund_creation",
  "admin_adjust",
  "migration_opening_balance",
] as const;

export const p0SparkLedger = mysqlTable(
  "p0_spark_ledger",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("user_id").notNull(),
    amount: int("amount").notNull(),
    type: mysqlEnum("type", SPARK_ENTRY_TYPES).notNull(),
    status: mysqlEnum("status", ["pending", "committed", "reversed"]).notNull(),
    refId: varchar("ref_id", { length: 64 }),
    /** Unique key that makes grants and refunds idempotent (e.g. "weekly:12:2026-10-05"). */
    idempotencyKey: varchar("idempotency_key", { length: 128 }),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("created_at", { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: timestamp("updated_at", { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => ({
    userIdx: index("p0_spark_ledger_user_idx").on(table.userId),
    idempotencyIdx: uniqueIndex("p0_spark_ledger_idem_idx").on(table.idempotencyKey),
  })
);

// Devices that already received a signup grant (F7: once per device).
export const p0DeviceGrants = mysqlTable(
  "p0_device_grants",
  {
    deviceKey: varchar("device_key", { length: 128 }).primaryKey(),
    userId: int("user_id").notNull(),
    ipPrefix: varchar("ip_prefix", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    ipIdx: index("p0_device_grants_ip_idx").on(table.ipPrefix),
  })
);

export const p0Reviews = mysqlTable(
  "p0_reviews",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    spellId: varchar("spell_id", { length: 36 }).notNull(),
    userId: int("user_id").notNull(),
    rating: int("rating").notNull(),
    comment: text("comment").notNull(),
    status: mysqlEnum("status", ["visible", "removed"]).notNull().default("visible"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    spellIdx: index("p0_reviews_spell_idx").on(table.spellId),
    userSpellIdx: uniqueIndex("p0_reviews_user_spell_idx").on(table.userId, table.spellId),
  })
);

export const p0AnalyticsEvents = mysqlTable(
  "p0_analytics_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    userId: int("user_id"),
    sessionId: varchar("session_id", { length: 64 }),
    metadata: json("metadata").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index("p0_analytics_type_idx").on(table.eventType),
    createdAtIdx: index("p0_analytics_created_at_idx").on(table.createdAt),
  })
);

// Every external provider call (Build Plan 7.7). Written only by
// server/providers/telemetry.ts.
export const p0ProviderCalls = mysqlTable(
  "p0_provider_calls",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    surface: varchar("surface", { length: 32 }).notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    units: json("units").notNull(),
    latencyMs: int("latency_ms").notNull(),
    costEstimateUsd: double("cost_estimate_usd").notNull().default(0),
    outcome: varchar("outcome", { length: 24 }).notNull(),
    errorMessage: varchar("error_message", { length: 500 }),
    userId: int("user_id"),
    runId: varchar("run_id", { length: 36 }),
    createdAt: timestamp("created_at", { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => ({
    createdAtIdx: index("p0_provider_calls_created_at_idx").on(table.createdAt),
    runIdx: index("p0_provider_calls_run_idx").on(table.runId),
  })
);

// Daily spend circuit breaker state, one row per UTC day (Build Plan 7.7).
export const p0BreakerDays = mysqlTable("p0_breaker_days", {
  day: varchar("day", { length: 10 }).primaryKey(), // YYYY-MM-DD (UTC)
  trippedReason: varchar("tripped_reason", { length: 64 }),
  trippedAt: timestamp("tripped_at"),
  resetAt: timestamp("reset_at"),
  spendLimitOverrideUsd: double("spend_limit_override_usd"),
  creationLimitOverride: int("creation_limit_override"),
  alertedAt: timestamp("alerted_at"),
});

// Sign-in by link or 6-digit code, one row per email sent (Build Plan 5, task A5).
// Only hashes are stored; consuming the link or the code consumes both.
export const p0LoginTokens = mysqlTable(
  "p0_login_tokens",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    linkHash: varchar("link_hash", { length: 64 }).notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attempts: int("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    linkIdx: uniqueIndex("p0_login_tokens_link_idx").on(table.linkHash),
    emailIdx: index("p0_login_tokens_email_idx").on(table.email, table.createdAt),
  })
);

// Server-side sessions behind an httpOnly cookie; revocable.
export const p0Sessions = mysqlTable(
  "p0_sessions",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    userId: int("user_id").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("p0_sessions_user_idx").on(table.userId),
  })
);

// Fixed-window counters that survive a restart (auth and abuse limits).
export const p0RateLimits = mysqlTable("p0_rate_limits", {
  bucket: varchar("bucket", { length: 191 }).primaryKey(), // key + window start
  count: int("count").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
});

// One row per creation attempt (Build Plan 9 generation_runs).
export const p0GenerationRuns = mysqlTable(
  "p0_generation_runs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("user_id").notNull(),
    spellId: varchar("spell_id", { length: 36 }),
    attempts: int("attempts").notNull().default(0),
    layer2aClamped: boolean("layer_2a_clamped").notNull().default(false),
    layer2aFallback: boolean("layer_2a_fallback").notNull().default(false),
    layer2bFlagged: boolean("layer_2b_flagged").notNull().default(false),
    layer2cFired: boolean("layer_2c_fired").notNull().default(false),
    outcome: varchar("outcome", { length: 24 }).notNull().default("running"),
    failureReason: varchar("failure_reason", { length: 64 }),
    totalCostUsd: double("total_cost_usd").notNull().default(0),
    trace: json("trace"),
    createdAt: timestamp("created_at", { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
    finishedAt: timestamp("finished_at", { fsp: 3 }),
  },
  (table) => ({
    userIdx: index("p0_generation_runs_user_idx").on(table.userId),
    createdAtIdx: index("p0_generation_runs_created_at_idx").on(table.createdAt),
  })
);

// Non-passing moderation verdicts, player reports, and their resolution (admin queue).
export const p0ModerationEvents = mysqlTable(
  "p0_moderation_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("user_id"),
    surface: varchar("surface", { length: 32 }).notNull(), // spell_input | spell_text | spell_image | review | report
    contentType: varchar("content_type", { length: 16 }).notNull(), // text | image
    targetType: varchar("target_type", { length: 16 }), // spell | review
    targetId: varchar("target_id", { length: 36 }),
    verdict: varchar("verdict", { length: 16 }).notNull(), // borderline | reject | report
    reason: varchar("reason", { length: 64 }),
    scores: json("scores"),
    excerpt: text("excerpt"),
    escalatedTo2c: boolean("escalated_to_2c").notNull().default(false),
    layer2cResult: varchar("layer_2c_result", { length: 32 }),
    runId: varchar("run_id", { length: 36 }),
    status: varchar("status", { length: 16 }).notNull().default("open"), // open | resolved
    resolution: varchar("resolution", { length: 16 }), // approved | removed | struck | banned
    reviewedByHuman: boolean("reviewed_by_human").notNull().default(false),
    reviewedBy: int("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("p0_moderation_events_status_idx").on(table.status, table.createdAt),
    targetIdx: index("p0_moderation_events_target_idx").on(table.targetType, table.targetId),
  })
);

// Referral attribution (Master Doc 23.3, Build Plan 9). One row per invitee.
export const p0Referrals = mysqlTable(
  "p0_referrals",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    inviterId: int("inviter_id").notNull(),
    inviteeId: int("invitee_id").notNull(),
    status: mysqlEnum("status", ["pending", "paid", "rejected"]).notNull().default("pending"),
    reason: varchar("reason", { length: 32 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    paidAt: timestamp("paid_at"),
  },
  (table) => ({
    inviteeIdx: uniqueIndex("p0_referrals_invitee_idx").on(table.inviteeId),
    inviterIdx: index("p0_referrals_inviter_idx").on(table.inviterId),
  })
);

// Fake-door waitlist (Build Plan 9). Intent clicks are analytics events.
export const p0SparkWaitlist = mysqlTable("p0_spark_waitlist", {
  userId: int("user_id").primaryKey(),
  packClicked: varchar("pack_clicked", { length: 16 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Phase0User = typeof p0Users.$inferSelect;
export type Phase0Spell = typeof p0Spells.$inferSelect;
export type Phase0SparkLedgerEntry = typeof p0SparkLedger.$inferSelect;
export type Phase0AnalyticsEvent = typeof p0AnalyticsEvents.$inferSelect;
export type Phase0Review = typeof p0Reviews.$inferSelect;
export type Phase0ProviderCall = typeof p0ProviderCalls.$inferSelect;
export type Phase0BreakerDay = typeof p0BreakerDays.$inferSelect;
export type Phase0GenerationRun = typeof p0GenerationRuns.$inferSelect;
export type Phase0ModerationEvent = typeof p0ModerationEvents.$inferSelect;
