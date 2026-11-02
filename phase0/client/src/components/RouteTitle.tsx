import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE = "Arcanis";
export const HOME_TITLE = "Arcanis: the magic game where you invent the spells";

const TITLES: Record<string, string> = {
  "/sanctum": "Sanctum",
  "/create": "Lab",
  "/library": "Spellbook",
  "/codex": "Codex",
  "/reviews": "Reviews",
  "/feedback": "Feedback",
  "/signin": "Sign in",
  "/auth/verify": "Signing in",
  "/privacy": "Privacy policy",
  "/terms": "Terms of use",
  "/admin/metrics": "Gate dashboard",
  "/admin/moderation": "Moderation",
  "/admin/feedback": "Feedback inbox",
};

/** Sets the browser tab title per page. A spell page sets its own, from the spell's name. */
export function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (/^\/(spell|s)\//.test(pathname)) return;
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    document.title = path === "/" ? HOME_TITLE : `${TITLES[path] ?? "Page not found"} | ${SITE}`;
  }, [pathname]);
  return null;
}
