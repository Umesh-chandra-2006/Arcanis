import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SparkPacksDialog } from "@/components/SparkPacks";
import { inviteUrl } from "@/lib/share";
import { cn } from "@/lib/utils";
import { SPARK, STONES } from "@shared/constants";
import { UserRound, Sparkles, Users, Bell, ShieldCheck, Copy, LogOut, Check } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "spark", label: "Spark", icon: Sparkles },
  { id: "invite", label: "Invite", icon: Users },
  { id: "updates", label: "Updates", icon: Bell },
  { id: "security", label: "Security", icon: ShieldCheck },
] as const;
type TabId = (typeof TABS)[number]["id"];
type Overview = inferRouterOutputs<AppRouter>["profile"]["overview"];

const LEDGER_LABEL: Record<string, string> = {
  grant_signup: "Welcome Spark",
  grant_weekly_allowance: "Weekly refill",
  grant_referral_inviter: "A friend you invited forged a spell",
  grant_referral_invitee: "Invite bonus",
  spend_creation: "Forged a spell",
  refund_creation: "Refund",
  admin_adjust: "Adjustment",
  migration_opening_balance: "Opening balance",
};

/** The floating profile window opened from the sidebar. */
export function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("profile");
  const overview = trpc.profile.overview.useQuery(undefined, { enabled: open && Boolean(user) });
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-hidden p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">Your profile</DialogTitle>
        <DialogDescription className="sr-only">Profile, Spark, invites, updates and security.</DialogDescription>
        <div className="flex max-h-[90dvh] flex-col sm:flex-row">
          <nav aria-label="Profile sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-secondary/30 p-2 pr-12 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  tab === id ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
            <button
              type="button"
              onClick={async () => {
                onOpenChange(false);
                await logout();
                navigate("/");
              }}
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground sm:mt-auto"
            >
              <LogOut size={15} /> Sign out
            </button>
          </nav>

          <div className="min-h-72 flex-1 overflow-y-auto p-5">
            {tab === "profile" && <ProfileTab overview={overview.data} />}
            {tab === "spark" && <SparkTab overview={overview.data} loading={overview.isLoading} />}
            {tab === "invite" && <InviteTab overview={overview.data} loading={overview.isLoading} />}
            {tab === "updates" && <UpdatesTab />}
            {tab === "security" && <SecurityTab />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

}

function ProfileTab({ overview: o }: { overview: Overview | undefined }) {
  const { user, login } = useAuth();
  if (!user) return null;
  const [name, setName] = useState(user.nameChosen ? user.username : "");
  const save = trpc.profile.setName.useMutation();
  return (
    <div className="space-y-5">
      <Heading title="Profile" subtitle="How other mages see you." />
      <form
        className="space-y-1.5"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            login(await save.mutateAsync({ name }));
            toast.success("Name saved");
          } catch (error: any) {
            toast.error(error?.message ?? "Could not save that name");
          }
        }}
      >
        <Label htmlFor="pf-name">Mage name</Label>
        <div className="flex gap-2">
          <Input id="pf-name" maxLength={24} placeholder="Ember of the Vale" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={save.isPending || name.trim().length < 3 || name.trim() === user.username}>
            Save
          </Button>
        </div>
      </form>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Email" value={user.email} />
        <Stat label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
        <Stat label="Spells forged" value={o ? String(o.spellsForged) : "…"} />
        <Stat label="Mages invited" value={o ? String(o.invitesJoined) : "…"} />
      </dl>
    </div>
  );
}

