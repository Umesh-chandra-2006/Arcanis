import { describe, expect, it } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { deviceCookieMiddleware, parseCookies } from "./_core/cookies";

const OLD_ID = "o".repeat(32);
const NEW_ID = "n".repeat(32);
const SIGN_IN = "/api/trpc/auth.requestSignIn";
const BROWSE = "/api/trpc/auth.me,spells.codex";

function run(path: string, cookie = "") {
  const set: string[] = [];
  const req = { path, headers: { cookie } } as unknown as Request;
  const res = {
    getHeader: () => (set.length ? [...set] : undefined),
    setHeader: (_name: string, value: string[]) => {
      set.length = 0;
      set.push(...value);
    },
  } as unknown as Response;
  let called = false;
  deviceCookieMiddleware(req, res, (() => (called = true)) as NextFunction);
  expect(called).toBe(true);
  const find = (name: string) => set.find((c) => c.startsWith(`${name}=`));
  return { seen: parseCookies(req.headers.cookie), find };
}
const expired = (header: string | undefined) => header?.includes("Max-Age=0") === true;
const lasts12Months = (header: string | undefined) => header?.includes(`Max-Age=${365 * 24 * 3600}`) === true;

describe("device cookie", () => {
  it("sets nothing for a visitor who is only browsing", () => {
    const { seen, find } = run(BROWSE);
    expect(find("arc_device")).toBeUndefined();
    expect(seen.arc_device).toBeUndefined();
  });

  it("sets it for 12 months on each sign-in call, for this request too", () => {
    for (const path of [SIGN_IN, "/api/trpc/auth.verifyCode", "/api/trpc/auth.verifyLink"]) {
      const { seen, find } = run(path);
      expect(lasts12Months(find("arc_device"))).toBe(true);
      expect(seen.arc_device).toHaveLength(32);
    }
  });

  it("re-sets an existing id on sign-in, keeping its value", () => {
    const { seen, find } = run(SIGN_IN, `arc_device=${NEW_ID}`);
    expect(find("arc_device")).toContain(NEW_ID);
    expect(lasts12Months(find("arc_device"))).toBe(true);
    expect(seen.arc_device).toBe(NEW_ID);
  });

  it("keeps the id while signed out, so signing out cannot reset the once-per-device check", () => {
    const { seen, find } = run(BROWSE, `arc_device=${NEW_ID}`);
    expect(find("arc_device")).toBeUndefined();
    expect(seen.arc_device).toBe(NEW_ID);
  });
});

describe("cookies from before this rule", () => {
  it("expires arc_ref on every request that carries it", () => {
    for (const path of [BROWSE, SIGN_IN]) {
      const { seen, find } = run(path, "arc_ref=ABCD2345");
      expect(expired(find("arc_ref"))).toBe(true);
      expect(seen.arc_ref).toBeUndefined();
    }
  });

  it("expires the old arc_did when only browsing, with nothing kept", () => {
    const { seen, find } = run(BROWSE, `arc_did=${OLD_ID}`);
    expect(expired(find("arc_did"))).toBe(true);
    expect(seen.arc_did).toBeUndefined();
    expect(find("arc_device")).toBeUndefined();
    expect(seen.arc_device).toBeUndefined();
  });

  it("carries the old id into the new cookie on sign-in, so its free Spark record still counts", () => {
    const { seen, find } = run(SIGN_IN, `arc_did=${OLD_ID}`);
    expect(expired(find("arc_did"))).toBe(true);
    expect(find("arc_device")).toContain(OLD_ID);
    expect(seen.arc_device).toBe(OLD_ID);
    expect(seen.arc_did).toBeUndefined();
  });

  it("carries the old id for someone who stays signed in", () => {
    const { seen, find } = run(BROWSE, `arc_session=abc; arc_did=${OLD_ID}`);
    expect(expired(find("arc_did"))).toBe(true);
    expect(find("arc_device")).toContain(OLD_ID);
    expect(seen.arc_device).toBe(OLD_ID);
    expect(seen.arc_session).toBe("abc");
  });

  it("prefers the new id when both are present", () => {
    const { seen, find } = run(SIGN_IN, `arc_did=${OLD_ID}; arc_device=${NEW_ID}`);
    expect(expired(find("arc_did"))).toBe(true);
    expect(seen.arc_device).toBe(NEW_ID);
  });
});
