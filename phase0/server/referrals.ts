// Referrals (Master Doc 23.3 v7.2, task A10). The share link carries the
// sharer's code (?ref=); a new account created from that browser is attributed;
// the inviter is paid once, when the invitee's first creation passes
// verification. Self and same-device referrals are rejected.
import { customAlphabet, nanoid } from "nanoid";
import { and, count, eq, isNull } from "drizzle-orm";
import { requireDb } from "./db";
import { p0DeviceGrants, p0Referrals, p0Spells, p0Users } from "../drizzle/schema";
import { SPARK } from "../shared/constants";
import { grantSpark, type DeviceSignals } from "./spark";
import { trackEvent } from "./analytics";

const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);
export const REFERRAL_CODE = /^[A-HJ-NP-Z2-9]{8}$/;

function isDuplicateKey(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "ER_DUP_ENTRY" || e?.cause?.code === "ER_DUP_ENTRY";
}

export async function ensureReferralCode(userId: number): Promise<string> {
  const db = requireDb();
  const [user] = await db.select({ code: p0Users.referralCode }).from(p0Users).where(eq(p0Users.id, userId)).limit(1);
  if (user?.code) return user.code;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    try {
      const [result] = await db
        .update(p0Users)
        .set({ referralCode: code })
        .where(and(eq(p0Users.id, userId), isNull(p0Users.referralCode)));
      if ((result as { affectedRows?: number }).affectedRows === 1) return code;
      const [again] = await db.select({ code: p0Users.referralCode }).from(p0Users).where(eq(p0Users.id, userId)).limit(1);
      if (again?.code) return again.code;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }
  throw new Error("could not allocate a referral code");
}

/**
 * Records who invited a brand-new account. Called once, at signup.
 * `signupGrantDenied` is true when the device had already received a signup grant.
 */
export async function attachReferral(
  inviteeId: number,
  code: string | null | undefined,
  device: DeviceSignals,
  signupGrantDenied: boolean
): Promise<"none" | "pending" | "rejected"> {
  if (!code || !REFERRAL_CODE.test(code)) return "none";
  const db = requireDb();
  const [inviter] = await db.select({ id: p0Users.id }).from(p0Users).where(eq(p0Users.referralCode, code)).limit(1);
  if (!inviter) return "none";

  let reason: string | null = null;
  if (inviter.id === inviteeId) reason = "self";
  else if (signupGrantDenied) reason = "same_device";
  else if (device.deviceId) {
    const [shared] = await db
      .select({ userId: p0DeviceGrants.userId })
      .from(p0DeviceGrants)
      .where(eq(p0DeviceGrants.deviceKey, `did:${device.deviceId}`))
      .limit(1);
    if (shared && shared.userId === inviter.id) reason = "same_device";
  }
  try {
    await db.insert(p0Referrals).values({
      id: nanoid(36),
      inviterId: inviter.id,
      inviteeId,
      status: reason ? "rejected" : "pending",
      reason,
    });
  } catch (error) {
    if (isDuplicateKey(error)) return "none";
    throw error;
  }
  return reason ? "rejected" : "pending";
}

/** Pays the inviter once, after the invitee's first verified creation. */
export async function payReferralOnFirstCreation(inviteeId: number): Promise<boolean> {
  const db = requireDb();
  const [referral] = await db
    .select()
    .from(p0Referrals)
    .where(and(eq(p0Referrals.inviteeId, inviteeId), eq(p0Referrals.status, "pending")))
    .limit(1);
  if (!referral) return false;
  const [created] = await db.select({ n: count() }).from(p0Spells).where(eq(p0Spells.ownerId, inviteeId));
  if (Number(created?.n ?? 0) < 1) return false;

  const [claimed] = await db
    .update(p0Referrals)
    .set({ status: "paid", paidAt: new Date() })
    .where(and(eq(p0Referrals.id, referral.id), eq(p0Referrals.status, "pending")));
  if ((claimed as { affectedRows?: number }).affectedRows !== 1) return false;

  await grantSpark(referral.inviterId, SPARK.referralInviter, "grant_referral_inviter", `referral:${inviteeId}`);
  await grantSpark(inviteeId, SPARK.referralInvitee, "grant_referral_invitee", `referral-invitee:${inviteeId}`);
  await trackEvent({ eventType: "referral_paid", userId: referral.inviterId, metadata: { inviteeId } });
  return true;
}
