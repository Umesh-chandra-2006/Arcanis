import type { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { ENV } from "./env";

export const DEVICE_COOKIE = "arc_device";
export const LEGACY_DEVICE_COOKIE = "arc_did";
export const LEGACY_REFERRAL_COOKIE = "arc_ref";
export const SESSION_COOKIE = "arc_session";
const TWELVE_MONTHS_S = 365 * 24 * 3600;
// The calls that need a device id: the per-device sign-in limit and the once-per-device free Spark.
const NEEDS_DEVICE_ID = /^\/api\/trpc\/.*auth\.(requestSignIn|verifyCode|verifyLink)/;

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    try {
      out[name] = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      out[name] = part.slice(eq + 1).trim();
    }
  }
  return out;
}

export function serializeCookie(
  name: string,
  value: string,
  options: { maxAgeSeconds?: number; httpOnly?: boolean } = {}
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax"];
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (ENV.isProduction) parts.push("Secure");
  if (options.maxAgeSeconds !== undefined) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  return parts.join("; ");
}

export function appendSetCookie(res: Response, cookie: string): void {
  const existing = res.getHeader("Set-Cookie");
  const list = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : [];
  res.setHeader("Set-Cookie", [...list, cookie]);
}

const validDeviceId = (id: string | undefined) => (id && /^[A-Za-z0-9_-]{16,64}$/.test(id) ? id : null);

/** Takes cookies out of this request, so its handlers never see them. */
function dropFromRequest(req: Request, names: string[]): void {
  const parts = (req.headers.cookie ?? "").split(";").map((part) => part.trim());
  req.headers.cookie = parts.filter((part) => part && !names.includes(part.split("=")[0])).join("; ");
}

/**
 * The device id, anti-abuse only (privacy policy): the once-per-device signup
 * grant and rate limits. It is never written to analytics.
 *
 * It is set when someone starts to sign in, never for a visitor who is only
 * browsing, and each sign-in renews its 12 months. It stays when they sign out:
 * clearing it then would let anyone reset the once-per-device check by signing
 * out and reloading.
 *
 * Browsers from before this rule hold the old `arc_did` (two years, set on any
 * visit) and `arc_ref`. Both are expired on sight. A sign-in, or a live session,
 * carries the old id into the new cookie, so its free Spark record still counts.
 */
export function deviceCookieMiddleware(req: Request, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  const legacyId = validDeviceId(cookies[LEGACY_DEVICE_COOKIE]);
  const currentId = validDeviceId(cookies[DEVICE_COOKIE]);
  const signingIn = NEEDS_DEVICE_ID.test(req.path);
  const carryLegacy = !currentId && legacyId !== null && (signingIn || Boolean(cookies[SESSION_COOKIE]));

  const legacy = [LEGACY_DEVICE_COOKIE, LEGACY_REFERRAL_COOKIE].filter((name) => name in cookies);
  for (const name of legacy) appendSetCookie(res, serializeCookie(name, "", { maxAgeSeconds: 0 }));
  if (legacy.length) dropFromRequest(req, legacy);

  if (signingIn || carryLegacy) {
    const deviceId = currentId ?? legacyId ?? nanoid(32);
    appendSetCookie(res, serializeCookie(DEVICE_COOKIE, deviceId, { maxAgeSeconds: TWELVE_MONTHS_S }));
    // Visible to this request's handlers too.
    if (!currentId) dropFromRequest(req, [DEVICE_COOKIE]);
    if (!currentId) req.headers.cookie = `${req.headers.cookie ? `${req.headers.cookie}; ` : ""}${DEVICE_COOKIE}=${deviceId}`;
  }
  next();
}
