import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/game/panel";
import { SignInForm } from "@/components/SignInForm";
import { ArrowRight, Flame } from "lucide-react";
import { SPARK } from "@shared/constants";

export default function SignIn() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (isAuthenticated) navigate("/sanctum");
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="font-serif text-lg font-semibold tracking-[0.22em] text-primary uppercase">
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
          <Panel title="Sign in to Arcanis" gold>
            <SignInForm initialEmail={params.get("email") ?? ""} />
          </Panel>
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Flame className="size-3.5 text-primary" />
            {SPARK.signupGrant} free Spark for every new mage. Each spell costs {SPARK.creationCost}.
          </div>
        </div>
      </main>
    </div>
  );
}
