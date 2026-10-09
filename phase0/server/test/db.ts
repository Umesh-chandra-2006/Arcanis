import { describe } from "vitest";

export const hasTestDb = process.env.ARCANIS_TEST_DB === "1";

/** describe() that runs only when a guarded test database is configured. */
export const describeDb = describe.skipIf(!hasTestDb);
