import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, XCircle, Loader2, Lock, PartyPopper, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type Stage = "verifying" | "set_password" | "error";

export default function AuthVerify() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { login } = useAuth();
  const [stage, setStage] = useState<Stage>("verifying");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const started = useRef(false);

  const verify = trpc.auth.verifyMagicLink.useMutation();
  const setPasswordMutation = trpc.auth.setPassword.useMutation();

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) {
      setError("Missing verification token.");
      setStage("error");
      return;
    }

    verify
      .mutateAsync({ token })
      .then((result) => {
        login(result.token, result.user);
        if (result.isNewUser) {
          setStage("set_password");
        } else {
          navigate("/create", { replace: true });
        }
      })
      .catch((err: any) => {
        setError(err?.message ?? "This link is invalid or has expired.");
        setStage("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setPasswordMutation.mutateAsync({ password });
      toast.success("Password saved", { description: "You can now sign in with a password anytime." });
      navigate("/create", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save your password");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="arc-panel arc-panel-gold w-full max-w-sm p-8 text-center">
        {stage === "error" ? (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15">
              <XCircle className="size-6 text-destructive" />
            </div>
            <h1 className="mt-4 font-serif text-xl font-semibold">Sign-in failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Link to="/" className="mt-6 inline-block">
              <Button>Request a new link</Button>
            </Link>
          </>
        ) : stage === "set_password" ? (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15">
              <PartyPopper className="size-6 text-primary" />
            </div>
            <h1 className="mt-4 font-serif text-xl font-semibold">Welcome, spellcaster</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              5 free Sparks are yours. Add a password to sign in without email links later —
              or skip it for now.
            </p>
            <form onSubmit={handleSetPassword} className="mt-6 space-y-3">
              <div className="text-left space-y-2">
                <Label htmlFor="new-password">Choose a password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={setPasswordMutation.isPending} className="w-full">
                {setPasswordMutation.isPending ? <Spinner /> : <Lock />}
                Save password
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/create", { replace: true })}
                className="w-full"
              >
                Skip for now <ArrowRight />
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
            <h1 className="mt-4 font-serif text-xl font-semibold">Opening the Tower</h1>
            <p className="mt-2 text-sm text-muted-foreground">Verifying your magic link…</p>
            <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="size-3.5" /> 5 free Sparks await on your first visit
            </p>
            <div className="mt-6 flex justify-center">
              <Spinner />
            </div>
          </>
        )}
      </div>
    </div>
  );
}