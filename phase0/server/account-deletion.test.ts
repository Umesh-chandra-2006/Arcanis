import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { p0AnalyticsEvents, p0Feedback, p0Reviews, p0Sessions, p0SparkLedger, p0SpellVotes, p0Spells, p0Users } from "../drizzle/schema";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";
import { cancelAccountDeletion, deleteAccount, dueNotice, processAccountDeletions, scheduleAccountDeletion, scheduledDeletions } from "./account-deletion";
import { SUPPORT_EMAIL } from "../shared/constants";

const DAY = 86_400_000;
const inbox = () => {
  const sent: { to: string; subject: string; text: string }[] = [];
  return { sent, send: async (message: { to: string; subject: string; text: string; html: string }) => void sent.push(message) };
};
const start = new Date(Math.floor(Date.now() / 1000) * 1000);
const after = (days: number) => new Date(start.getTime() + days * DAY);
const row = async (id: number) => (await (await getDb())!.select().from(p0Users).where(eq(p0Users.id, id)))[0];

async function addSpell(ownerId: number, overrides: Record<string, unknown> = {}) {
  const id = nanoid(36);
  await (await getDb())!.insert(p0Spells).values({
    id, ownerId, name: "m", element: "Fire", category: "Attack", castType: "Instant", tier: "Basic",
    damageMin: 10, damageMax: 12, mpCost: 10, willCostMin: 12, willCostMax: 13, castTimeMs: 400,
    flavorText: "f", loreLine: "l", imageUrl: "", generationMetadata: {}, ...overrides,
  });
  return id;
}

describe("dueNotice", () => {
  it("picks the nearest notice reached and not yet sent", () => {
    expect(dueNotice(30, null)).toBe(30);
    expect(dueNotice(29, 30)).toBeNull();
    expect(dueNotice(15, 30)).toBe(15);
    expect(dueNotice(14, 15)).toBeNull();
    expect(dueNotice(7, 15)).toBe(7);
    expect(dueNotice(3, 7)).toBeNull();
  });

  it("does not send stale notices after a gap: only the nearest one", () => {
    expect(dueNotice(6, 30)).toBe(7);
  });
});

describeDb("scheduled account deletion", () => {
  it("emails at 30, 15 and 7 days, once each, then deletes on the date", async () => {
    const user = await createTestUser();
    const mail = inbox();
    const date = await scheduleAccountDeletion(user.email, { now: start, send: mail.send });
    expect(date.getTime()).toBe(after(30).getTime());
    expect(mail.sent.map((m) => m.subject)).toEqual(["Your Arcanis account will be deleted in 30 days"]);
    expect(mail.sent[0].to).toBe(user.email);
    expect(mail.sent[0].text).toContain(SUPPORT_EMAIL);

    const run = (day: number) => processAccountDeletions({ now: after(day), send: mail.send, onlyUserId: user.id });
    await run(1);
    await run(14);
    expect(mail.sent).toHaveLength(1);
    await run(15);
    await run(15);
    expect(mail.sent[1].subject).toContain("in 15 days");
    expect(mail.sent).toHaveLength(2);
    await run(23);
    await run(29);
    expect(mail.sent[2].subject).toContain("in 7 days");
    expect(mail.sent).toHaveLength(3);
    expect(await row(user.id)).toBeDefined();

    expect((await run(30)).deleted).toBe(1);
    expect(await row(user.id)).toBeUndefined();
    expect(mail.sent[3].to).toBe(SUPPORT_EMAIL);
    expect(mail.sent[3].text).toContain(user.email);
  });

  it("scheduling twice keeps the original date", async () => {
    const user = await createTestUser();
    const mail = inbox();
    const first = await scheduleAccountDeletion(user.email, { now: start, send: mail.send });
    const second = await scheduleAccountDeletion(user.email, { now: after(5), send: mail.send });
    expect(second.getTime()).toBe(first.getTime());
    expect(mail.sent).toHaveLength(1);
    await cancelAccountDeletion(user.email);
  });

  it("cancelling stops the notices and the deletion", async () => {
    const user = await createTestUser();
    const mail = inbox();
    await scheduleAccountDeletion(user.email, { now: start, send: mail.send });
    await cancelAccountDeletion(user.email);
    expect((await scheduledDeletions()).map((s) => s.email)).not.toContain(user.email);
    expect(await processAccountDeletions({ now: after(31), send: mail.send, onlyUserId: user.id })).toEqual({ notices: 0, deleted: 0, failed: 0 });
    expect(await row(user.id)).toBeDefined();
  });

  it("a notice that fails is tried again, and does not stop the deletion on the date", async () => {
    const user = await createTestUser();
    const failing = async () => {
      throw new Error("provider down");
    };
    await scheduleAccountDeletion(user.email, { now: start, send: failing });
    expect((await row(user.id)).deletionLastNoticeDays).toBeNull();
    const mail = inbox();
    await processAccountDeletions({ now: after(1), send: mail.send, onlyUserId: user.id });
    expect(mail.sent).toHaveLength(1);
    expect((await processAccountDeletions({ now: after(30), send: failing, onlyUserId: user.id })).deleted).toBe(1);
    expect(await row(user.id)).toBeUndefined();
  });

  it("refuses admins and the account that owns the base spells", async () => {
    const admin = await createTestUser({ role: "admin" });
    await expect(scheduleAccountDeletion(admin.email)).rejects.toThrow("admin");
    await expect(deleteAccount(admin.email)).rejects.toThrow("admin");
    const system = await createTestUser();
    await addSpell(system.id, { isPlatformSpell: true });
    await expect(deleteAccount(system.email)).rejects.toThrow("base spells");
    await (await getDb())!.delete(p0Spells).where(eq(p0Spells.ownerId, system.id));
  });
});

