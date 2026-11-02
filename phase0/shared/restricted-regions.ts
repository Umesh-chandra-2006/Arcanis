// Gemini's terms allow only Paid Services for users in the EEA, Switzerland and the UK, and production
// uses the free tier (client/src/lib/legal.ts). Until billing is on, new sign-ups from there are turned
// away by the browser's time zone. This is a reasonable step, not a guarantee: changing the device's time
// zone gets around it, and it is not checked on the server. Delete this, and the line in the Terms, when billing is on.

/** IANA time zones of the EEA (EU, Iceland, Liechtenstein, Norway), Switzerland and the UK. An explicit list: Europe/* also holds Moscow, Kyiv and Istanbul. */
const RESTRICTED_TIME_ZONES = new Set([
  // EU
  "Europe/Vienna", "Europe/Brussels", "Europe/Sofia", "Europe/Zagreb", "Asia/Nicosia", "Asia/Famagusta", "Europe/Nicosia",
  "Europe/Prague", "Europe/Copenhagen", "Europe/Tallinn", "Europe/Helsinki", "Europe/Mariehamn", "Europe/Paris", "Europe/Berlin", "Europe/Busingen",
  "Europe/Athens", "Europe/Budapest", "Europe/Dublin", "Europe/Rome", "Europe/Riga", "Europe/Vilnius", "Europe/Luxembourg",
  "Europe/Malta", "Europe/Amsterdam", "Europe/Warsaw", "Europe/Lisbon", "Atlantic/Madeira", "Atlantic/Azores", "Europe/Bucharest",
  "Europe/Bratislava", "Europe/Ljubljana", "Europe/Madrid", "Africa/Ceuta", "Atlantic/Canary", "Europe/Stockholm",
  // EU outermost regions
  "America/Guadeloupe", "America/Martinique", "America/Cayenne", "America/Marigot", "Indian/Reunion", "Indian/Mayotte",
  // Rest of the EEA
  "Atlantic/Reykjavik", "Europe/Vaduz", "Europe/Oslo", "Arctic/Longyearbyen",
  // Switzerland
  "Europe/Zurich",
  // UK, with the Crown Dependencies
  "Europe/London", "Europe/Belfast", "Europe/Jersey", "Europe/Guernsey", "Europe/Isle_of_Man",
  // Older names browsers can still report
  "GB", "GB-Eire", "Eire", "Iceland", "Poland", "Portugal",
]);

export function isRestrictedTimeZone(timeZone: string | null | undefined): boolean {
  return Boolean(timeZone) && RESTRICTED_TIME_ZONES.has(timeZone as string);
}

export const REGION_UNAVAILABLE_MESSAGE = "Arcanis is not available in your region yet. We hope to open it there soon.";
