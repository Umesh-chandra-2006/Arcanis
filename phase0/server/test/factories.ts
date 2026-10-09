import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { p0Users, type Phase0User } from "../../drizzle/schema";

/** Inserts a throwaway user into the test database. */
export async function createTestUser(overrides: Partial<{ createdAt: Date; email: string }> = {}): Promise<Phase0User> {
  const db = (await getDb())!;
  const tag = nanoid(10).toLowerCase().replace(/[^a-z0-9]/g, "x");
  const [created] = await db
    .insert(p0Users)
    .values({
      email: overrides.email ?? `t_${tag}@test.arcanis`,
      username: `t_${tag}`,
      role: "user",
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    })
    .$returningId();
  const [user] = await db.select().from(p0Users).where(eq(p0Users.id, created.id));
  return user;
}
