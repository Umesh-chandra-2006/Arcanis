import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { registerUser, loginUser, verifyTokenAndGetUser } from "../auth-service";
import { TRPCError } from "@trpc/server";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(64),
  password: z.string().min(8, "Password must be at least 8 characters"),
  avatar: z.enum([
    "ashen",
    "emberveil",
    "tidecaller",
    "galeborn",
    "stonewarden",
    "voidwalker",
    "dawnbringer",
    "chaosborn",
  ]),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const authRouter = router({
  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    try {
      const result = await registerUser(input.email, input.username, input.password, input.avatar);
      return {
        token: result.token,
        user: { ...result.user, role: "user" as const },
      };
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Registration failed",
      });
    }
  }),

  login: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
    try {
      const result = await loginUser(input.email, input.password);
      return {
        token: result.token,
        user: { ...result.user, role: "user" as const },
      };
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    // Get token from cookie or header
    const token = ctx.req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return null;
    }

    const user = await verifyTokenAndGetUser(token);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      hp: user.hp,
      mp: user.mp,
      willCap: user.willCap,
      role: user.role,
    };
  }),

  logout: publicProcedure.mutation(() => {
    // Token is handled client-side, just return success
    return { success: true };
  }),
});
