import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, XCircle, Loader2 } from "lucide-react";

export default function AuthVerify() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const verify = trpc.auth.verifyMagicLink.useMutation();

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) {
      setError("Missing verification token.");
      return;
    }

    verify
      .mutateAsync({ token })
      .then((result) => {
        login(result.token, result.user);
        navigate("/create", { replace: true });
      })
      .catch((err: any) => {
        setError(err?.message ?? "This link is invalid or has expired.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="arc-panel arc-panel-gold w-full max-w-sm p-8 text-center">
        {error ? (
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