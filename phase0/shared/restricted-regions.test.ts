import { describe, expect, it } from "vitest";
import { isRestrictedTimeZone } from "./restricted-regions";

describe("isRestrictedTimeZone", () => {
  it("turns away the EU, the rest of the EEA, Switzerland and the UK", () => {
    for (const zone of ["Europe/Berlin", "Europe/Paris", "Europe/Dublin", "Europe/Madrid", "Atlantic/Canary", "Asia/Nicosia", "Atlantic/Reykjavik", "Europe/Oslo", "Europe/Vaduz", "Europe/Zurich", "Europe/London", "Europe/Jersey"]) {
      expect(isRestrictedTimeZone(zone), zone).toBe(true);
    }
  });

  it("lets everyone else in, including Europe outside those areas", () => {
    for (const zone of ["Asia/Kolkata", "Asia/Calcutta", "America/New_York", "America/Sao_Paulo", "Asia/Tokyo", "Australia/Sydney", "Africa/Lagos", "Europe/Moscow", "Europe/Kyiv", "Europe/Istanbul", "Europe/Belgrade"]) {
      expect(isRestrictedTimeZone(zone), zone).toBe(false);
    }
  });

  it("does not turn anyone away when the time zone is unknown", () => {
    for (const zone of [null, undefined, "", "Not/AZone"]) expect(isRestrictedTimeZone(zone)).toBe(false);
  });

  it("uses names this runtime reports for real cities", () => {
    const reported = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Amsterdam" }).resolvedOptions().timeZone;
    expect(isRestrictedTimeZone(reported)).toBe(true);
  });
});
