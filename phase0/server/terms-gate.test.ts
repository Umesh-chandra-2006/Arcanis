import { expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { p0Users } from "../drizzle/schema";
import { TERMS_UPDATE_ERR_MSG, VALIDATION_MESSAGES } from "../shared/constants";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";
import type { TrpcContext } from "./_core/context";

// Every call goes through the real routers and middleware, as a direct API call would.
function api(user: TrpcContext["user"] = null) {
  const octet = () => Math.floor(Math.random() * 250);
  const ip = `192.0.2.${octet()}`;
  const deviceId = nanoid(32);
  return appRouter.createCaller({
    req: { headers: {}, ip },
    res: { getHeader: () => undefined, setHeader: () => {} },
    user,
    sessionId: deviceId,
    ip,
    device: { deviceId, fingerprint: null, ip },
  } as unknown as TrpcContext);
}
const email = () => `gate_${nanoid(10).toLowerCase().replace(/[^a-z0-9]/g, "x")}@test.arcanis`;
const reread = async (id: number) => (await (await getDb())!.select().from(p0Users).where(eq(p0Users.id, id)))[0];

describeDb("18+ gate on accounts from before the new terms", () => {
  it("refuses normal actions, for players and for admins", async () => {
    const player = await createTestUser({ termsAcceptedAt: null });
    await expect(api(player).spells.sparkBalance()).rejects.toMatchObject({ code: "FORBIDDEN", message: TERMS_UPDATE_ERR_MSG });
    await expect(api(player).spells.mySpells()).rejects.toMatchObject({ message: TERMS_UPDATE_ERR_MSG });
    await expect(api(player).profile.setUpdates({ optIn: true })).rejects.toMatchObject({ message: TERMS_UPDATE_ERR_MSG });
    await expect(api(player).spells.create({ name: "Blocked", element: "Fire", category: "Attack", castType: "Instant", description: "a bolt of fire" })).rejects.toMatchObject({ message: TERMS_UPDATE_ERR_MSG });
    const admin = await createTestUser({ termsAcceptedAt: null, role: "admin" });
    await expect(api(admin).analytics.gateMetrics()).rejects.toMatchObject({ message: TERMS_UPDATE_ERR_MSG });
  });

  it("keeps the session check and logging out open, and reports the state", async () => {
    const player = await createTestUser({ termsAcceptedAt: null });
    expect((await api(player).auth.me())?.termsAccepted).toBe(false);
    await expect(api(player).auth.logout()).resolves.toMatchObject({ success: true });
  });

  it("accepting writes the time on the server and unlocks the account", async () => {
    const player = await createTestUser({ termsAcceptedAt: null });
    const result = await api(player).profile.acceptTerms({ accepted: true });
    expect(result.termsAccepted).toBe(true);
    const updated = await reread(player.id);
    expect(updated.termsAcceptedAt).toBeInstanceOf(Date);
    await expect(api(updated).spells.sparkBalance()).resolves.toBeDefined();
  });

  it("cannot be bypassed by calling the API directly", async () => {
    const player = await createTestUser({ termsAcceptedAt: null });
    await expect(api(player).profile.acceptTerms({ accepted: false } as unknown as { accepted: true })).rejects.toThrow();
    await expect(api(player).profile.acceptTerms({} as unknown as { accepted: true })).rejects.toThrow();
    await expect(api().profile.acceptTerms({ accepted: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect((await reread(player.id)).termsAcceptedAt).toBeNull();
  });
});

describeDb("18+ enforcement when creating an account", () => {
  it("creates no account by code, without the box, through the API", async () => {
    for (const signup of [undefined, { termsAccepted: false }]) {
      const address = email();
      const sent = await api().auth.requestSignIn({ email: address, signup });
      await expect(api().auth.verifyCode({ email: address, code: sent.devCode! })).rejects.toMatchObject({ message: VALIDATION_MESSAGES.TERMS_REQUIRED });
      expect(await (await getDb())!.select().from(p0Users).where(eq(p0Users.email, address))).toEqual([]);
    }
  });

  it("creates no account by link, without the box, through the API", async () => {
    const address = email();
    const sent = await api().auth.requestSignIn({ email: address });
    const token = new URL(sent.devUrl!).searchParams.get("token")!;
    await expect(api().auth.verifyLink({ token })).rejects.toMatchObject({ message: VALIDATION_MESSAGES.TERMS_REQUIRED });
    expect(await (await getDb())!.select().from(p0Users).where(eq(p0Users.email, address))).toEqual([]);
  });

  it("the password route never creates an account", async () => {
    const address = email();
    await expect(api().auth.signInWithPassword({ email: address, password: "correct horse battery" })).rejects.toThrow();
    expect(await (await getDb())!.select().from(p0Users).where(eq(p0Users.email, address))).toEqual([]);
  });

  it("a new account with the box ticked is never gated", async () => {
    const address = email();
    const sent = await api().auth.requestSignIn({ email: address, signup: { termsAccepted: true } });
    const { user, isNewUser } = await api().auth.verifyCode({ email: address, code: sent.devCode! });
    expect(isNewUser).toBe(true);
    expect(user.termsAccepted).toBe(true);
    const row = await reread(user.id);
    await expect(api(row).spells.sparkBalance()).resolves.toBeDefined();
  });
});
