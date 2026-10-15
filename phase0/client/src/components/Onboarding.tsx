import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SPARK } from "@shared/constants";
import { toast } from "sonner";

/**
 * The dialogs that follow a sign-in (Master Doc v7.5).
 * - Welcome: shown once after the first sign-in. A password is required (it
 *   saves an email on every later sign-in); the name and update emails are
 *   optional.
 * - Set a password: an older account that has none yet.
 * - New password: offered after an emailed sign-in to an account that already
 *   has one, which is the forgot-password path. This one can be dismissed.
 */
export function Onboarding() {
  const { user, login, resetOffer, dismissResetOffer } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [updates, setUpdates] = useState(true);
  const complete = trpc.profile.completeOnboarding.useMutation();
  const setNew = trpc.profile.setPassword.useMutation();

  if (!user) return null;
  const mode = !user.onboarded ? "welcome" : !user.hasPassword ? "password" : resetOffer ? "reset" : null;
  if (!mode) return null;

  const busy = complete.isPending || setNew.isPending;
  const mismatch = again.length > 0 && again !== password;
  const passwordOk = password.length >= 8 && again === password;
  const nameOk = name.trim().length === 0 || name.trim().length >= 3;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "welcome") {
        login(await complete.mutateAsync({ name: name.trim() || undefined, password, updatesOptIn: updates }));
      } else {
        login(await setNew.mutateAsync({ password }));
        if (mode === "reset") {
          dismissResetOffer();
          toast.success("Password changed");
        }
      }
      setPassword("");
      setAgain("");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not save that");
    }
  };

  const copy = {
    welcome: {
      title: "Welcome to Arcanis",
      description: `You have ${SPARK.signupGrant} Spark to forge your first spells. Choose a password first, so you can return without waiting for an email.`,
      action: "Enter Arcanis",
    },
    password: {
      title: "Choose a password",
      description: "Arcanis now opens with a password, so you can return without waiting for an email.",
      action: "Save password",
    },
    reset: {
      title: "Set a new password?",
      description: "You came in with an emailed sigil. If you forgot your password, choose a new one now.",
      action: "Save new password",
    },
  }[mode];

  return (
    <Dialog open onOpenChange={(open) => !open && mode === "reset" && dismissResetOffer()}>
      <DialogContent
        className="max-w-md"
        showCloseButton={mode === "reset"}
        onEscapeKeyDown={(e) => mode !== "reset" && e.preventDefault()}
        onPointerDownOutside={(e) => mode !== "reset" && e.preventDefault()}
        onInteractOutside={(e) => mode !== "reset" && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          {mode === "welcome" && (
            <div className="space-y-1.5">
              <Label htmlFor="onb-name">
                Name your mage <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="onb-name" autoFocus maxLength={24} placeholder="Ember of the Vale" value={name} onChange={(e) => setName(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Shown on your spells and reviews. You can change it later.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="onb-password">{mode === "reset" ? "New password" : "Password"}</Label>
            <PasswordInput
              id="onb-password"
              autoComplete="new-password"
              autoFocus={mode !== "welcome"}
              required
              minLength={8}
              maxLength={72}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode !== "reset" && <p className="text-[11px] text-muted-foreground">If you ever forget it, an emailed sigil lets you choose a new one.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onb-password-again">Retype password</Label>
            <PasswordInput
              id="onb-password-again"
              autoComplete="new-password"
              required
              maxLength={72}
              aria-invalid={mismatch}
              value={again}
              onChange={(e) => setAgain(e.target.value)}
            />
            {mismatch && <p className="text-[11px] text-destructive">The two passwords do not match.</p>}
          </div>
          {mode === "welcome" && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={updates} onChange={(e) => setUpdates(e.target.checked)} />
              <span>
                Email me Arcanis updates
                <span className="block text-[11px] text-muted-foreground">New features like battles, and nothing else. Unsubscribe any time in your profile.</span>
              </span>
            </label>
          )}
          <div className="flex gap-2">
            {mode === "reset" && (
              <Button type="button" variant="ghost" className="flex-1" disabled={busy} onClick={dismissResetOffer}>
                Keep my current one
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={busy || !passwordOk || !nameOk}>
              {copy.action}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
