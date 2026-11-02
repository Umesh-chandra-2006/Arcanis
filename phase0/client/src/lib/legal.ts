import { isRestrictedTimeZone } from "@shared/restricted-regions";

// The facts the privacy and terms pages depend on, in one place.
// The operator and grievance officer were confirmed by the founder (2026-11-03). The contact address
// must keep reaching the founder. Arcanis is 18+ (founder, after the legal review, 2026-11-03).
// The 12 month periods in Privacy, "How long we keep it", are enforced by server/retention.ts: change them together.
//
// Provider terms, checked on 2026-11-03 against the providers' own pages. Check again before relying on them:
// - Gemini API terms (effective 2026-03-23): you must be 18; no use in a service directed at or likely to be
//   accessed by under-18s; ONLY PAID SERVICES may be made available to users in the EEA, Switzerland or the UK.
//   Founder decision (2026-11-03): stay on the free tier for the cohort, with a line in the Terms and a sign-up
//   block by time zone (shared/restricted-regions.ts). TODO enable billing before the public opening, then delete
//   both and rewrite the Google line in Privacy and AI_INPUT_NOTICE, since Google then does not use the text to
//   improve its products. Abuse logs are kept 55 days and flagged items can be read by staff.
// - Groq Services Agreement (modified 2026-06-22): you must be 18; Groq may not train on inputs or outputs.
//   No retention by default; logs up to 30 days. Zero Data Retention can be switched on in its Data Controls.
// - OpenAI API docs: /v1/moderations is not used for training, with no abuse-monitoring or application retention.
//   The page says nothing about what OpenAI retains, as the legal review asked; it could now say this.
//
// Transfer safeguards found in each provider's published terms. The official list at
// dataprivacyframework.gov could not be read, so the DPF claims are the providers' own:
//   Vercel, Render, PingCAP (TiDB Cloud), Cloudinary: DPF and SCCs. Brevo: SCCs, may rely on DPF.
//   Google: states DPF; SCCs under its Cloud DPA. That DPA is tied to Paid Services, so the free tier may not be covered.
//   Groq: SCCs, no DPF mentioned; whether its DPA covers free plans is not stated.
//   OpenAI: SCCs under its DPA, through OpenAI Ireland for EEA and Swiss data.
export const LEGAL = {
  operator: "Umesh Chandra Tirumani, an individual based in India",
  contactEmail: "support@arcanis.world",
  updated: "3 November 2026",
};

/** Read in the browser only: the time zone is neither sent nor stored. See shared/restricted-regions.ts. */
export function signUpsClosedHere(): boolean {
  try {
    return isRestrictedTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return false;
  }
}

/** Directly under every box a spell description is typed into. */
export const AI_INPUT_NOTICE = "Your text is sent to Google or Groq to write your spell, and to OpenAI to check it for safety. Google may keep it, learn from it and have people review it. Do not enter personal information.";
