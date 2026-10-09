import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

/**
 * "Name your mage", asked the first time a public name is needed (first share
 * or first review), never up front (Master Doc 18.2).
 */
export function NameDialog({ open, onOpenChange, onNamed }: { open: boolean; onOpenChange: (open: boolean) => void; onNamed: () => void }) {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const setNameMutation = trpc.profile.setName.useMutation();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await setNameMutation.mutateAsync({ name });
      login(user);
      onOpenChange(false);
      onNamed();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not save that name");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Name your mage</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <p className="text-sm text-muted-foreground">This is the name others see on your spells and reviews.</p>
          <Input autoFocus maxLength={24} placeholder="Ember of the Vale" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" className="w-full" disabled={setNameMutation.isPending || name.trim().length < 3}>
            Save name
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Runs `action` now if the player has a name, otherwise after they pick one. */
export function useNameGate() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const gate = (action: () => void) => {
    if (!user || user.nameChosen) return action();
    setPending(() => action);
    setOpen(true);
  };
  const dialog = (
    <NameDialog
      open={open}
      onOpenChange={setOpen}
      onNamed={() => {
        pending?.();
        setPending(null);
      }}
    />
  );
  return { gate, dialog };
}
