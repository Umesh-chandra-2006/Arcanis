import { deriveAttribution, type Attribution } from "@shared/attribution";

// Read once, from the page this visit landed on, and held in memory only: no
// cookie or browser storage (privacy policy). It survives moving around the app
// and is lost on a reload away from the original address, which is the trade-off.
let current: Attribution | null = null;
let landingViewSent = false;

export function attribution(): Attribution {
  current ??= deriveAttribution(window.location.search, document.referrer, window.location.hostname);
  return current;
}

/** Channel tags only, for visit events. */
export function channelTags(): { channel: string; campaign?: string } {
  const { channel, campaign } = attribution();
  return { channel, campaign };
}

/** True the first time on a page load, so moving back to the landing page is not another visit. */
export function firstLandingView(): boolean {
  if (landingViewSent) return false;
  landingViewSent = true;
  return true;
}
