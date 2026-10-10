import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SPARK } from "@shared/constants";
import { toast } from "sonner";

/**
 * The one-step welcome shown once after the first sign-in (Master Doc v7.4).
 * Every field is optional and "Skip" works, so the first spell is still a
 * minute away.
 */
export function Onboarding() {
  const { user, login } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [updates, setUpdates] = useState(true);
  const complete = trpc.profile.completeOnboarding.useMutation();

  if (!user || user.onboarded) return null;

  const finish = async (skip: boolean) => {
    try {
      const next = await complete.mutateAsync(
        skip
          ? { updatesOptIn: false }
          : { name: name.trim() || undefined, password: password || undefined, updatesOptIn: updates }
      );
      login(next);
    } catch (error: any) {
      toast.error(error?.message ?? "Could not save that");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && finish(true)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Welcome to Arcanis</DialogTitle>
          <DialogDescription>
            You have {SPARK.signupGrant} Spark to forge your first spells. Two quick things first, both optional.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void finish(false);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="onb-name">Name your mage</Label>
            <Input id="onb-name" autoFocus maxLength={24} placeholder="Ember of the Vale" value={name} onChange={(e) => setName(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Shown on your spells and reviews. You can change it later.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onb-password">
              Password <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="onb-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Set one to sign in next time without waiting for an email.</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={updates} onChange={(e) => setUpdates(e.target.checked)} />
            <span>
              Email me Arcanis updates
              <span className="block text-[11px] text-muted-foreground">New features like battles, and nothing else. Unsubscribe any time in your profile.</span>
            </span>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" disabled={complete.isPending} onClick={() => finish(true)}>
              Skip
            </Button>
            <Button type="submit" className="flex-1" disabled={complete.isPending || (name.trim().length > 0 && name.trim().length < 3) || (password.length > 0 && password.length < 8)}>
              Enter Arcanis
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
