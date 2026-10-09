// Identity (Build Plan 5, task A5): magic link plus a 6-digit code in the same
// email; no passwords; server-side sessions behind an httpOnly cookie.
import { nanoid } from "nanoid";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { getDb, requireDb } from "./db";
import { p0LoginTokens, p0Sessions, p0Users, type Phase0User } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { DISPOSABLE_EMAIL_DOMAINS, LOGIN_CODE_MAX_ATTEMPTS, LOGIN_TOKEN_TTL_MS, VALIDATION_MESSAGES } from "../shared/constants";
import { grantSignupSpark, type DeviceSignals } from "./spark";
import { emailProviders, sendEmail } from "./providers/email";
import { hitRateLimit, sweepRateLimits } from "./db-rate-limit";

export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;

export class AuthError extends Error {
  constructor(message: string, readonly code: "invalid" | "rate_limited" | "bad_email") {
    super(message);
    this.name = "AuthError";
  }
}

export function validateEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function deriveUsername(email: string): string {
  const prefix = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
  const seed = prefix || "wanderer";
  return `${seed}_${nanoid(6)}`;
}

function pepper(): string {
  if (!ENV.jwtSecret) throw new Error("JWT_SECRET is not configured (used as the token pepper).");
  return ENV.jwtSecret;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Codes have only 10^6 values, so they are keyed by a server secret and the token id. */
export function hashCode(tokenId: string, code: string): string {
  return createHmac("sha256", pepper()).update(`${tokenId}:${code}`).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

function baseUrl(): string {
  return ENV.frontendUrl || `http://localhost:${ENV.port}`;
}

function signInEmail(link: string, code: string) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return {
    subject: `${spaced} is your Arcanis sign-in code`,
    text: `Your Arcanis sign-in code: ${code}\n\nOr open this link: ${link}\n\nBoth expire in 10 minutes and work once. If you did not ask for this, ignore this email.`,
    html: `<div style="font-family:Georgia,serif;background:#0b0a08;color:#e8dcc0;padding:32px;text-align:center">
<p style="letter-spacing:4px;color:#c9a24b;margin:0 0 16px">ARCANIS</p>
<p style="margin:0 0 8px">Your sign-in code</p>
<p style="font-size:32px;letter-spacing:8px;color:#f0d78c;margin:0 0 24px"><b>${spaced}</b></p>
<p style="margin:0 0 24px"><a href="${link}" style="background:#c9a24b;color:#0b0a08;padding:12px 24px;text-decoration:none;border-radius:6px">Open Arcanis</a></p>
<p style="font-size:12px;color:#9a8f78">Both expire in 10 minutes and work once. If you did not ask for this, ignore this email.</p>
</div>`,
  };
}

export interface RequestContext {
  ip: string | null;
  deviceId: string | null;
}

/**
 * Sends a sign-in email. The response is identical whether or not the email
 * has an account, so the endpoint cannot be used to discover accounts.
 * Returns a dev link only when no email provider is configured outside production.
 */
export async function requestSignIn(email: string, req: RequestContext): Promise<{ devUrl: string | null; devCode: string | null }> {
  const normalized = normalizeEmail(email);
  if (!validateEmailFormat(normalized)) throw new AuthError(VALIDATION_MESSAGES.EMAIL_INVALID, "bad_email");
  if (isDisposableEmail(normalized)) throw new AuthError(VALIDATION_MESSAGES.EMAIL_DISPOSABLE, "bad_email");

  const limits: Array<[string, number, number]> = [
    [`signin:email:${normalized}`, 1, 60],
    [`signin:email-day:${normalized}`, 6, 86_400],
  ];
  if (req.ip) limits.push([`signin:ip:${req.ip}`, 20, 3_600]);
  if (req.deviceId) limits.push([`signin:device:${req.deviceId}`, 10, 86_400]);
  for (const [key, limit, windowSeconds] of limits) {
    const result = await hitRateLimit(key, limit, windowSeconds);
    if (!result.allowed) throw new AuthError(VALIDATION_MESSAGES.SIGNIN_RATE_LIMITED, "rate_limited");
  }
  if (Math.random() < 0.02) void sweepRateLimits().catch(() => {});

  const db = requireDb();
  const id = nanoid(36);
  const linkToken = randomBytes(32).toString("base64url");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(p0LoginTokens).values({
    id,
    email: normalized,
    linkHash: sha256(linkToken),
    codeHash: hashCode(id, code),
    expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
  });

  const link = `${baseUrl()}/auth/verify?token=${encodeURIComponent(linkToken)}`;
  if (!ENV.isProduction && emailProviders().length === 0) {
    console.log(`[Sign-in] dev mode for ${normalized}: code ${code}, link ${link}`);
    return { devUrl: link, devCode: code };
  }
  await sendEmail({ surface: "email" }, { to: normalized, ...signInEmail(link, code) });
  return { devUrl: null, devCode: null };
}

/** Marks a token consumed. Exactly one concurrent caller wins. */
async function consume(tokenId: string): Promise<boolean> {
  const [result] = await requireDb()
    .update(p0LoginTokens)
    .set({ consumedAt: new Date() })
    .where(and(eq(p0LoginTokens.id, tokenId), isNull(p0LoginTokens.consumedAt), gt(p0LoginTokens.expiresAt, new Date())));
  return (result as { affectedRows?: number }).affectedRows === 1;
}

export interface SignInResult {
  user: Phase0User;
  isNewUser: boolean;
  sessionToken: string;
}

export async function verifySignInLink(linkToken: string, device: DeviceSignals): Promise<SignInResult> {
  const db = requireDb();
  const [token] = await db.select().from(p0LoginTokens).where(eq(p0LoginTokens.linkHash, sha256(linkToken))).limit(1);
  if (!token || !(await consume(token.id))) throw new AuthError(VALIDATION_MESSAGES.TOKEN_INVALID, "invalid");
  return completeSignIn(token.email, device);
}

/**
 * Checks a 6-digit code against the newest unconsumed token for the email.
 * Five wrong attempts burn the token; attempts are counted atomically.
 */
export async function verifySignInCode(email: string, code: string, device: DeviceSignals, ip: string | null): Promise<SignInResult> {
  const normalized = normalizeEmail(email);
  if (ip) {
    const limit = await hitRateLimit(`signin-code:ip:${ip}`, 30, 3_600);
    if (!limit.allowed) throw new AuthError(VALIDATION_MESSAGES.SIGNIN_RATE_LIMITED, "rate_limited");
  }
  if (!/^\d{6}$/.test(code)) throw new AuthError(VALIDATION_MESSAGES.CODE_INVALID, "invalid");

  const db = requireDb();
  const [token] = await db
    .select()
    .from(p0LoginTokens)
    .where(and(eq(p0LoginTokens.email, normalized), isNull(p0LoginTokens.consumedAt), gt(p0LoginTokens.expiresAt, new Date())))
    .orderBy(desc(p0LoginTokens.createdAt))
    .limit(1);
  if (!token) throw new AuthError(VALIDATION_MESSAGES.CODE_INVALID, "invalid");

  // Claim an attempt before comparing, so parallel guesses cannot exceed the limit.
  const [claim] = await db
    .update(p0LoginTokens)
    .set({ attempts: sql`${p0LoginTokens.attempts} + 1` })
    .where(and(eq(p0LoginTokens.id, token.id), sql`${p0LoginTokens.attempts} < ${LOGIN_CODE_MAX_ATTEMPTS}`, isNull(p0LoginTokens.consumedAt)));
  if ((claim as { affectedRows?: number }).affectedRows !== 1) throw new AuthError(VALIDATION_MESSAGES.CODE_INVALID, "invalid");

  if (!safeEqualHex(hashCode(token.id, code), token.codeHash) || !(await consume(token.id))) {
    throw new AuthError(VALIDATION_MESSAGES.CODE_INVALID, "invalid");
  }
  return completeSignIn(normalized, device);
}

async function findAvailableUsername(email: string): Promise<string> {
  const db = requireDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = deriveUsername(email);
    const [existing] = await db.select({ id: p0Users.id }).from(p0Users).where(eq(p0Users.username, candidate)).limit(1);
    if (!existing) return candidate;
  }
  return `wanderer_${nanoid(8)}`;
}

