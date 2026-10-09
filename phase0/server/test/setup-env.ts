// Runs before every test file. Loads the repo .env, then replaces DATABASE_URL
// with the test database so no module can reach production data.
import dotenv from "dotenv";
import path from "node:path";
import { resolveTestDatabaseUrl } from "./test-db-guard";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../../.env"), quiet: true });

const decision = resolveTestDatabaseUrl(process.env);
// An empty string (not delete) so env.ts's dotenv call cannot restore the real URL.
process.env.DATABASE_URL = decision.ok ? decision.url : "";
process.env.ARCANIS_TEST_DB = decision.ok ? "1" : "";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ||= "test-secret";

if (!decision.ok && process.env.REQUIRE_TEST_DB === "1") {
  throw new Error(`Test database required: ${decision.reason}`);
}
