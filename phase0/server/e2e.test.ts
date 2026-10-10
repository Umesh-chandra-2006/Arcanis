// End-to-end over real HTTP (task A15, Build Plan 16): the whole Phase 1a loop
// through the Express app, tRPC, cookies and the database, with deterministic
// test providers. Sign up by code, create, name, share, a stranger previews.
import { it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { startApp } from "./_core/app";
import { describeDb } from "./test/db";
import { SPARK } from "../shared/constants";

let server: Server;
let base = "";

class Client {
  jar = new Map<string, string>();
  constructor(readonly userAgent = "Mozilla/5.0 (Windows NT 10.0) Chrome/129.0") {}
  private cookie() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  private keep(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const [k, v] = [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)];
      if (/Max-Age=0/i.test(c)) this.jar.delete(k);
      else this.jar.set(k, v);
    }
  }
  async raw(path: string, init: RequestInit = {}) {
    const res = await fetch(`${base}${path}`, { redirect: "manual", ...init, headers: { cookie: this.cookie(), "user-agent": this.userAgent, ...(init.headers ?? {}) } });
    this.keep(res);
    return res;
  }
  async mutation<T = any>(proc: string, input: unknown): Promise<T> {
    const res = await this.raw(`/api/trpc/${proc}?batch=1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ 0: { json: input } }) });
    const body = (await res.json()) as Array<{ result?: { data: { json: T } }; error?: { json: { message: string } } }>;
    if (body[0].error) throw new Error(`${proc}: ${body[0].error.json.message}`);
    return body[0].result!.data.json;
  }
  async query<T = any>(proc: string, input: unknown = null): Promise<T> {
    const res = await this.raw(`/api/trpc/${proc}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input } }))}`);
    const body = (await res.json()) as Array<{ result?: { data: { json: T } }; error?: { json: { message: string } } }>;
    if (body[0].error) throw new Error(`${proc}: ${body[0].error.json.message}`);
    return body[0].result!.data.json;
  }
}

beforeAll(async () => {
  server = await startApp(express());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

describeDb("end to end: sign up, create, share, preview", () => {
  it("runs the whole Phase 1a loop", async () => {
    const player = new Client();
    expect((await player.raw("/health")).status).toBe(200);
    expect(player.jar.has("arc_did")).toBe(false); // the uptime pinger never mints device ids
    expect(await player.query("auth.me")).toBeNull();
    expect(player.jar.has("arc_did")).toBe(true);

    // Sign up by 6-digit code (no password, session in an httpOnly cookie).
    const email = `e2e_${Date.now()}@test.arcanis`;
    const sent = await player.mutation("auth.requestSignIn", { email });
    expect(sent.devCode).toMatch(/^\d{6}$/);
    const signedIn = await player.mutation("auth.verifyCode", { email, code: sent.devCode });
    expect(signedIn.isNewUser).toBe(true);
    expect(player.jar.has("arc_session")).toBe(true);
    expect((await player.query("auth.me")).nameChosen).toBe(false);
    expect((await player.query("spells.sparkBalance")).balance).toBe(SPARK.signupGrant);

    // Create a spell through the real pipeline (test providers).
    const created = await player.mutation("spells.create", {
      name: "Seam of Light",
      element: "Arcane",
      category: "Drain",
      castType: "Instant",
      description: "a seam of light that steals a little strength",
    });
    expect(created.success).toBe(true);
    expect(JSON.stringify(created)).not.toMatch(/will_?cost/i);
    expect(created.spell.researching).toBe(false);
    expect(created.spell.drainRatio).toBeGreaterThan(0);
    expect((await player.query("spells.sparkBalance")).balance).toBe(SPARK.signupGrant - 1);
    expect((await player.query("spells.mySpells")).map((s: { id: string }) => s.id)).toContain(created.spell.id);

    // Name the mage, get the referral code for the share link.
    const named = await player.mutation("profile.setName", { name: `E2E Mage ${Date.now() % 100000}` });
    expect(named.nameChosen).toBe(true);
    const { code } = await player.query("referrals.myCode");
    expect(code).toMatch(/^[A-Z2-9]{8}$/);

    // A preview crawler gets OG tags and a 1200x630 JPEG.
    const bot = new Client("Mozilla/5.0 (compatible; Discordbot/2.0)");
    const og = await bot.raw(`/spell/${created.spell.id}?ref=${code}`);
    const html = await og.text();
    expect(og.status).toBe(200);
    expect(html).toContain('og:title" content="Seam of Light | Arcanis"');
    expect(html).toContain('og:image:width" content="1200"');
    const image = await bot.raw(`/spell/${created.spell.id}/image`);
    expect(image.headers.get("content-type")).toBe("image/jpeg");

    // A stranger opens the link: referral captured, preview recorded, CTA tracked.
    const stranger = new Client();
    await stranger.query("auth.me");
    expect((await stranger.mutation("referrals.capture", { code })).captured).toBe(true);
    expect(stranger.jar.get("arc_ref")).toBe(code);
    expect((await stranger.mutation("spells.recordShareOpen", { spellId: created.spell.id })).success).toBe(true);
    expect((await stranger.query("spells.getSpellPublic", { spellId: created.spell.id })).name).toBe("Seam of Light");
    expect((await stranger.mutation("analytics.track", { eventType: "preview_cta_clicked", metadata: { spellId: created.spell.id } })).success).toBe(true);

    // The stranger signs up from that browser and is attributed to the sharer.
    const email2 = `e2e2_${Date.now()}@test.arcanis`;
    const sent2 = await stranger.mutation("auth.requestSignIn", { email: email2 });
    await stranger.mutation("auth.verifyCode", { email: email2, code: sent2.devCode });
    expect(stranger.jar.has("arc_ref")).toBe(false); // consumed at signup

    // The one-step welcome: opt in to updates and set a password.
    const welcomed = await player.mutation("profile.completeOnboarding", { updatesOptIn: true, password: "correct horse battery" });
    expect(welcomed).toMatchObject({ onboarded: true, updatesOptIn: true, hasPassword: true });
    const overview = await player.query("profile.overview");
    expect(overview.spellsForged).toBe(1);
    expect(overview.invitesJoined).toBe(1);
    expect((await player.query("spells.baseSpells")).length).toBeGreaterThanOrEqual(0);

    // Logout revokes the session; the password signs back in with no email.
    await player.mutation("auth.logout", null);
    expect(await player.query("auth.me")).toBeNull();
    const back = await player.mutation("auth.signInWithPassword", { email, password: "correct horse battery" });
    expect(back.isNewUser).toBe(false);
    expect((await player.query("auth.me")).email).toBe(email);
    await player.mutation("auth.logout", null);
    await expect(player.query("spells.mySpells")).rejects.toThrow();
  });
});
