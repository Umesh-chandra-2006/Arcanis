import { describe, it, expect, vi } from "vitest";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "./rate-limit";
import {
  AuthError,
  changePassword,
  createSession,
  deriveUsername,
  PASSWORD_RESET_WINDOW_MS,
  sessionAllowsPasswordReset,
  isDisposableEmail,
  requestSignIn,
  setPassword,
  signInWithPassword,
  revokeSession,
  userForSession,
  validateEmailFormat,
  verifySignInCode,
  verifySignInLink,
} from "./auth-service";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { p0LoginTokens, p0SparkLedger, p0Users } from "../drizzle/schema";
import { describeDb } from "./test/db";
import { createTestUser } from "./test/factories";
import { LOGIN_CODE_MAX_ATTEMPTS } from "../shared/constants";

const device = () => ({ deviceId: nanoid(32), fingerprint: null, ip: `198.18.${Math.floor(Math.random() * 250)}.1` });
const req = () => ({ ip: `198.19.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, deviceId: nanoid(32) });
const freshEmail = () => `id_${nanoid(8).toLowerCase().replace(/[^a-z0-9]/g, "x")}@test.arcanis`;
const linkFrom = (url: string) => new URL(url).searchParams.get("token")!;

describe("rate-limit (in-memory)", () => {
  it("allows requests under the limit and blocks over it", () => {
    expect(checkRateLimit("test:rate:1", 2, 60).allowed).toBe(true);
    expect(checkRateLimit("test:rate:1", 2, 60).allowed).toBe(true);
    expect(checkRateLimit("test:rate:1", 2, 60).allowed).toBe(false);
  });
});

describe("auth-service validators", () => {
  it("validates email formats", () => {
    expect(validateEmailFormat("mage@arcanis.app")).toBe(true);
    expect(validateEmailFormat("not-an-email")).toBe(false);
    expect(validateEmailFormat("a@b")).toBe(false);
  });

  it("blocks disposable email domains", () => {
    expect(isDisposableEmail("tester@mailinator.com")).toBe(true);
    expect(isDisposableEmail("mage@gmail.com")).toBe(false);
  });

  it("placeholder usernames never contain the email", () => {
    const name = deriveUsername("ember.mage@arcanis.app");
    expect(name).toMatch(/^mage_[a-z0-9]{8}$/);
    expect(name).not.toContain("ember");
  });
});

describeDb("identity (Build Plan 16)", () => {
  it("the request response is identical for existing and new emails", async () => {
    const existing = await createTestUser();
    const a = await requestSignIn(existing.email, req());
    const b = await requestSignIn(freshEmail(), req());
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    expect(typeof a.devCode).toBe(typeof b.devCode);
  });

  it("stores only hashes", async () => {
    const email = freshEmail();
    const sent = await requestSignIn(email, req());
    const [row] = await (await getDb())!.select().from(p0LoginTokens).where(eq(p0LoginTokens.email, email));
    expect(row.linkHash).not.toContain(linkFrom(sent.devUrl!));
    expect(row.codeHash).not.toContain(sent.devCode!);
    expect(row.linkHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("a new player signs in by code, gets a session and the signup grant", async () => {
    const email = freshEmail();
    const sent = await requestSignIn(email, req());
    const result = await verifySignInCode(email, sent.devCode!, device(), null);
    expect(result.isNewUser).toBe(true);
    expect((await userForSession(result.sessionToken))?.id).toBe(result.user.id);
    const ledger = await (await getDb())!.select().from(p0SparkLedger).where(eq(p0SparkLedger.userId, result.user.id));
    expect(ledger.map((e) => e.type)).toEqual(["grant_signup"]);
  });

  it("code brute force stops after 5 attempts, even in parallel", async () => {
    const email = freshEmail();
    const sent = await requestSignIn(email, req());
    const wrong = sent.devCode === "000000" ? "111111" : "000000";
    const guesses = await Promise.allSettled(
      Array.from({ length: 12 }, () => verifySignInCode(email, wrong, device(), null))
    );
    expect(guesses.every((g) => g.status === "rejected")).toBe(true);
    const [row] = await (await getDb())!.select().from(p0LoginTokens).where(eq(p0LoginTokens.email, email));
    expect(row.attempts).toBe(LOGIN_CODE_MAX_ATTEMPTS);
    // The right code no longer works once attempts are spent.
    await expect(verifySignInCode(email, sent.devCode!, device(), null)).rejects.toBeInstanceOf(AuthError);
  });

  it("the link redeems once under concurrent requests", async () => {
    const email = freshEmail();
    const sent = await requestSignIn(email, req());
    const token = linkFrom(sent.devUrl!);
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => verifySignInLink(token, device())));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("the code redeems once under concurrent requests", async () => {
    const email = freshEmail();
    const sent = await requestSignIn(email, req());
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => verifySignInCode(email, sent.devCode!, device(), null)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("using the link consumes the code, and the reverse", async () => {
    const email = freshEmail();
    const sent = await requestSignIn(email, req());
    await verifySignInLink(linkFrom(sent.devUrl!), device());
    await expect(verifySignInCode(email, sent.devCode!, device(), null)).rejects.toBeInstanceOf(AuthError);

    const email2 = freshEmail();
    const sent2 = await requestSignIn(email2, req());
    await verifySignInCode(email2, sent2.devCode!, device(), null);
    await expect(verifySignInLink(linkFrom(sent2.devUrl!), device())).rejects.toBeInstanceOf(AuthError);
  });

  it("an expired link is refused", async () => {
    const email = freshEmail();
    const sent = await requestSignIn(email, req());
    await (await getDb())!.update(p0LoginTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(p0LoginTokens.email, email));
    await expect(verifySignInLink(linkFrom(sent.devUrl!), device())).rejects.toBeInstanceOf(AuthError);
  });

  it("refuses disposable email domains before sending anything", async () => {
    await expect(requestSignIn("farm123@mailinator.com", req())).rejects.toMatchObject({ code: "bad_email" });
  });

  it("rate-limits repeated requests for one email", async () => {
    const email = freshEmail();
    await requestSignIn(email, req());
    await expect(requestSignIn(email, req())).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("a failed send does not make the player wait: the next request is not rate-limited", async () => {
    const env = ENV as { emailProviders: string; resendApiKey: string };
    const saved = { ...env };
    const email = freshEmail();
    const from = req();
    env.emailProviders = "resend";
    env.resendApiKey = "test-key";
    vi.stubGlobal("fetch", async () => new Response("unauthorized", { status: 401 }));
    try {
      await expect(requestSignIn(email, from)).rejects.not.toBeInstanceOf(AuthError);
      await expect(requestSignIn(email, from)).rejects.not.toBeInstanceOf(AuthError);
    } finally {
      vi.unstubAllGlobals();
      env.emailProviders = saved.emailProviders;
      env.resendApiKey = saved.resendApiKey;
    }
    // Once a send works the one-per-minute limit applies again.
    await requestSignIn(email, from);
    await expect(requestSignIn(email, from)).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("password: signs in without an email, and failures never reveal accounts", async () => {
    const email = freshEmail();
    const sent = await requestSignIn(email, req());
    const { user } = await verifySignInCode(email, sent.devCode!, device(), null);
    // No password set yet: the same error as a wrong password or an unknown email.
    const noPassword = await signInWithPassword(email, "whatever-it-is", null).catch((e) => e);
    await setPassword(user.id, "a strong passphrase");
    const wrong = await signInWithPassword(email, "not the passphrase", null).catch((e) => e);
    const unknown = await signInWithPassword(freshEmail(), "a strong passphrase", null).catch((e) => e);
    expect(noPassword).toBeInstanceOf(AuthError);
    expect(wrong.message).toBe(noPassword.message);
    expect(unknown.message).toBe(noPassword.message);

    const ok = await signInWithPassword(email, "a strong passphrase", null);
    expect(ok.user.id).toBe(user.id);
    expect((await userForSession(ok.sessionToken))?.id).toBe(user.id);
    // The hash is salted scrypt, never the password.
    const [row] = await (await getDb())!.select().from(p0Users).where(eq(p0Users.id, user.id));
    expect(row.passwordHash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  });

  it("locks out repeated wrong passwords for an email", async () => {
    const email = freshEmail();
    const sent = await requestSignIn(email, req());
    const { user } = await verifySignInCode(email, sent.devCode!, device(), null);
    await setPassword(user.id, "a strong passphrase");
    // Successful sign-ins never count toward the lockout.
    for (let i = 0; i < 7; i++) await signInWithPassword(email, "a strong passphrase", null);
    for (let i = 0; i < 5; i++) await signInWithPassword(email, "wrong", null).catch(() => {});
    await expect(signInWithPassword(email, "a strong passphrase", null)).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("changing a password needs the current one, and signs out other devices", async () => {
    const user = await createTestUser();
    await setPassword(user.id, "the first passphrase");
    const here = await createSession(user.id, "password");
    const elsewhere = await createSession(user.id, "password");

    await expect(changePassword(user.id, here, { password: "a second passphrase" })).rejects.toMatchObject({ code: "invalid" });
    await expect(changePassword(user.id, here, { password: "a second passphrase", currentPassword: "not it" })).rejects.toMatchObject({ code: "invalid" });
    await signInWithPassword(user.email, "the first passphrase", null); // unchanged so far

    await changePassword(user.id, here, { password: "a second passphrase", currentPassword: "the first passphrase" });
    await signInWithPassword(user.email, "a second passphrase", null);
    await expect(signInWithPassword(user.email, "the first passphrase", null)).rejects.toMatchObject({ code: "invalid" });
    expect((await userForSession(here))?.id).toBe(user.id);
    expect(await userForSession(elsewhere)).toBeNull();
  });

  it("forgot password: only a fresh emailed sign-in may set a new password without the old one", async () => {
    const email = freshEmail();
    const first = await requestSignIn(email, req());
    const signup = await verifySignInCode(email, first.devCode!, device(), null);
    // A new account has no password yet, so none is asked.
    await changePassword(signup.user.id, signup.sessionToken, { password: "the first passphrase" });

    const byPassword = await signInWithPassword(email, "the first passphrase", null);
    expect(await sessionAllowsPasswordReset(byPassword.sessionToken)).toBe(false);
    await expect(changePassword(signup.user.id, byPassword.sessionToken, { password: "stolen session pw" })).rejects.toMatchObject({ code: "invalid" });

    const byCode = await createSession(signup.user.id, "code");
    expect(await sessionAllowsPasswordReset(byCode)).toBe(true);
    // The window closes: an old emailed session is no longer proof.
    expect(await sessionAllowsPasswordReset(byCode, Date.now() + PASSWORD_RESET_WINDOW_MS + 1000)).toBe(false);
    await changePassword(signup.user.id, byCode, { password: "a brand new passphrase" });
    await signInWithPassword(email, "a brand new passphrase", null);
  });

  it("locks out repeated wrong current passwords", async () => {
    const user = await createTestUser();
    await setPassword(user.id, "the first passphrase");
    const here = await createSession(user.id, "password");
    for (let i = 0; i < 5; i++) await changePassword(user.id, here, { password: "another passphrase", currentPassword: "wrong" }).catch(() => {});
    await expect(changePassword(user.id, here, { password: "another passphrase", currentPassword: "the first passphrase" })).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("logout revokes the session", async () => {
    const email = freshEmail();
    const sent = await requestSignIn(email, req());
    const { sessionToken } = await verifySignInCode(email, sent.devCode!, device(), null);
    await revokeSession(sessionToken);
    expect(await userForSession(sessionToken)).toBeNull();
  });
});