describeDb("deleteAccount", () => {
  it("removes the player's data, anonymises their events, keeps the ledger, and leaves other players alone", async () => {
    const db = (await getDb())!;
    const player = await createTestUser();
    const other = await createTestUser();
    const mine = await addSpell(player.id);
    const theirs = await addSpell(other.id);
    const reviewId = () => nanoid(36);
    const onMine = reviewId();
    const byMe = reviewId();
    const theirsKept = reviewId();
    await db.insert(p0Reviews).values([
      { id: onMine, spellId: mine, userId: other.id, rating: 5, comment: "on my spell" },
      { id: byMe, spellId: theirs, userId: player.id, rating: 5, comment: "by me" },
    ]);
    const third = await createTestUser();
    await db.insert(p0Reviews).values({ id: theirsKept, spellId: theirs, userId: third.id, rating: 4, comment: "kept" });
    await db.insert(p0SpellVotes).values([
      { id: nanoid(36), spellId: mine, userId: other.id, value: 1 },
      { id: nanoid(36), spellId: theirs, userId: player.id, value: 1 },
    ] as never);
    await db.insert(p0Feedback).values({ id: nanoid(36), userId: player.id, kind: "idea", source: "page", message: "hello" } as never);
    await db.insert(p0Sessions).values({ tokenHash: nanoid(40), userId: player.id, expiresAt: after(30) });
    const eventId = nanoid(36);
    await db.insert(p0AnalyticsEvents).values({ id: eventId, eventType: "lab_opened", userId: player.id, metadata: {} });
    const ledgerId = nanoid(36);
    await db.insert(p0SparkLedger).values({ id: ledgerId, userId: player.id, amount: 3, type: "grant_signup", status: "committed", idempotencyKey: `signup:${player.id}` } as never);

    const mail = inbox();
    await deleteAccount(player.email, { send: mail.send });

    expect(await row(player.id)).toBeUndefined();
    expect(await db.select().from(p0Spells).where(eq(p0Spells.id, mine))).toEqual([]);
    expect(await db.select().from(p0Reviews).where(eq(p0Reviews.id, onMine))).toEqual([]);
    expect(await db.select().from(p0Reviews).where(eq(p0Reviews.id, byMe))).toEqual([]);
    expect(await db.select().from(p0SpellVotes).where(eq(p0SpellVotes.userId, player.id))).toEqual([]);
    expect(await db.select().from(p0SpellVotes).where(eq(p0SpellVotes.spellId, mine))).toEqual([]);
    expect(await db.select().from(p0Feedback).where(eq(p0Feedback.userId, player.id))).toEqual([]);
    expect(await db.select().from(p0Sessions).where(eq(p0Sessions.userId, player.id))).toEqual([]);
    const [event] = await db.select().from(p0AnalyticsEvents).where(eq(p0AnalyticsEvents.id, eventId));
    expect(event.userId).toBeNull();
    expect(await db.select().from(p0SparkLedger).where(eq(p0SparkLedger.id, ledgerId))).toHaveLength(1);

    expect(await row(other.id)).toBeDefined();
    expect(await db.select().from(p0Spells).where(eq(p0Spells.id, theirs))).toHaveLength(1);
    expect(await db.select().from(p0Reviews).where(eq(p0Reviews.id, theirsKept))).toHaveLength(1);
  });

  it("works for an account with no data at all, and a missing email is an error", async () => {
    const empty = await createTestUser();
    const mail = inbox();
    await deleteAccount(empty.email, { send: mail.send });
    expect(await row(empty.id)).toBeUndefined();
    await expect(deleteAccount(empty.email, { send: mail.send })).rejects.toThrow("No account");
  });

  it("still deletes when the record email fails", async () => {
    const user = await createTestUser();
    await deleteAccount(user.email, {
      send: async () => {
        throw new Error("provider down");
      },
    });
    expect(await row(user.id)).toBeUndefined();
  });
});
