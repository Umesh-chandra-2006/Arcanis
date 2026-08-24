import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import type { Server as SocketIOServer } from "socket.io";
import { verifyTokenAndGetUser } from "../auth-service";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  io: SocketIOServer | null;
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

  const io: SocketIOServer | null = opts.req.app.get("io") ?? null;

  return {
    req: opts.req,
    res: opts.res,
    user,
    io,
  };
}
