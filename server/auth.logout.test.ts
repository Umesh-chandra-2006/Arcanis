import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    username: "sampleuser",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "custom",
    role: "user",
    avatar: "ashen",
    hp: 100,
    mp: 100,
    willCap: 250,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
      app: {
        get: (key: string) => {
          if (key === "io") return null;
          return null;
        }
      }
    } as any,
    res: {} as any,
    io: null,
  };

  return { ctx };
}

describe("auth.logout", () => {
  it("reports success", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
  });
});
