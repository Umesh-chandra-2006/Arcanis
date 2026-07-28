import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifyTokenAndGetUser } from "../auth-service";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  io: any;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authHeader = opts.req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      user = await verifyTokenAndGetUser(token);
    }
  } catch (error) {
    console.warn("[Context] Authentication failed:", error);
    user = null;
  }

  const io = opts.req.app.get("io");

  return {
    req: opts.req,
    res: opts.res,
    user,
    io,
  };
}
