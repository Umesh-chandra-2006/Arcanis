import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { userForSession } from "../auth-service";
import type { Phase0User } from "../../drizzle/schema";
import type { DeviceSignals } from "../spark";
import { DEVICE_COOKIE, SESSION_COOKIE, parseCookies } from "./cookies";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: Phase0User | null;
  /** Anonymous id for analytics: the device cookie. */
  sessionId: string | null;
  ip: string | null;
  device: DeviceSignals;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const cookies = parseCookies(opts.req.headers.cookie);
  let user: Phase0User | null = null;
  try {
    user = await userForSession(cookies[SESSION_COOKIE]);
  } catch (error) {
    console.warn("[Context] session lookup failed:", error);
  }

  const deviceId = cookies[DEVICE_COOKIE] ?? null;
  // Express resolves req.ip through TRUST_PROXY_HOPS (set in app.ts).
  const ip = opts.req.ip ?? opts.req.socket.remoteAddress ?? null;
  const fpHeader = opts.req.headers["x-arc-fp"];
  const fingerprint = typeof fpHeader === "string" && /^[a-f0-9]{16,64}$/.test(fpHeader) ? fpHeader : null;

  return {
    req: opts.req,
    res: opts.res,
    user,
    sessionId: deviceId,
    ip,
    device: { deviceId, fingerprint, ip },
  };
}
