import { eq, inArray, and, lt } from "drizzle-orm";
import { getDb } from "./db";
import {
  spells,
  summonProfiles,
  decks,
  labSlots,
  type InsertSpell,
  type InsertSummonProfile,
  type Spell,
  type SummonProfile,
} from "../drizzle/schema";
import { nanoid } from "nanoid";

type DbClient = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function createSpell(
  ownerId: number | undefined,
  spellData: Omit<InsertSpell, "id" | "createdAt">,
  tx?: DbClient
): Promise<Spell | null> {
  const db = tx || await getDb();
  if (!db) return null;

  try {
    const spellId = nanoid(36);
    await db.insert(spells).values({
      id: spellId,
      ownerId,
      ...spellData,
    });

    const created = await db.select().from(spells).where(eq(spells.id, spellId));
    return created[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create spell:", error);
    return null;
  }
}

export async function createSummonProfile(
  spellId: string,
  profileData: Omit<InsertSummonProfile, "id" | "spellId" | "createdAt">,
  tx?: DbClient
): Promise<SummonProfile | null> {
  const db = tx || await getDb();
  if (!db) return null;

  try {
    const profileId = nanoid(36);
    await db.insert(summonProfiles).values({
      id: profileId,
      spellId,
      ...profileData,
    });

    const created = await db
      .select()
      .from(summonProfiles)
      .where(eq(summonProfiles.id, profileId));
    return created[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create summon profile:", error);
    return null;
  }
}

export async function getUserSpells(userId: number): Promise<Spell[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const fiveSecondsAgo = new Date(Date.now() - 5000);

    await db
      .update(spells)
      .set({ researchStatus: "ready", researchStartedAt: null })
      .where(
        and(
          eq(spells.ownerId, userId),
          eq(spells.researchStatus, "researching"),
          lt(spells.researchStartedAt, fiveSecondsAgo)
        )
      );

    const userSpells = await db
      .select()
      .from(spells)
      .where(eq(spells.ownerId, userId));

    return userSpells;
  } catch (error) {
    console.error("[Database] Failed to get user spells:", error);
    return [];
  }
}

export async function getPlatformSpells(): Promise<Spell[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(spells)
      .where(eq(spells.isPlatformSpell, true));
  } catch (error) {
    console.error("[Database] Failed to get platform spells:", error);
    return [];
  }
}

export async function getSpellById(spellId: string): Promise<Spell | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(spells)
      .where(eq(spells.id, spellId));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get spell:", error);
    return null;
  }
}

export async function getSpellsByIds(spellIds: string[]): Promise<Spell[]> {
  if (spellIds.length === 0) return [];
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(spells)
      .where(inArray(spells.id, spellIds));
  } catch (error) {
    console.error("[Database] Failed to get spells by ids:", error);
    return [];
  }
}

export async function getSummonProfile(
  spellId: string
): Promise<SummonProfile | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(summonProfiles)
      .where(eq(summonProfiles.spellId, spellId));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get summon profile:", error);
    return null;
  }
}

export async function updateSpellResearchStatus(
  spellId: string,
  status: "researching" | "ready"
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .update(spells)
      .set({
        researchStatus: status,
        researchStartedAt: status === "researching" ? new Date() : null,
      })
      .where(eq(spells.id, spellId));
  } catch (error) {
    console.error("[Database] Failed to update spell research status:", error);
  }
}

export async function updateSpellImageUrl(
  spellId: string,
  imageUrl: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .update(spells)
      .set({ imageUrl })
      .where(eq(spells.id, spellId));
  } catch (error) {
    console.error("[Database] Failed to update spell image URL:", error);
  }
}

export async function getOrCreateDeck(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(decks)
      .where(eq(decks.userId, userId));

    if (result.length > 0) {
      return result[0].spellIds;
    }

    const deckId = nanoid(36);
    await db.insert(decks).values({
      id: deckId,
      userId,
      spellIds: [],
    });

    return [];
  } catch (error) {
    console.error("[Database] Failed to get or create deck:", error);
    return [];
  }
}

export async function addSpellToDeck(
  userId: number,
  spellId: string,
  tx?: DbClient
): Promise<boolean> {
  const db = tx || await getDb();
  if (!db) return false;

  try {
    const result = await db
      .select()
      .from(decks)
      .where(eq(decks.userId, userId));

    let currentDeck: string[] = [];
    if (result.length > 0) {
      currentDeck = result[0].spellIds;
    } else {
      const deckId = nanoid(36);
      await db.insert(decks).values({
        id: deckId,
        userId,
        spellIds: [],
      });
    }

    if (currentDeck.includes(spellId)) {
      return true;
    }

    const updatedDeck = [...currentDeck, spellId];
    await db
      .update(decks)
      .set({ spellIds: updatedDeck })
      .where(eq(decks.userId, userId));

    return true;
  } catch (error) {
    console.error("[Database] Failed to add spell to deck:", error);
    return false;
  }
}

export async function removeSpellFromDeck(
  userId: number,
  spellId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const currentDeck = await getOrCreateDeck(userId);
    const updatedDeck = currentDeck.filter((id) => id !== spellId);
    await db
      .update(decks)
      .set({ spellIds: updatedDeck })
      .where(eq(decks.userId, userId));

    return true;
  } catch (error) {
    console.error("[Database] Failed to remove spell from deck:", error);
    return false;
  }
}

export async function getOrCreateLabSlots(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db
      .select()
      .from(labSlots)
      .where(eq(labSlots.userId, userId));

    if (result.length > 0) {
      return result[0].weeklySpellsUsed;
    }

    await db.insert(labSlots).values({
      userId,
      weeklySpellsUsed: 0,
      weeklyResetAt: new Date(),
    });

    return 0;
  } catch (error) {
    console.error("[Database] Failed to get or create lab slots:", error);
    return 0;
  }
}

export async function incrementWeeklySpellCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const existing = await db
      .select()
      .from(labSlots)
      .where(eq(labSlots.userId, userId));

    if (existing.length === 0) {
      await db.insert(labSlots).values({
        userId,
        weeklySpellsUsed: 1,
        weeklyResetAt: new Date(),
      });
      return 1;
    }

    const newCount = existing[0].weeklySpellsUsed + 1;
    await db
      .update(labSlots)
      .set({ weeklySpellsUsed: newCount })
      .where(eq(labSlots.userId, userId));

    return newCount;
  } catch (error) {
    console.error("[Database] Failed to increment weekly spell count:", error);
    return 0;
  }
}
