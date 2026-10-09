import { beforeAll, describe } from "vitest";
import { getDb } from "../db";

export const hasTestDb = process.env.ARCANIS_TEST_DB === "1";

/**
 * describe() that runs only when a guarded test database is configured, and
 * initializes the pool first (the app does that at startup).
 */
export function describeDb(name: string, fn: () => void): void {
  describe.skipIf(!hasTestDb)(name, () => {
    beforeAll(async () => {
      await getDb();
    });
    fn();
  });
}
