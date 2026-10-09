import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";

/**
 * One sign-in flow for new and returning players: email, then the 6-digit code
 * from the same email (or the link in it). No passwords.
 */
export function SignInForm({ initialEmail = "", redirectTo = "/create" }: { initialEmail?: string; redirectTo?: string }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [dev, setDev] = useState<{ url: string; code: string } | null>(null);

  const request = trpc.auth.requestSignIn.useMutation();
  const verify = trpc.auth.verifyCode.useMutation();

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) return;
    try {
      const result = await request.mutateAsync({ email });
      setSentTo(email.trim().toLowerCase());
      setDev(result.devUrl && result.devCode ? { url: result.devUrl, code: result.devCode } : null);
      toast.success("Check your inbox", { description: "We sent a 6-digit code and a sign-in link." });
    } catch (error: any) {
      toast.error(error?.message ?? "Something went wrong");
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentTo) return;
    try {
      const result = await verify.mutateAsync({ email: sentTo, code: code.replace(/\s/g, "") });
      login(result.user);
      navigate(redirectTo, { replace: true });
    } catch (error: any) {
      toast.error(error?.message ?? "That code did not work");
    }
  };

  if (!sentTo) {
    return (
      <form onSubmit={sendCode} className="space-y-3">
        <Label htmlFor="signin-email">Email address</Label>
        <div className="flex gap-2">
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={request.isPending}>
            {request.isPending ? <Spinner /> : <ArrowRight />}
            Continue
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          New or returning, it's the same: we email you a 6-digit code and a link. No password, ever.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={submitCode} className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mail className="size-4 text-primary" />
        <span>
          Sent to <span className="text-foreground">{sentTo}</span>
        </span>
      </div>
      <Label htmlFor="signin-code">6-digit code</Label>
      <div className="flex gap-2">
        <Input
          id="signin-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123 456"
          maxLength={7}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
          autoFocus
          required
        />
        <Button type="submit" disabled={verify.isPending || code.replace(/\s/g, "").length !== 6}>
          {verify.isPending ? <Spinner /> : <KeyRound />}
          Sign in
        </Button>
      </div>
      {dev && (
        <p className="text-[11px] text-muted-foreground break-all">
          Dev mode (no email provider): code <span className="text-foreground">{dev.code}</span>, or{" "}
          <a href={dev.url} className="underline text-primary">
            open the link
          </a>
          .
        </p>
      )}
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <button type="button" className="underline hover:text-primary" onClick={() => sendCode()} disabled={request.isPending}>
          Send a new code
        </button>
        <button
          type="button"
          className="underline hover:text-primary"
          onClick={() => {
            setSentTo(null);
            setCode("");
            setDev(null);
          }}
        >
          Use a different email
        </button>
      </div>
    </form>
  );
}
