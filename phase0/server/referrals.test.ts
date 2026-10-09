import { it, expect } from "vitest";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { p0Referrals } from "../drizzle/schema";
import { ensureReferralCode } from "./referrals";
import { grantSignupSpark, getSparkBalance } from "./spark";
import { requestSignIn, verifySignInCode } from "./auth-service";
import { createSpell, type PipelineDeps } from "./spell-pipeline";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";
import { SPARK } from "../shared/constants";

const email = () => `ref_${nanoid(8).toLowerCase().replace(/[^a-z0-9]/g, "x")}@test.arcanis`;
const device = () => ({ deviceId: nanoid(32), fingerprint: null, ip: `198.51.${Math.floor(Math.random() * 250)}.9` });
const req = () => ({ ip: `198.20.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, deviceId: nanoid(32) });

async function deps(): Promise<Partial<PipelineDeps>> {
  const png = new Uint8Array(await sharp({ create: { width: 32, height: 32, channels: 3, background: "#227744" } }).png().toBuffer());
  return {
    text: async () => ({
      text: JSON.stringify({
        flavor_text: "A green spark.",
        lore_line: "Seeds remember.",
        image_prompt: "a seed of light",
        research_complexity: 2,
        stats: { damage_min: 15, damage_max: 20, mp_cost: 12, will_cost_min: 15, will_cost_max: 16, cast_time_ms: 400 },
      }),
      provider: "fake",
      model: "m",
      inputTokens: 1,
      outputTokens: 1,
    }),
    image: async () => ({ bytes: png, mime: "image/png", provider: "fake", model: "m", width: 32, height: 32 }),
    moderate: async () => ({ verdict: "pass", reason: null, scores: {} }),
    sleep: async () => {},
  };
}

async function signUpWith(code: string | null, dev = device()) {
  const address = email();
  const sent = await requestSignIn(address, req());
  return verifySignInCode(address, sent.devCode!, dev, null, code);
}

describeDb("referrals", () => {
  it("pays the inviter once, when the invitee's first creation succeeds", async () => {
    const inviter = await createTestUser();
    await grantSignupSpark(inviter.id, device());
    const code = await ensureReferralCode(inviter.id);
    expect(await ensureReferralCode(inviter.id)).toBe(code);

    const invitee = await signUpWith(code);
    const before = (await getSparkBalance(inviter.id)).balance;
    const d = await deps();
    expect((await createSpell(invitee.user.id, { name: "Seed", element: "Nature", category: "Attack", castType: "Instant", description: "a seed" }, { deps: d })).success).toBe(true);
    expect((await getSparkBalance(inviter.id)).balance).toBe(before + SPARK.referralInviter);
    // A second creation pays nothing more.
    await createSpell(invitee.user.id, { name: "Seed 2", element: "Nature", category: "Attack", castType: "Instant", description: "a seed" }, { deps: d });
    expect((await getSparkBalance(inviter.id)).balance).toBe(before + SPARK.referralInviter);
    // The invitee only gets the signup grant (F7: referral invitee bonus is 0).
    expect((await getSparkBalance(invitee.user.id)).balance).toBe(SPARK.signupGrant - 2);
  });

  it("rejects a referral from the inviter's own device", async () => {
    const shared = device();
    const inviter = await createTestUser();
    await grantSignupSpark(inviter.id, shared);
    const code = await ensureReferralCode(inviter.id);
    const invitee = await signUpWith(code, shared);
    const [row] = await (await getDb())!.select().from(p0Referrals).where(eq(p0Referrals.inviteeId, invitee.user.id));
    expect(row).toMatchObject({ status: "rejected", reason: "same_device" });
  });

  it("ignores unknown or malformed codes", async () => {
    const invitee = await signUpWith("NOTACODE1");
    const rows = await (await getDb())!.select().from(p0Referrals).where(eq(p0Referrals.inviteeId, invitee.user.id));
    expect(rows).toHaveLength(0);
  });
});
