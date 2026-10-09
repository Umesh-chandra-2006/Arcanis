import { it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { describeDb } from "./db";

describeDb("test database", () => {
  it("connects to the test database, never production", async () => {
    const db = await getDb();
    expect(db).not.toBeNull();
    const [rows] = (await db!.execute(sql`SELECT DATABASE() AS name`)) as unknown as [
      Array<{ name: string }>,
    ];
    expect(rows[0].name).toMatch(/test/i);
  });
});
