import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyTokenAndGetUser } from "../auth-service";
import type { Phase0User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: Phase0User | null;
  sessionId: string | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
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

  const cookieHeader = opts.req.headers.cookie ?? "";
  const sessionMatch = cookieHeader.match(/p0_session=([^;]+)/);
  const sessionId = sessionMatch ? decodeURIComponent(sessionMatch[1]) : null;

  return { req: opts.req, res: opts.res, user, sessionId };
}
