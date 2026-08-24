import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { getDb, requireDb } from "./db";
import { p0MagicLinks, p0Users, type Phase0User } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { checkRateLimit } from "./rate-limit";
import {
  DISPOSABLE_EMAIL_DOMAINS,
  MAGIC_LINK_TTL_MS,
  VALIDATION_MESSAGES,
} from "../shared/constants";
import { grantSignupSparks } from "./spark";
import jwt from "jsonwebtoken";

const JWT_EXPIRY = "7d";

export function validateEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

export function deriveUsername(email: string): string {
  const prefix = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
  const seed = prefix || "wanderer";
  return `${seed}_${nanoid(6)}`;
}

export async function requestMagicLink(
  email: string,
  ip: string | undefined
): Promise<{ devUrl: string | null }> {
  const normalized = email.trim().toLowerCase();

  if (!validateEmailFormat(normalized)) {
    throw new Error(VALIDATION_MESSAGES.EMAIL_INVALID);
  }
  if (isDisposableEmail(normalized)) {
    throw new Error(VALIDATION_MESSAGES.EMAIL_DISPOSABLE);
  }

  const emailLimit = checkRateLimit(`p0:ml:email:${normalized}`, 1, 60);
  if (!emailLimit.allowed) {
    throw new Error(VALIDATION_MESSAGES.EMAIL_RATE_LIMITED);
  }

  if (ip) {
    const ipLimit = checkRateLimit(`p0:ml:ip:${ip}`, 3, 86400);
    if (!ipLimit.allowed) {
      throw new Error(VALIDATION_MESSAGES.SIGNUP_IP_LIMITED);
    }
  }

  const db = await getDb();
  if (!db) throw new Error(VALIDATION_MESSAGES.GENERATION_FAILED);

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await db.insert(p0MagicLinks).values({
    id: nanoid(36),
    token,
    email: normalized,
    used: false,
    expiresAt,
  });

  const devUrl = `${getBaseUrl()}/auth/verify?token=${encodeURIComponent(token)}`;

  if (ENV.isProduction || process.env.RESEND_API_KEY) {
    await sendMagicLinkEmail(normalized, devUrl);
    return { devUrl: null };
  }

  console.log(`[Magic Link] dev mode link for ${normalized}: ${devUrl}`);
  return { devUrl };
}

async function sendMagicLinkEmail(email: string, link: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Arcanis <no-reply@arcanis.app>",
        to: [email],
        subject: "Your Arcanis sign-in link",
        html: `<p>Create your first spell:</p><p><a href="${link}">Sign in to Arcanis</a></p><p>This link expires in 15 minutes.</p>`,
      }),
    });
  } catch (error) {
    console.error("[Magic Link] Email send failed:", error);
    if (ENV.isProduction) throw error;
  }
}

export async function verifyMagicLink(
  token: string
): Promise<{ token: string; user: Phase0User; isNewUser: boolean }> {
  const db = requireDb();

  const [link] = await db
    .select()
    .from(p0MagicLinks)
    .where(and(eq(p0MagicLinks.token, token), eq(p0MagicLinks.used, false)))
    .limit(1);

  if (!link) {
    throw new Error(VALIDATION_MESSAGES.TOKEN_INVALID);
  }

  if (link.expiresAt.getTime() < Date.now()) {
    await db.delete(p0MagicLinks).where(eq(p0MagicLinks.id, link.id));
    throw new Error(VALIDATION_MESSAGES.TOKEN_INVALID);
  }

  await db.update(p0MagicLinks).set({ used: true }).where(eq(p0MagicLinks.id, link.id));

  const [existing] = await db
    .select()
    .from(p0Users)
    .where(eq(p0Users.email, link.email))
    .limit(1);

  let user: Phase0User;
  let isNewUser = false;

  if (existing) {
    user = existing;
  } else {
    const username = await findAvailableUsername(link.email);
    const [created] = await db
      .insert(p0Users)
      .values({
        email: link.email,
        username,
        emailVerified: true,
        role: "user",
      })
      .$returningId();
    const [row] = await db.select().from(p0Users).where(eq(p0Users.id, created.id)).limit(1);
    if (!row) throw new Error(VALIDATION_MESSAGES.TOKEN_INVALID);
    user = row;
    isNewUser = true;
    await grantSignupSparks(user.id);
  }

  await db
    .update(p0Users)
    .set({ lastSignedInAt: new Date() })
    .where(eq(p0Users.id, user.id));

  const sessionToken = issueJwt(user);

  return { token: sessionToken, user, isNewUser };
}

async function findAvailableUsername(email: string): Promise<string> {
  const db = requireDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? deriveUsername(email) : `${deriveUsername(email)}${attempt}`;
    const [existing] = await db
      .select({ id: p0Users.id })
      .from(p0Users)
      .where(eq(p0Users.username, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return `wanderer_${nanoid(8)}`;
}

export function issueJwt(user: Phase0User): string {
  if (!ENV.jwtSecret) {
    throw new Error("JWT_SECRET is not configured. Cannot issue token.");
  }
  return jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    ENV.jwtSecret,
    { expiresIn: JWT_EXPIRY }
  );
}

export async function verifyTokenAndGetUser(token: string): Promise<Phase0User> {
  if (!ENV.jwtSecret) {
    throw new Error("JWT_SECRET not configured");
  }
  const payload = jwt.verify(token, ENV.jwtSecret) as { userId: number };
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [user] = await db.select().from(p0Users).where(eq(p0Users.id, payload.userId)).limit(1);
  if (!user) throw new Error("User not found");
  return user;
}

function getBaseUrl(): string {
  return ENV.frontendUrl || `http://localhost:${ENV.port}`;
}