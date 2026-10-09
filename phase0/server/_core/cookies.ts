import type { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { ENV } from "./env";

export const DEVICE_COOKIE = "arc_did";
const TWO_YEARS_S = 2 * 365 * 24 * 3600;

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

/**
 * Issues a long-lived anonymous device id on first contact. Used for the
 * once-per-device signup grant and as the anonymous analytics id.
 */
export function deviceCookieMiddleware(req: Request, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  let deviceId = cookies[DEVICE_COOKIE];
  if (!deviceId || !/^[A-Za-z0-9_-]{16,64}$/.test(deviceId)) {
    deviceId = nanoid(32);
    appendSetCookie(res, serializeCookie(DEVICE_COOKIE, deviceId, { maxAgeSeconds: TWO_YEARS_S }));
    // Visible to this request's handlers too.
    req.headers.cookie = `${req.headers.cookie ? `${req.headers.cookie}; ` : ""}${DEVICE_COOKIE}=${deviceId}`;
    (req as Request & { newDevice?: boolean }).newDevice = true;
  }
  next();
}
