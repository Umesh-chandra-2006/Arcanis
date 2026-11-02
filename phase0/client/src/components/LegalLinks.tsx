import { Link } from "react-router-dom";
import { LEGAL } from "@/lib/legal";

/** Privacy, terms and contact, for the landing page footer, the sign-in page and the sidebar. */
export function LegalLinks({ className = "" }: { className?: string }) {
  const link = "hover:text-primary hover:underline";
  return (
    <p className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground ${className}`}>
      <Link to="/privacy" className={link}>Privacy</Link>
      <Link to="/terms" className={link}>Terms</Link>
      <a href={`mailto:${LEGAL.contactEmail}`} className={link}>Contact</a>
    </p>
  );
}

/** Under each form that can create an account. */
export function SignUpConsent() {
  return (
    <p className="text-[11px] text-muted-foreground">
      By continuing you accept our{" "}
      <Link to="/terms" className="underline hover:text-primary">terms</Link> and{" "}
      <Link to="/privacy" className="underline hover:text-primary">privacy policy</Link>.
    </p>
  );
}
