import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { XCircle, Loader2 } from "lucide-react";

export default function AuthVerify() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const verify = trpc.auth.verifyLink.useMutation();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setError("This link is missing its token. Request a new one.");
      return;
    }
    verify
      .mutateAsync({ token })
      .then((result) => {
        login(result.user, { viaEmail: true });
        navigate("/sanctum", { replace: true });
      })
      .catch((err: { message?: string }) => setError(err?.message ?? "This link is invalid or has expired."));
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
            <p className="mt-2 text-xs text-muted-foreground">
              If your email opened in another app, type the 6-digit code from the same email instead.
            </p>
            <Link to="/signin" className="mt-6 inline-block">
              <Button>Get a new code</Button>
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
            <h1 className="mt-4 font-serif text-xl font-semibold">Signing you in</h1>
            <p className="mt-2 text-sm text-muted-foreground">One moment.</p>
          </>
        )}
      </div>
    </div>
  );
}