function SparkTab({ overview: o, loading }: { overview: Overview | undefined; loading: boolean }) {
  const [packs, setPacks] = useState(false);
  const stones = trpc.spells.stoneBalance.useQuery();
  if (loading || !o) return <Spinner />;
  return (
    <div className="space-y-5">
      <Heading title="Spark" subtitle={`Each spell costs ${SPARK.creationCost} Spark.`} />
      <div className="arc-panel arc-panel-gold flex items-center justify-between p-4">
        <div>
          <p className="font-serif text-3xl text-primary">{o.spark.balance}</p>
          <p className="text-xs text-muted-foreground">Spark available</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>
            +{SPARK.weeklyAllowance} every Monday, up to {SPARK.rolloverCap}
          </p>
          <p>Next refill {new Date(o.nextRefill).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => setPacks(true)}>
        <Sparkles /> Spark packs (coming soon)
      </Button>
      <div className="arc-panel flex items-center justify-between p-4">
        <div>
          <p className="font-serif text-2xl text-primary">{stones.data?.balance ?? 0}</p>
          <p className="text-xs text-muted-foreground">Refinement Stones</p>
        </div>
        <p className="max-w-52 text-right text-xs text-muted-foreground">
          Each spell you forge yields {STONES.perCreation}. Refining a spell costs {STONES.mendCost}.
        </p>
      </div>
      <SparkPacksDialog open={packs} onOpenChange={setPacks} source="chip" balance={o.spark.balance} />
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Recent</p>
        {o.history.length ? (
          <ul className="divide-y divide-border text-sm">
            {o.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2">
                <span>{LEDGER_LABEL[h.type] ?? h.type}</span>
                <span className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground">{new Date(h.createdAt).toLocaleDateString()}</span>
                  <span className={cn("w-8 text-right font-mono", h.amount > 0 ? "text-primary" : "text-muted-foreground")}>
                    {h.amount > 0 ? `+${h.amount}` : h.amount}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        )}
      </div>
    </div>
  );
}

function InviteTab({ overview: o, loading }: { overview: Overview | undefined; loading: boolean }) {
  const [copied, setCopied] = useState(false);
  if (loading || !o) return <Spinner />;
  const link = inviteUrl(o.referralCode);
  return (
    <div className="space-y-5">
      <Heading title="Invite" subtitle={`Earn ${SPARK.referralInviter} Spark when a mage you invite forges their first spell.`} />
      <div className="space-y-1.5">
        <Label>Your invite link</Label>
        <div className="flex gap-2">
          <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Every spell you share carries your invite code too.</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Mages who joined" value={String(o.invitesJoined)} />
        <Stat label="Spark earned" value={String(o.invitesRewarded * SPARK.referralInviter)} />
      </dl>
    </div>
  );
}

function UpdatesTab() {
  const { user, login } = useAuth();
  const set = trpc.profile.setUpdates.useMutation();
  const toggle = async (optIn: boolean) => {
    try {
      login(await set.mutateAsync({ optIn }));
      toast.success(optIn ? "You're subscribed" : "Unsubscribed");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not update that");
    }
  };
  if (!user) return null;
  return (
    <div className="space-y-5">
      <Heading title="Updates" subtitle="Hear when Arcanis grows." />
      <div className="arc-panel space-y-3 p-4">
        <p className="text-sm">
          {user.updatesOptIn ? (
            <>
              You're subscribed. We'll email <span className="text-foreground">{user.email}</span> when something new arrives.
            </>
          ) : (
            <>Battles, new elements of play and Spark packs are on the way. Get an email at <span className="text-foreground">{user.email}</span> when they land.</>
          )}
        </p>
        <Button variant={user.updatesOptIn ? "outline" : "default"} disabled={set.isPending} onClick={() => toggle(!user.updatesOptIn)}>
          <Bell /> {user.updatesOptIn ? "Unsubscribe" : "Subscribe to updates"}
        </Button>
        <p className="text-[11px] text-muted-foreground">Product news only. No marketing from anyone else, ever.</p>
      </div>
    </div>
  );
}

function SecurityTab() {
  const { user, login } = useAuth();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [forgot, setForgot] = useState(false);
  const [code, setCode] = useState("");
  const set = trpc.profile.setPassword.useMutation();
  const request = trpc.auth.requestSignIn.useMutation();
  const verify = trpc.auth.verifyCode.useMutation();
  if (!user) return null;
  // No current password is asked right after an emailed sigil (forgot password), or when none is set yet.
  const needsCurrent = user.hasPassword && !user.canResetPassword;

  const sendSigil = async () => {
    try {
      await request.mutateAsync({ email: user.email });
      setForgot(true);
      toast.success("Your sigil is on its way", { description: `Check ${user.email} for a 6-digit code.` });
    } catch (error: any) {
      toast.error(error?.message ?? "Could not send that");
    }
  };

  return (
    <div className="space-y-5">
      <Heading title="Security" subtitle="How you sign in." />
      <p className="text-sm text-muted-foreground">
        You sign in with your email and password. If you forget it, an emailed sigil lets you choose a new one.
      </p>

      {needsCurrent && forgot ? (
        <form
          className="space-y-1.5"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const result = await verify.mutateAsync({ email: user.email, code: code.replace(/\s/g, "") });
              login(result.user);
              setForgot(false);
              setCode("");
            } catch (error: any) {
              toast.error(error?.message ?? "That code did not work");
            }
          }}
        >
          <Label htmlFor="pf-code">Your sigil (6-digit code)</Label>
          <div className="flex gap-2">
            <Input id="pf-code" inputMode="numeric" autoComplete="one-time-code" placeholder="123 456" maxLength={7} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))} />
            <Button type="submit" disabled={verify.isPending || code.replace(/\s/g, "").length !== 6}>
              Confirm
            </Button>
          </div>
          <button type="button" className="text-[11px] text-muted-foreground underline hover:text-primary" onClick={() => setForgot(false)}>
            I remember it after all
          </button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              login(await set.mutateAsync({ password, currentPassword: needsCurrent ? current : undefined }));
              setCurrent("");
              setPassword("");
              toast.success(user.hasPassword ? "Password changed" : "Password set", {
                description: user.hasPassword ? "Other devices were signed out." : undefined,
              });
            } catch (error: any) {
              toast.error(error?.message ?? "Could not save that password");
            }
          }}
        >
          {needsCurrent && (
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="pf-current">Current password</Label>
                <button type="button" className="text-[11px] text-muted-foreground underline hover:text-primary" disabled={request.isPending} onClick={sendSigil}>
                  Forgot it? Email me a sigil
                </button>
              </div>
              <Input id="pf-current" type="password" autoComplete="current-password" maxLength={72} value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
          )}
          {user.hasPassword && user.canResetPassword && (
            <p className="text-[11px] text-primary">Sigil confirmed. Choose your new password.</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pf-password">{user.hasPassword ? "New password" : "Password"}</Label>
            <div className="flex gap-2">
              <Input id="pf-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit" disabled={set.isPending || password.length < 8 || (needsCurrent && !current)}>
                {user.hasPassword ? "Change" : "Set"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}


function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}
