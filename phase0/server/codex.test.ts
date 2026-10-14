import { it, expect, afterAll } from "vitest";
import { nanoid } from "nanoid";
import { inArray } from "drizzle-orm";
import { getDb } from "./db";
import { p0Feedback, p0Spells, p0SpellVotes } from "../drizzle/schema";
import { CodexError, codexStanding, listCodex, setCodexShared, voteOnSpell } from "./codex";
import { hasGivenFeedback, recentFeedback, saveFeedback } from "./feedback";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";

// The test database is shared with local dev: what these tests put in the Codex is removed afterwards.
const made: string[] = [];
afterAll(async () => {
  if (!made.length) return;
  const db = (await getDb())!;
  await db.delete(p0SpellVotes).where(inArray(p0SpellVotes.spellId, made));
  await db.delete(p0Spells).where(inArray(p0Spells.id, made));
});

async function spellOf(ownerId: number, over: Partial<typeof p0Spells.$inferInsert> = {}) {
  const id = nanoid();
  made.push(id);
  await (await getDb())!.insert(p0Spells).values({
    id,
    ownerId,
    name: `Codex ${id.slice(0, 6)}`,
    element: "Fire",
    category: "Attack",
    damageMin: 10,
    damageMax: 14,
    mpCost: 10,
    willCostMin: 10,
    willCostMax: 12,
    castTimeMs: 400,
    flavorText: "Heat.",
    loreLine: "Ash remembers.",
    imageUrl: "https://example.test/a.png",
    generationMetadata: {},
    ...over,
  });
  return id;
}

const ids = (entries: { spell: { id: string } }[]) => entries.map((e) => e.spell.id);

describeDb("Codex", () => {
  it("shows only spells whose owner agreed, and takes them out on request", async () => {
    const owner = await createTestUser();
    const kept = await spellOf(owner.id);
    const shared = await spellOf(owner.id);
    expect(ids(await listCodex({ limit: 60 }))).not.toContain(shared);

    await setCodexShared(owner.id, shared, true);
    const wall = ids(await listCodex({ limit: 60 }));
    expect(wall).toContain(shared);
    expect(wall).not.toContain(kept);

    await setCodexShared(owner.id, shared, false);
    expect(ids(await listCodex({ limit: 60 }))).not.toContain(shared);
  });

  it("refuses a spell that is not the player's own, a platform spell, or a taken-down one", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const spell = await spellOf(owner.id);
    await expect(setCodexShared(other.id, spell, true)).rejects.toMatchObject({ code: "not_owner" });
    const platform = await spellOf(owner.id, { isPlatformSpell: true });
    await expect(setCodexShared(owner.id, platform, true)).rejects.toBeInstanceOf(CodexError);
    const removed = await spellOf(owner.id, { removedAt: new Date() });
    await expect(setCodexShared(owner.id, removed, true)).rejects.toMatchObject({ code: "not_found" });
  });

  it("a researching spell agreed for the Codex appears only when research completes", async () => {
    const owner = await createTestUser();
    const ready = new Date(Date.now() + 60 * 60_000);
    const spell = await spellOf(owner.id, { researchReadyAt: ready });
    await setCodexShared(owner.id, spell, true);
    expect(ids(await listCodex({ limit: 60 }))).not.toContain(spell);
    expect(ids(await listCodex({ limit: 60, now: new Date(ready.getTime() + 1000) }))).toContain(spell);
  });

  it("counts up and down votes, one per player, changeable and withdrawable, never on one's own", async () => {
    const owner = await createTestUser();
    const [a, b, c] = [await createTestUser(), await createTestUser(), await createTestUser()];
    const spell = await spellOf(owner.id);

    await expect(voteOnSpell(a.id, spell, 1)).rejects.toMatchObject({ code: "not_in_codex" });
    await setCodexShared(owner.id, spell, true);
    await expect(voteOnSpell(owner.id, spell, 1)).rejects.toMatchObject({ code: "own_spell" });

    await voteOnSpell(a.id, spell, 1);
    await voteOnSpell(a.id, spell, 1); // a repeat does not count twice
    await voteOnSpell(b.id, spell, 1);
    expect(await voteOnSpell(c.id, spell, -1)).toEqual({ up: 2, down: 1, myVote: -1 });
    expect(await voteOnSpell(b.id, spell, -1)).toMatchObject({ up: 1, down: 2 });
    expect(await voteOnSpell(c.id, spell, 0)).toMatchObject({ up: 1, down: 1, myVote: 0 });

    const entry = (await listCodex({ limit: 60, viewerId: a.id })).find((e) => e.spell.id === spell)!;
    expect(entry).toMatchObject({ up: 1, down: 1, myVote: 1 });
    const anonymous = (await listCodex({ limit: 60 })).find((e) => e.spell.id === spell)!;
    expect(anonymous.myVote).toBe(0);

    expect(await codexStanding(owner.id)).toMatchObject({ created: 1, inCodex: 1, upvotes: 1, downvotes: 1 });
  });

  it("sorts by score for the top view", async () => {
    const owner = await createTestUser();
    const voters = [await createTestUser(), await createTestUser(), await createTestUser()];
    const low = await spellOf(owner.id);
    const high = await spellOf(owner.id);
    await setCodexShared(owner.id, low, true);
    await setCodexShared(owner.id, high, true);
    for (const v of voters) await voteOnSpell(v.id, high, 1);
    await voteOnSpell(voters[0].id, low, -1);
    const top = ids(await listCodex({ sort: "top", limit: 60 }));
    expect(top.indexOf(high)).toBeLessThan(top.indexOf(low));
  });
});

describeDb("feedback", () => {
  it("stores feedback for admins and remembers that it was given", async () => {
    const user = await createTestUser();
    expect(await hasGivenFeedback(user.id)).toBe(false);
    await saveFeedback(user.id, { kind: "idea", rating: 4, message: "More elements, please.", source: "first_spell" });
    expect(await hasGivenFeedback(user.id)).toBe(true);
    const row = (await recentFeedback(200)).find((f) => f.userId === user.id);
    expect(row).toMatchObject({ kind: "idea", rating: 4, message: "More elements, please.", source: "first_spell", username: user.username });
    await (await getDb())!.delete(p0Feedback).where(inArray(p0Feedback.userId, [user.id]));
  });
});
