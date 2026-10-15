import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";

/**
 * One sign-in flow (Master Doc v7.5). Returning mages enter their password,
 * which sends no email. New mages, and anyone who forgot their password, get a
 * 6-digit code and a link by email. The form never reveals whether an account
 * exists.
 */
export function SignInForm({ initialEmail = "", redirectTo = "/sanctum" }: { initialEmail?: string; redirectTo?: string }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [dev, setDev] = useState<{ url: string; code: string } | null>(null);

  const request = trpc.auth.requestSignIn.useMutation();
  const verify = trpc.auth.verifyCode.useMutation();
  const withPassword = trpc.auth.signInWithPassword.useMutation();
  const busy = request.isPending || withPassword.isPending;

  const sendCode = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }
    try {
      const result = await request.mutateAsync({ email });
      setSentTo(email.trim().toLowerCase());
      setDev(result.devUrl && result.devCode ? { url: result.devUrl, code: result.devCode } : null);
      toast.success("Your sigil is on its way", { description: "Check your inbox for a 6-digit code and a sign-in link." });
    } catch (error: any) {
      toast.error(error?.message ?? "Something went wrong");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return sendCode();
    try {
      const result = await withPassword.mutateAsync({ email, password });
      login(result.user);
      navigate(redirectTo, { replace: true });
    } catch (error: any) {
      toast.error(error?.message ?? "That email and password don't match");
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentTo) return;
    try {
      const result = await verify.mutateAsync({ email: sentTo, code: code.replace(/\s/g, "") });
      login(result.user, { viaEmail: true });
      navigate(redirectTo, { replace: true });
    } catch (error: any) {
      toast.error(error?.message ?? "That code did not work");
    }
  };

  if (!sentTo) {
    return (
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="signin-email">Email address</Label>
          <Input id="signin-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="signin-password">Password</Label>
            <button type="button" className="text-[11px] text-muted-foreground underline hover:text-primary" onClick={() => sendCode()} disabled={busy}>
              Forgot it?
            </button>
          </div>
          <PasswordInput id="signin-password" autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {withPassword.isPending ? <Spinner /> : <KeyRound />}
          Enter Arcanis
        </Button>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          new to Arcanis?
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => sendCode()}>
          {request.isPending ? <Spinner /> : <ArrowRight />}
          Summon my sigil
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Enter your email and we send a sigil (a 6-digit code). You choose your password once inside.
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
      <Label htmlFor="signin-code">Your sigil (6-digit code)</Label>
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
        <p className="break-all text-[11px] text-muted-foreground">
          Dev mode (no email provider): code <span className="text-foreground">{dev.code}</span>, or{" "}
          <a href={dev.url} className="text-primary underline">
            open the link
          </a>
          .
        </p>
      )}
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <button type="button" className="underline hover:text-primary" onClick={() => sendCode()} disabled={request.isPending}>
          Summon a new sigil
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
