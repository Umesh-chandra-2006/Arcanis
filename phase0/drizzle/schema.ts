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

export const p0SparkBalances = mysqlTable(
  "p0_spark_balances",
  {
    userId: int("user_id").primaryKey(),
    balance: int("balance").notNull().default(5),
    totalEarned: int("total_earned").notNull().default(5),
    totalSpent: int("total_spent").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  }
);

export const p0SparkTransactions = mysqlTable(
  "p0_spark_transactions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("user_id").notNull(),
    amount: int("amount").notNull(),
    type: mysqlEnum("type", ["signup_grant", "creation_spend", "creation_refund", "referral_bonus"]).notNull(),
    spellId: varchar("spell_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("p0_spark_tx_user_idx").on(table.userId),
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

export type Phase0User = typeof p0Users.$inferSelect;
export type Phase0Spell = typeof p0Spells.$inferSelect;
export type Phase0SparkBalance = typeof p0SparkBalances.$inferSelect;
export type Phase0SparkTransaction = typeof p0SparkTransactions.$inferSelect;
export type Phase0AnalyticsEvent = typeof p0AnalyticsEvents.$inferSelect;
