// Account deletion (privacy page, "How long we keep it"). The founder schedules a request with
// scripts/account-deletion.ts. The player is emailed 30, 15 and 7 days before; the daily job then deletes.
//
// Deleted: the account, spells (and votes and reviews on them), the player's own reviews, votes, feedback,
// generation runs, moderation records, referrals, queue, sessions and sign-in tokens.
// Anonymised: analytics events and provider call logs lose the user id.
// Kept: the Spark and rune ledgers, which are append-only (no account row is left to identify the id), and
// p0_device_grants, which the retention job removes at 12 months so the free Spark is not claimed again sooner.
// Not touched: files in image storage. Generated art is off (CARD_ART=element), so spells have no per-player art.
import { and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { ENV } from "./_core/env";
import { sendEmail } from "./providers/email";
import { SUPPORT_EMAIL } from "../shared/constants";
import {
  p0AnalyticsEvents,
  p0Feedback,
  p0ForgeQueue,
  p0GenerationRuns,
  p0LoginTokens,
  p0ModerationEvents,
  p0ProviderCalls,
  p0Referrals,
  p0Reviews,
  p0Sessions,
  p0SparkWaitlist,
  p0SpellVotes,
  p0Spells,
  p0Users,
  type Phase0User,
} from "../drizzle/schema";

const DAY = 86_400_000;
export const DELETION_GRACE_DAYS = 30;
export const DELETION_NOTICE_DAYS = [30, 15, 7];

export class AccountDeletionError extends Error {}

export type SendMail = (message: { to: string; subject: string; text: string; html: string }) => Promise<unknown>;
const defaultSend: SendMail = (message) => sendEmail({ surface: "email" }, message);

async function findUser(email: string): Promise<Phase0User> {
  const [user] = await requireDb().select().from(p0Users).where(eq(p0Users.email, email.trim().toLowerCase())).limit(1);
  if (!user) throw new AccountDeletionError("No account has that email.");
  return user;
}

/** Admin accounts and the system account that owns the base spells can never be deleted this way. */
async function assertDeletable(user: Phase0User): Promise<void> {
  if (user.role === "admin") throw new AccountDeletionError("Refusing to delete an admin account.");
  const [platform] = await requireDb()
    .select({ id: p0Spells.id })
    .from(p0Spells)
    .where(and(eq(p0Spells.ownerId, user.id), eq(p0Spells.isPlatformSpell, true)))
    .limit(1);
  if (platform) throw new AccountDeletionError("Refusing to delete the account that owns the base spells.");
}

function noticeEmail(to: string, daysLeft: number, date: Date) {
  const when = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const subject = `Your Arcanis account will be deleted in ${daysLeft} days`;
  const lines = [
    `You asked us to delete your Arcanis account. It will be deleted on ${when}, in ${daysLeft} days.`,
    "Your spells, reviews and votes will go with it, and this cannot be undone.",
    `If you have changed your mind, write to ${SUPPORT_EMAIL} before that date and we will cancel it.`,
    "If you still want it deleted, you do not need to do anything.",
  ];
  return { to, subject, text: lines.join("\n\n"), html: lines.map((line) => `<p>${line}</p>`).join("") };
}

/** The notice due now: the nearest of 30, 15 and 7 days that has been reached and not yet sent. */
export function dueNotice(daysLeft: number, lastSent: number | null): number | null {
  const reached = DELETION_NOTICE_DAYS.filter((days) => daysLeft <= days);
  if (reached.length === 0) return null;
  const nearest = Math.min(...reached);
  return lastSent === null || nearest < lastSent ? nearest : null;
}

/** Sets the date and sends the first notice. Scheduling again keeps the original date. */
export async function scheduleAccountDeletion(email: string, options: { now?: Date; send?: SendMail } = {}): Promise<Date> {
  const now = options.now ?? new Date();
  const user = await findUser(email);
  await assertDeletable(user);
  if (user.deletionScheduledFor) return user.deletionScheduledFor;
  // Whole seconds, as the database stores it, so this returns the same date every time.
  const date = new Date(Math.floor((now.getTime() + DELETION_GRACE_DAYS * DAY) / 1000) * 1000);
  await requireDb().update(p0Users).set({ deletionScheduledFor: date, deletionLastNoticeDays: null }).where(eq(p0Users.id, user.id));
  await processAccountDeletions({ now, send: options.send, onlyUserId: user.id });
  return date;
}

export async function cancelAccountDeletion(email: string): Promise<void> {
  const user = await findUser(email);
  await requireDb().update(p0Users).set({ deletionScheduledFor: null, deletionLastNoticeDays: null }).where(eq(p0Users.id, user.id));
}

export async function scheduledDeletions(): Promise<{ email: string; deletionScheduledFor: Date | null; deletionLastNoticeDays: number | null }[]> {
  return requireDb()
    .select({ email: p0Users.email, deletionScheduledFor: p0Users.deletionScheduledFor, deletionLastNoticeDays: p0Users.deletionLastNoticeDays })
    .from(p0Users)
    .where(isNotNull(p0Users.deletionScheduledFor));
}

/** Deletes one account now. Used by the daily job on the date, and directly for an under-18 account. */
export async function deleteAccount(email: string, options: { send?: SendMail } = {}): Promise<void> {
  const user = await findUser(email);
  await assertDeletable(user);
  await requireDb().transaction(async (tx) => {
    const spellIds = (await tx.select({ id: p0Spells.id }).from(p0Spells).where(eq(p0Spells.ownerId, user.id))).map((row) => row.id);
    const ownReviewIds = (await tx.select({ id: p0Reviews.id }).from(p0Reviews).where(eq(p0Reviews.userId, user.id))).map((row) => row.id);
    const onSpells = spellIds.length ? (await tx.select({ id: p0Reviews.id }).from(p0Reviews).where(inArray(p0Reviews.spellId, spellIds))).map((row) => row.id) : [];
    const reviewIds = [...new Set([...ownReviewIds, ...onSpells])];

    await tx.delete(p0ModerationEvents).where(
      or(
        eq(p0ModerationEvents.userId, user.id),
        spellIds.length ? and(eq(p0ModerationEvents.targetType, "spell"), inArray(p0ModerationEvents.targetId, spellIds)) : undefined,
        reviewIds.length ? and(eq(p0ModerationEvents.targetType, "review"), inArray(p0ModerationEvents.targetId, reviewIds)) : undefined
      )
    );
    await tx.delete(p0SpellVotes).where(or(eq(p0SpellVotes.userId, user.id), spellIds.length ? inArray(p0SpellVotes.spellId, spellIds) : undefined));
    if (reviewIds.length) await tx.delete(p0Reviews).where(inArray(p0Reviews.id, reviewIds));
    await tx.delete(p0Spells).where(eq(p0Spells.ownerId, user.id));
    await tx.delete(p0GenerationRuns).where(eq(p0GenerationRuns.userId, user.id));
    await tx.delete(p0ForgeQueue).where(eq(p0ForgeQueue.userId, user.id));
    await tx.delete(p0Feedback).where(eq(p0Feedback.userId, user.id));
    await tx.delete(p0SparkWaitlist).where(eq(p0SparkWaitlist.userId, user.id));
    await tx.delete(p0Referrals).where(or(eq(p0Referrals.inviterId, user.id), eq(p0Referrals.inviteeId, user.id)));
    await tx.delete(p0Sessions).where(eq(p0Sessions.userId, user.id));
    await tx.delete(p0LoginTokens).where(eq(p0LoginTokens.email, user.email));
    await tx.update(p0AnalyticsEvents).set({ userId: null }).where(eq(p0AnalyticsEvents.userId, user.id));
    await tx.update(p0ProviderCalls).set({ userId: null }).where(eq(p0ProviderCalls.userId, user.id));
    await tx.delete(p0Users).where(eq(p0Users.id, user.id));
  });

  // This inbox is the founder's list of deleted accounts, to delete again after a backup is restored.
  const lines = [`Deleted account: ${user.email}`, "Keep this email. If a backup is ever restored, delete this account again."];
  await (options.send ?? defaultSend)({ to: SUPPORT_EMAIL, subject: "Arcanis account deleted", text: lines.join("\n\n"), html: lines.map((line) => `<p>${line}</p>`).join("") }).catch(() => {
    console.warn("[Account deletion] the record email failed; add this account to the deleted list by hand");
  });
}

/**
 * Sends the notices that are due and deletes the accounts whose date has come. Safe to run twice. A notice that
 * fails to send is tried again next run; deletion still happens on the date, as the policy promises.
 * Test accounts are left alone outside the test suite, so a dev server on the test database never emails them.
 */
export async function processAccountDeletions(options: { now?: Date; send?: SendMail; onlyUserId?: number } = {}): Promise<{ notices: number; deleted: number; failed: number }> {
  const now = options.now ?? new Date();
  const send = options.send ?? defaultSend;
  const due = await requireDb()
    .select()
    .from(p0Users)
    .where(
      and(
        isNotNull(p0Users.deletionScheduledFor),
        options.onlyUserId ? eq(p0Users.id, options.onlyUserId) : undefined,
        ENV.isTest ? undefined : sql`${p0Users.email} NOT LIKE '%@test.arcanis'`
      )
    );
  const result = { notices: 0, deleted: 0, failed: 0 };
  for (const user of due) {
    const date = user.deletionScheduledFor as Date;
    try {
      if (date.getTime() <= now.getTime()) {
        await deleteAccount(user.email, { send });
        result.deleted++;
        continue;
      }
      const daysLeft = Math.ceil((date.getTime() - now.getTime()) / DAY);
      const notice = dueNotice(daysLeft, user.deletionLastNoticeDays);
      if (notice === null) continue;
      await send(noticeEmail(user.email, daysLeft, date));
      await requireDb().update(p0Users).set({ deletionLastNoticeDays: notice }).where(eq(p0Users.id, user.id));
      result.notices++;
    } catch {
      result.failed++;
    }
  }
  return result;
}

/** Never throws, and logs only counts. */
export async function processAccountDeletionsSafely(): Promise<void> {
  try {
    const { notices, deleted, failed } = await processAccountDeletions();
    if (notices || deleted || failed) console.log(`[Account deletion] ${notices} notices, ${deleted} deleted, ${failed} failed`);
  } catch (error) {
    console.warn("[Account deletion] run failed; the next run will retry:", error instanceof Error ? error.name : "unknown error");
  }
}
