import { describe, it, expect } from "vitest";
import { applyPolicy, escalateRealWorldTargets } from "./moderation";

const pass = { verdict: "pass" as const, reason: null, scores: {} };

describe("moderation policy", () => {
  it("never blocks plain fantasy violence", () => {
    expect(applyPolicy("spell_input", { violence: 0.99 }).verdict).toBe("pass");
  });

  it("graphic gore is borderline, then a reject at high scores", () => {
    expect(applyPolicy("spell_text", { "violence/graphic": 0.8 }).verdict).toBe("borderline");
    expect(applyPolicy("spell_text", { "violence/graphic": 0.97 }).verdict).toBe("reject");
  });

  it("is stricter on sexual content in images", () => {
    expect(applyPolicy("spell_text", { sexual: 0.25 }).verdict).toBe("pass");
    expect(applyPolicy("spell_image", { sexual: 0.25 }).verdict).toBe("borderline");
  });

  it("escalates player text that targets real-world groups or people (corpus finding)", () => {
    expect(escalateRealWorldTargets("spell_input", "A curse that targets people of a specific religion.", pass).verdict).toBe("borderline");
    expect(escalateRealWorldTargets("spell_input", "A bolt that strikes the president dead.", pass).verdict).toBe("borderline");
    expect(escalateRealWorldTargets("review", "this spell is like my teacher, awful", pass).verdict).toBe("borderline");
  });

  it("does not escalate ordinary spells or generated text", () => {
    for (const t of ["A lance of white-hot flame that strikes the enemy.", "A wall of packed soil that absorbs incoming hits.", "A shadow hand that drains the opponent's mana."]) {
      expect(escalateRealWorldTargets("spell_input", t, pass).verdict).toBe("pass");
    }
    expect(escalateRealWorldTargets("spell_text", "religion", pass).verdict).toBe("pass");
  });
});
