import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyTokenAndGetUser } from "../auth-service";
import type { Phase0User } from "../../drizzle/schema";
import type { DeviceSignals } from "../spark";
import { DEVICE_COOKIE, parseCookies } from "./cookies";

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
  let user: Phase0User | null = null;

  const authHeader = opts.req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      user = await verifyTokenAndGetUser(token);
    } catch (error) {
      console.warn("[Context] Authentication failed:", error);
      user = null;
    }
  }

  const cookies = parseCookies(opts.req.headers.cookie);
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
