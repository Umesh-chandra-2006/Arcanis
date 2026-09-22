import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit } from "./rate-limit";
import {
  validateEmailFormat,
  isDisposableEmail,
  deriveUsername,
  hashPassword,
  verifyPassword,
} from "./auth-service";

describe("rate-limit", () => {
  beforeEach(() => {
    // bucket map is module-internal; rely on unique keys per test
  });

  it("allows requests under the limit", () => {
    const first = checkRateLimit("test:rate:1", 3, 60);
    expect(first.allowed).toBe(true);
    expect(checkRateLimit("test:rate:1", 3, 60).allowed).toBe(true);
    expect(checkRateLimit("test:rate:1", 3, 60).allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 2; i++) {
      checkRateLimit("test:rate:2", 2, 60);
    }
    const blocked = checkRateLimit("test:rate:2", 2, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets after the window elapses", async () => {
    checkRateLimit("test:rate:3", 1, 1);
    await new Promise((r) => setTimeout(r, 1100));
    expect(checkRateLimit("test:rate:3", 1, 1).allowed).toBe(true);
  });
});

describe("auth-service validators", () => {
  it("validates email formats", () => {
    expect(validateEmailFormat("mage@arcanis.app")).toBe(true);
    expect(validateEmailFormat("not-an-email")).toBe(false);
    expect(validateEmailFormat("")).toBe(false);
    expect(validateEmailFormat("a@b")).toBe(false);
  });

  it("blocks disposable email domains", () => {
    expect(isDisposableEmail("tester@mailinator.com")).toBe(true);
    expect(isDisposableEmail("tester@10minutemail.com")).toBe(true);
    expect(isDisposableEmail("mage@gmail.com")).toBe(false);
  });

  it("derives a unique username from email", () => {
    const name = deriveUsername("ember.mage@arcanis.app");
    expect(name.startsWith("embermage_")).toBe(true);
    expect(name.length).toBeGreaterThan(9);
  });
});

describe("password hashing", () => {
  it("round-trips a password", () => {
    const stored = hashPassword("dragon-fire-42");
    expect(stored).toContain(":");
    expect(verifyPassword("dragon-fire-42", stored)).toBe(true);
  });

  it("rejects the wrong password", () => {
    const stored = hashPassword("dragon-fire-42");
    expect(verifyPassword("dragon-fire-43", stored)).toBe(false);
  });

  it("rejects malformed stored values", () => {
    expect(verifyPassword("anything", "not-a-valid-store")).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });
});