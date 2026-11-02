import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SignUpConsent } from "@/components/LegalLinks";
import { toast } from "sonner";

/**
 * Stands in for the whole app for an account from before the 18+ terms. The
 * server refuses everything else for such an account, so this is only the way
 * to answer. The legal pages stay readable; their links open in a new tab.
 */
export function TermsGate() {
  const { login, logout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const accept = trpc.profile.acceptTerms.useMutation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      login(await accept.mutateAsync({ accepted: true }));
    } catch (error: any) {
      toast.error(error?.message ?? "Could not save that. Please try again.");
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <form onSubmit={submit} className="arc-panel arc-panel-gold w-full max-w-md space-y-5 p-6">
        <p className="font-serif text-xl font-semibold leading-snug text-primary">We have updated our Terms and Privacy Policy. Arcanis is now for people aged 18 and over.</p>
        <SignUpConsent checked={accepted} onChange={setAccepted} required />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" className="flex-1" disabled={!accepted || accept.isPending}>
            Continue
          </Button>
          <Button type="button" variant="ghost" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </form>
    </div>
  );
}
