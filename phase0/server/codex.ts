// The Codex (Master Doc 23, v7.7): the public wall of player spells. A spell is
// shown only when its owner agreed to it; the Lab asks right after creation and
// the owner can change it later. Signed-in mages vote a shown spell up or down.
import { and, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { p0Spells, p0SpellVotes } from "../drizzle/schema";
import { toPublicSpell, type PublicSpell } from "../shared/spell-view";
import { isTakenDown } from "./spell-pipeline";

export type CodexSort = "new" | "top";

export interface CodexEntry {
  spell: PublicSpell;
  up: number;
  down: number;
  /** The viewer's own vote: 1, -1, or 0 for none (always 0 when signed out). */
  myVote: number;
}

export class CodexError extends Error {
  constructor(
    readonly code: "not_found" | "not_owner" | "not_in_codex" | "own_spell",
    message: string
  ) {
    super(message);
  }
}

// Times are compared on the database clock unless a test passes `now`: spells
// are stamped by the database, and the app server's clock may differ from it.
const notAfter = (column: typeof p0Spells.codexSharedAt | typeof p0Spells.researchReadyAt, now?: Date) =>
  now ? lte(column, now) : lte(column, sql`CURRENT_TIMESTAMP`);

const shown = (now?: Date) =>
  and(
    eq(p0Spells.isPlatformSpell, false),
    eq(p0Spells.isPublic, true),
    sql`${p0Spells.removedAt} IS NULL`,
    isNotNull(p0Spells.codexSharedAt),
    notAfter(p0Spells.codexSharedAt, now),
    notAfter(p0Spells.researchReadyAt, now),
    sql`${p0Spells.ownerId} NOT IN (SELECT id FROM p0_users WHERE banned_at IS NOT NULL)`
  );

const upExpr = sql<number>`COALESCE(SUM(CASE WHEN ${p0SpellVotes.value} > 0 THEN 1 ELSE 0 END), 0)`;
const downExpr = sql<number>`COALESCE(SUM(CASE WHEN ${p0SpellVotes.value} < 0 THEN 1 ELSE 0 END), 0)`;

/** Spells in the Codex, newest first or by score (up minus down), with vote counts. */
export async function listCodex(opts: { sort?: CodexSort; limit?: number; viewerId?: number | null; now?: Date } = {}): Promise<CodexEntry[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? 24, 60));
  const db = requireDb();
  const order =
    opts.sort === "top"
      ? [desc(sql`${upExpr} - ${downExpr}`), desc(p0Spells.codexSharedAt)]
      : [desc(p0Spells.codexSharedAt)];
  const rows = await db
    .select({ spell: p0Spells, up: upExpr, down: downExpr })
    .from(p0Spells)
    .leftJoin(p0SpellVotes, eq(p0SpellVotes.spellId, p0Spells.id))
    .where(shown(opts.now))
    .groupBy(p0Spells.id)
    .orderBy(...order)
    .limit(limit);

  const mine = new Map<string, number>();
  if (opts.viewerId && rows.length) {
    const votes = await db
      .select({ spellId: p0SpellVotes.spellId, value: p0SpellVotes.value })
      .from(p0SpellVotes)
      .where(and(eq(p0SpellVotes.userId, opts.viewerId), inArray(p0SpellVotes.spellId, rows.map((r) => r.spell.id))));
    for (const v of votes) mine.set(v.spellId, v.value);
  }
  // Every row is granted by the database's clock, so it is viewed as granted here too.
  const granted = (readyAt: Date) => new Date(Math.max(opts.now?.getTime() ?? Date.now(), readyAt.getTime()));
  return rows.map((r) => ({ spell: toPublicSpell(r.spell, granted(r.spell.researchReadyAt)), up: Number(r.up), down: Number(r.down), myVote: mine.get(r.spell.id) ?? 0 }));
}

/** The owner shows a spell in the Codex, or takes it out. A spell still in research appears when research completes. */
export async function setCodexShared(userId: number, spellId: string, shared: boolean): Promise<{ inCodex: boolean }> {
  const db = requireDb();
  const [spell] = await db.select().from(p0Spells).where(eq(p0Spells.id, spellId)).limit(1);
  if (!spell || isTakenDown(spell) || spell.isPlatformSpell) throw new CodexError("not_found", "That spell was not found.");
  if (spell.ownerId !== userId) throw new CodexError("not_owner", "Only its creator can decide that.");
  // Keep the first moment it was shared, so asking again does not bump it to the top of "newest".
  if (shared && spell.codexSharedAt) return { inCodex: true };
  // A spell still in research is inscribed for the moment its research completes.
  await db
    .update(p0Spells)
    .set({ codexSharedAt: shared ? sql`GREATEST(CURRENT_TIMESTAMP, ${p0Spells.researchReadyAt})` : null })
    .where(eq(p0Spells.id, spellId));
  return { inCodex: shared };
}

/** A vote: 1 up, -1 down, 0 withdraws it. Only on spells shown in the Codex, never on one's own. */
export async function voteOnSpell(userId: number, spellId: string, value: -1 | 0 | 1, now?: Date): Promise<{ up: number; down: number; myVote: number }> {
  const db = requireDb();
  const [spell] = await db.select({ id: p0Spells.id, ownerId: p0Spells.ownerId }).from(p0Spells).where(and(eq(p0Spells.id, spellId), shown(now))).limit(1);
  if (!spell) throw new CodexError("not_in_codex", "That spell is not in the Codex.");
  if (spell.ownerId === userId) throw new CodexError("own_spell", "You can't vote on your own spell.");
  if (value === 0) {
    await db.delete(p0SpellVotes).where(and(eq(p0SpellVotes.userId, userId), eq(p0SpellVotes.spellId, spellId)));
  } else {
    await db.insert(p0SpellVotes).values({ spellId, userId, value }).onDuplicateKeyUpdate({ set: { value } });
  }
  const [counts] = await db.select({ up: upExpr, down: downExpr }).from(p0SpellVotes).where(eq(p0SpellVotes.spellId, spellId));
  return { up: Number(counts?.up ?? 0), down: Number(counts?.down ?? 0), myVote: value };
}

/** A mage's standing, for the Sanctum. */
export async function codexStanding(userId: number): Promise<{ created: number; inCodex: number; upvotes: number; downvotes: number; shareOpens: number }> {
  const db = requireDb();
  const [spells] = await db
    .select({
      created: sql<number>`COUNT(*)`,
      inCodex: sql<number>`COALESCE(SUM(CASE WHEN ${p0Spells.codexSharedAt} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
      shareOpens: sql<number>`COALESCE(SUM(${p0Spells.shareCount}), 0)`,
    })
    .from(p0Spells)
    .where(and(eq(p0Spells.ownerId, userId), eq(p0Spells.isPlatformSpell, false)));
  const [votes] = await db
    .select({ up: upExpr, down: downExpr })
    .from(p0SpellVotes)
    .innerJoin(p0Spells, eq(p0Spells.id, p0SpellVotes.spellId))
    .where(eq(p0Spells.ownerId, userId));
  return {
    created: Number(spells?.created ?? 0),
    inCodex: Number(spells?.inCodex ?? 0),
    shareOpens: Number(spells?.shareOpens ?? 0),
    upvotes: Number(votes?.up ?? 0),
    downvotes: Number(votes?.down ?? 0),
  };
}
