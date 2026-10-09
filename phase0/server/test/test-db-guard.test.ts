import { describe, it, expect } from "vitest";
import { resolveTestDatabaseUrl } from "./test-db-guard";

const PROD = "mysql://u:p@db.example.com:4000/prod_db";

describe("resolveTestDatabaseUrl", () => {
  it("refuses when unset", () => {
    expect(resolveTestDatabaseUrl({ DATABASE_URL: PROD }).ok).toBe(false);
  });

  it("refuses the production URL", () => {
    expect(resolveTestDatabaseUrl({ DATABASE_URL: PROD, TEST_DATABASE_URL: PROD }).ok).toBe(false);
  });

  it("refuses the production database under different credentials", () => {
    const r = resolveTestDatabaseUrl({
      DATABASE_URL: PROD,
      TEST_DATABASE_URL: "mysql://other:x@db.example.com:4000/prod_db",
    });
    expect(r.ok).toBe(false);
  });

  it("refuses a database name without 'test'", () => {
    const r = resolveTestDatabaseUrl({
      DATABASE_URL: PROD,
      TEST_DATABASE_URL: "mysql://u:p@db.example.com:4000/staging",
    });
    expect(r.ok).toBe(false);
  });

  it("accepts a separate test database", () => {
    const r = resolveTestDatabaseUrl({
      DATABASE_URL: PROD,
      TEST_DATABASE_URL: "mysql://u:p@db.example.com:4000/arcanis_test",
    });
    expect(r).toEqual({ ok: true, url: "mysql://u:p@db.example.com:4000/arcanis_test" });
  });
});
