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

/**
 * Required to create an account; the server refuses a new account without it.
 * The links open a new tab, so reading them does not lose the form.
 */
export function SignUpConsent({ checked, onChange, required = false }: { checked: boolean; onChange: (checked: boolean) => void; required?: boolean }) {
  return (
    <label className="flex items-start gap-2 text-xs">
      <input type="checkbox" className="mt-0.5" required={required} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        I am 18 or older, I accept the{" "}
        <Link to="/terms" target="_blank" className="text-primary underline">Terms</Link>, and I consent to my data being used as the{" "}
        <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link> describes.
      </span>
    </label>
  );
}
