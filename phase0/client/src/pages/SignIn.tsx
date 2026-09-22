import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Panel } from "@/components/game/panel";
import { Mail, Lock, ArrowRight, Wand2, Flame } from "lucide-react";
import { toast } from "sonner";

export default function SignIn() {
  const { user, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [passwordMode, setPasswordMode] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const accountStatus = trpc.auth.accountStatus.useQuery({ email }, { enabled: false });
  const requestLink = trpc.auth.requestMagicLink.useMutation();
  const signInPw = trpc.auth.signInWithPassword.useMutation();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/create");
    }
  }, [isAuthenticated, user, navigate]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordMode) {
      if (!password.trim()) {
        toast.error("Please enter your password");
        return;
      }
      try {
        const result = await signInPw.mutateAsync({ email, password });
        login(result.token, result.user);
        navigate("/create");
      } catch (error: any) {
        toast.error(error?.message ?? "Something went wrong");
      }
      return;
    }

    if (!email.trim()) return;
    try {
      const res = await accountStatus.refetch();
      if (res.data?.exists) {
        if (res.data.hasPassword) {
          setPasswordMode(true);
          return;
        }
        const result = await requestLink.mutateAsync({ email });
        if (result.devUrl) {
          setLinkSent(true);
          toast.success("Magic link generated", { description: "Dev mode: use the link below." });
        } else {
          setLinkSent(true);
          toast.success("Check your inbox", { description: "Your magic sign-in link is on its way." });
        }
        return;
      }
      // No account yet — send them to the secret hatch (sign-up)
      navigate(`/?signup=${encodeURIComponent(email)}`);
    } catch (error: any) {
      toast.error(error?.message ?? "Something went wrong");
    }
  };

  const resetSignup = () => {
    setPasswordMode(false);
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container flex h-14 items-center justify-between">
          <Link
            to="/"
            className="font-serif text-lg font-semibold tracking-[0.22em] text-primary uppercase"
          >
            Arcanis
          </Link>
          <Link to="/" className="inline-block">
            <Button size="sm" variant="ghost">
              <ArrowRight className="rotate-180" /> Back to home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-14">
        <div className="mx-auto max-w-lg">
          <Panel title="Sign in to the Tower" gold>
            {linkSent ? (
              <div className="space-y-3 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15">
                  <Mail className="size-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">Check your inbox.</span> Your magic
                  sign-in link is on its way.
                </p>
                <button
                  type="button"
                  onClick={resetSignup}
                  className="text-[11px] text-muted-foreground underline hover:text-primary"
                >
                  Not you? Sign in with a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleContinue} className="space-y-3">
                {passwordMode ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email address</Label>
                      <Input id="signin-email" type="email" value={email} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={signInPw.isPending}
                    >
                      {signInPw.isPending ? <Spinner /> : <Lock />}
                      Sign in
                    </Button>
                    <button
                      type="button"
                      onClick={resetSignup}
                      className="text-[11px] text-muted-foreground underline hover:text-primary"
                    >
                      Not this account? Use a different email
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email address</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={requestLink.isPending || accountStatus.isFetching}
                    >
                      {requestLink.isPending || accountStatus.isFetching ? <Spinner /> : <Mail />}
                      Continue
                    </Button>
                    <p className="text-center text-[11px] text-muted-foreground">
                      Returning mage? You'll be asked for your password. New to the Tower? We'll
                      mail you a one-time sign-in link.
                    </p>
                  </>
                )}
              </form>
            )}
          </Panel>

          <Panel className="mt-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-serif text-primary">Password updates?</span>{" "}
              <span className="text-foreground">Forgot-password buttons?</span> Neither exists yet
              — both arrive in the next phase. For now, treat your password like a dragon's hoard:
              precious, and nobody's business but yours. (We can't recover it either, so guard it
              well.)
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Speaking of the Tower — it's dreadfully social. More mages mean more magic, more
              spells, more chaos. So grab a friend (or a stranger) and tell them the doors are
              open. Every new face is a welcome plot twist.
            </p>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Flame className="size-3.5 text-primary" />
              5 free Sparks await every new mage — each spell costs 1.
            </div>
            <Link to="/" className="mt-4 block text-center">
              <Button variant="outline" size="sm">
                <Wand2 /> Create your first spell
              </Button>
            </Link>
          </Panel>
        </div>
      </main>
    </div>
  );
}