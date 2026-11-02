// Where a visitor came from (task M6). Worked out from the address and referrer
// of the page they landed on and kept in memory only: nothing goes on the device.

export interface Attribution {
  channel: string;
  campaign?: string;
  referralCode?: string;
}

const SITES: [RegExp, string][] = [
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(facebook\.com|fb\.com)$/, "facebook"],
  [/(^|\.)(discord\.com|discordapp\.com)$/, "discord"],
  [/(^|\.)whatsapp\.com$/, "whatsapp"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
];

/** Lower case and safe to store, or undefined when nothing usable is left. */
function clean(value: string | null | undefined): string | undefined {
  const tag = (value ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
  return tag || undefined;
}

function fromReferrer(referrer: string, ownHost: string): string | undefined {
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return undefined;
  }
  if (!host || host === ownHost.toLowerCase().replace(/^www\./, "")) return undefined;
  return SITES.find(([pattern]) => pattern.test(host))?.[1] ?? clean(host);
}

/**
 * A tag in the link wins (`?utm_source=reddit&utm_campaign=launch`, or `?ch=reddit`),
 * then an invite link, then the site that sent them, then "direct".
 */
export function deriveAttribution(search: string, referrer: string, ownHost: string): Attribution {
  const params = new URLSearchParams(search);
  const referralCode = params.get("ref")?.trim().toUpperCase().slice(0, 16) || undefined;
  const channel = clean(params.get("utm_source")) ?? clean(params.get("ch")) ?? (referralCode ? "referral" : undefined) ?? fromReferrer(referrer, ownHost) ?? "direct";
  return { channel, campaign: clean(params.get("utm_campaign")), referralCode };
}
