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

export const p0Users = mysqlTable(
  "p0_users",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    username: varchar("username", { length: 64 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    emailVerified: boolean("email_verified").notNull().default(true),
    role: mysqlEnum("role", ["user", "admin"]).notNull().default("user"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastSignedInAt: timestamp("last_signed_in_at"),
  },
  (table) => ({
    emailIdx: uniqueIndex("p0_users_email_idx").on(table.email),
    usernameIdx: uniqueIndex("p0_users_username_idx").on(table.username),
  })
);

export const p0MagicLinks = mysqlTable(
  "p0_magic_links",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    token: varchar("token", { length: 128 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    used: boolean("used").notNull().default(false),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("p0_magic_links_token_idx").on(table.token),
    emailIdx: index("p0_magic_links_email_idx").on(table.email),
  })
);

export const p0Spells = mysqlTable(
  "p0_spells",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    ownerId: int("owner_id").notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    element: mysqlEnum("element", ["Fire", "Water", "Earth", "Wind"]).notNull(),
    category: mysqlEnum("category", ["Attack", "Defense", "Regen", "Debuff"]).notNull(),
    castType: mysqlEnum("cast_type", ["Instant"]).notNull().default("Instant"),
    tier: mysqlEnum("tier", ["Basic"]).notNull().default("Basic"),
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
    flavorText: text("flavor_text").notNull(),
    loreLine: text("lore_line").notNull(),
    assessmentQuestion: text("assessment_question"),
    imageUrl: text("image_url").notNull(),
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

export type Phase0User = typeof p0Users.$inferSelect;
export type Phase0Spell = typeof p0Spells.$inferSelect;
export type Phase0SparkLedgerEntry = typeof p0SparkLedger.$inferSelect;
export type Phase0AnalyticsEvent = typeof p0AnalyticsEvents.$inferSelect;
export type Phase0Review = typeof p0Reviews.$inferSelect;
export type Phase0ProviderCall = typeof p0ProviderCalls.$inferSelect;
