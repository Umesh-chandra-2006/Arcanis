// Decides which database the test run may use. Tests must never touch the
// production DATABASE_URL (Build Plan 16).

export type TestDbDecision =
  | { ok: true; url: string }
  | { ok: false; reason: string };

function dbName(url: string): string | null {
  try {
    return new URL(url).pathname.replace(/^\//, "") || null;
  } catch {
    return null;
  }
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function resolveTestDatabaseUrl(env: {
  DATABASE_URL?: string;
  TEST_DATABASE_URL?: string;
}): TestDbDecision {
  const test = env.TEST_DATABASE_URL?.trim();
  const prod = env.DATABASE_URL?.trim();
  if (!test) return { ok: false, reason: "TEST_DATABASE_URL is not set" };
  const testDb = dbName(test);
  if (!testDb) return { ok: false, reason: "TEST_DATABASE_URL has no database name" };
  if (prod) {
    if (test === prod) return { ok: false, reason: "TEST_DATABASE_URL equals DATABASE_URL" };
    if (hostOf(test) === hostOf(prod) && dbName(prod) === testDb) {
      return { ok: false, reason: "TEST_DATABASE_URL points at the production database" };
    }
  }
  if (!/test/i.test(testDb)) {
    return { ok: false, reason: `test database name "${testDb}" must contain "test"` };
  }
  return { ok: true, url: test };
}