async function completeSignIn(email: string, device: DeviceSignals): Promise<SignInResult> {
  const db = requireDb();
  let isNewUser = false;
  let [user] = await db.select().from(p0Users).where(eq(p0Users.email, email)).limit(1);
  if (!user) {
    try {
      const [created] = await db
        .insert(p0Users)
        .values({ email, username: await findAvailableUsername(email), emailVerified: true, role: "user" })
        .$returningId();
      [user] = await db.select().from(p0Users).where(eq(p0Users.id, created.id)).limit(1);
      isNewUser = true;
      await grantSignupSpark(user.id, device);
    } catch (error) {
      // Two sign-ins for the same new email raced; use the row that won.
      [user] = await db.select().from(p0Users).where(eq(p0Users.email, email)).limit(1);
      if (!user) throw error;
    }
  }
  await db.update(p0Users).set({ lastSignedInAt: new Date() }).where(eq(p0Users.id, user.id));
  return { user, isNewUser, sessionToken: await createSession(user.id) };
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await requireDb()
    .insert(p0Sessions)
    .values({ tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
  return token;
}

/** Resolves a session cookie to its user; null when missing, expired or revoked. */
export async function userForSession(token: string | null | undefined): Promise<Phase0User | null> {
  if (!token || token.length > 128) return null;
  const db = await getDb();
  if (!db) return null;
  const hash = sha256(token);
  const [row] = await db
    .select({ user: p0Users, expiresAt: p0Sessions.expiresAt, revokedAt: p0Sessions.revokedAt, lastSeenAt: p0Sessions.lastSeenAt })
    .from(p0Sessions)
    .innerJoin(p0Users, eq(p0Sessions.userId, p0Users.id))
    .where(eq(p0Sessions.tokenHash, hash))
    .limit(1);
  if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) return null;
  if (Date.now() - row.lastSeenAt.getTime() > 3600_000) {
    void db.update(p0Sessions).set({ lastSeenAt: new Date() }).where(eq(p0Sessions.tokenHash, hash)).catch(() => {});
  }
  return row.user;
}

export async function revokeSession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await requireDb().update(p0Sessions).set({ revokedAt: new Date() }).where(eq(p0Sessions.tokenHash, sha256(token)));
}
