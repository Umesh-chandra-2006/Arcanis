import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  float,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  avatar: mysqlEnum("avatar", [
    "ashen",
    "emberveil",
    "tidecaller",
    "galeborn",
    "stonewarden",
    "voidwalker",
    "dawnbringer",
    "chaosborn",
  ])
    .notNull()
    .default("ashen"),
  hp: int("hp").notNull().default(100),
  mp: int("mp").notNull().default(100),
  willCap: int("willCap").notNull().default(250),
  loginMethod: varchar("loginMethod", { length: 64 }).default("custom"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserWithoutPassword = Omit<User, 'passwordHash'>;

// ============================================================================
// AUTH SESSIONS TABLE
// ============================================================================

export const authSessions = mysqlTable("authSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  token: varchar("token", { length: 500 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuthSession = typeof authSessions.$inferSelect;
export type InsertAuthSession = typeof authSessions.$inferInsert;

// ============================================================================
// SPELLS TABLE
// ============================================================================

export const spells = mysqlTable("spells", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerId: int("ownerId").references(() => users.id),
  name: varchar("name", { length: 256 }).notNull(),
  element: varchar("element", { length: 32 }).notNull(),
  tier: mysqlEnum("tier", ["Basic", "Advanced", "Mega"]).notNull(),
  primaryCategory: varchar("primaryCategory", { length: 32 }).notNull(),
  secondaryCategory: varchar("secondaryCategory", { length: 32 }),
  castType: mysqlEnum("castType", ["Instant", "Trap", "Charged", "Continuous", "Channeled"]).notNull(),
  castTimeMs: int("castTimeMs").notNull(),
  damageMin: int("damageMin").notNull(),
  damageMax: int("damageMax").notNull(),
  mpCost: int("mpCost").notNull(),
  mpMaintenancePerTurn: int("mpMaintenancePerTurn"),
  willCostMin: int("willCostMin").notNull(),
  willCostMax: int("willCostMax").notNull(),
  willDrainPerTurn: int("willDrainPerTurn"),
  interruptionThreshold: int("interruptionThreshold"),
  scalingFactor: float("scalingFactor"),
  mpModifier: float("mpModifier"),
  isPhysical: boolean("isPhysical").default(false),
  physicalDelivery: text("physicalDelivery"),
  trapCondition: text("trapCondition"),
  trapVisibility: mysqlEnum("trapVisibility", ["visible", "hidden"]),
  flavorText: text("flavorText"),
  loreLine: text("loreLine"),
  imageUrl: text("imageUrl"),
  isPlatformSpell: boolean("isPlatformSpell").default(false),
  researchStatus: mysqlEnum("researchStatus", ["researching", "ready"])
    .default("ready")
    .notNull(),
  researchStartedAt: timestamp("researchStartedAt"),
  researchComplexityScore: int("researchComplexityScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => {
  return {
    ownerIdx: index("owner_idx").on(table.ownerId),
  };
});

export type Spell = typeof spells.$inferSelect;
export type InsertSpell = typeof spells.$inferInsert;

// ============================================================================
// SUMMON PROFILES TABLE
// ============================================================================

export interface SummonBehavior {
  name: string;
  description: string;
  directive?: "attack" | "defend" | "support" | null;
}

export const summonProfiles = mysqlTable("summonProfiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  spellId: varchar("spellId", { length: 36 })
    .notNull()
    .unique()
    .references(() => spells.id),
  summonName: varchar("summonName", { length: 256 }).notNull(),
  summonHp: int("summonHp").notNull(),
  attackRating: int("attackRating").notNull(),
  element: varchar("element", { length: 32 }).notNull(),
  mode: mysqlEnum("mode", ["autonomous", "controlled"]).notNull(),
  behaviors: json("behaviors").$type<SummonBehavior[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SummonProfile = typeof summonProfiles.$inferSelect;
export type InsertSummonProfile = typeof summonProfiles.$inferInsert;

// ============================================================================
// DECKS TABLE
// ============================================================================

export const decks = mysqlTable("decks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  spellIds: json("spellIds").$type<string[]>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Deck = typeof decks.$inferSelect;
export type InsertDeck = typeof decks.$inferInsert;

// ============================================================================
// BATTLES TABLE
// ============================================================================

export const battles = mysqlTable("battles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  player1Id: int("player1Id").notNull().references(() => users.id),
  player2Id: int("player2Id").notNull().references(() => users.id),
  winnerId: int("winnerId").references(() => users.id),
  terrain: varchar("terrain", { length: 32 }).notNull(),
  mode: varchar("mode", { length: 32 }).notNull().default("brawl"),
  turnsPlayed: int("turnsPlayed"),
  battleLog: json("battleLog").$type<Array<{ turn: number; action: string; timestamp: number }>>(),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => {
  return {
    player1Idx: index("player1_idx").on(table.player1Id),
    player2Idx: index("player2_idx").on(table.player2Id),
  };
});

export type Battle = typeof battles.$inferSelect;
export type InsertBattle = typeof battles.$inferInsert;

// ============================================================================
// LAB SLOTS TABLE
// ============================================================================

export const labSlots = mysqlTable("labSlots", {
  userId: int("userId").notNull().unique().primaryKey().references(() => users.id),
  weeklySpellsUsed: int("weeklySpellsUsed").default(0).notNull(),
  weeklyResetAt: timestamp("weeklyResetAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LabSlot = typeof labSlots.$inferSelect;
export type InsertLabSlot = typeof labSlots.$inferInsert;

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type AvatarType = typeof users._.columns.avatar.enumValues[number];
export type TierType = typeof spells._.columns.tier.enumValues[number];
export type CastType = typeof spells._.columns.castType.enumValues[number];
export type CategoryType = string;
export type ElementType = string;