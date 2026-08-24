import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "./db";
import { users, authSessions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

import { AVATAR_STATS } from "../shared/constants";

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "test") {
    console.warn("[Auth] JWT_SECRET not set — using insecure test fallback");
  } else {
    throw new Error("FATAL: JWT_SECRET environment variable is missing. Refusing to start with insecure default.");
  }
}
const JWT_SECRET: string = process.env.JWT_SECRET || "test-secret-only-for-unit-tests";
const JWT_EXPIRY = "7d";
const SALT_ROUNDS = 10;

export interface AuthPayload {
  userId: number;
  email: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    username: string;
    avatar: string;
    hp: number;
    mp: number;
    willCap: number;
  };
}

/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with its hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  username: string,
  password: string,
  avatar: string
): Promise<AuthResponse> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("Email already registered");
  }

  const existingUsername = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUsername.length > 0) {
    throw new Error("Username already taken");
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  const avatarStats = AVATAR_STATS[avatar as keyof typeof AVATAR_STATS] || { hp: 100, mp: 100, willCap: 100 };

  // Create user
  const result = await db.insert(users).values({
    email,
    username,
    avatar: avatar as any,
    passwordHash,
    emailVerified: true, // Auto-verify for now
    name: username,
    hp: avatarStats.hp,
    mp: avatarStats.mp,
    willCap: avatarStats.willCap,
    role: "user",
  });

  // Get the created user
  const userId = (result as any).insertId;
  const newUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!newUser.length) throw new Error("Failed to create user");

  const user = newUser[0];
  const token = generateToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      hp: user.hp,
      mp: user.mp,
      willCap: user.willCap,
    },
  };
}

/**
 * Login user with email and password
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find user by email
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!result.length) {
    throw new Error("Invalid email or password");
  }

  const user = result[0];

  // Check password
  if (!user.passwordHash) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // Update last signed in
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      hp: user.hp,
      mp: user.mp,
      willCap: user.willCap,
    },
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Verify token and get user
 */
export async function verifyTokenAndGetUser(token: string) {
  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await getUserById(payload.userId);
  return user;
}
