import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Castle, FlaskConical, BookOpen, MessageSquareMore, BarChart3, ShieldAlert, LogIn, ChevronsUpDown, ScrollText, Feather, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileDialog } from "@/components/ProfileDialog";
import { Onboarding } from "@/components/Onboarding";
import { ForgeQueueWatcher } from "@/components/ForgeQueue";
import { ResearchWatcher } from "@/components/Research";
import { Button } from "@/components/ui/button";

// Phase 1a navigation only (arcanis-ui shell, Build Plan 10). Battle and the
// other game areas arrive with their phases.
const PLAYER_NAV = [
  // The mage's home. The founder's other candidate name belongs to a later system and stays out of Phase 1 copy (decision G2).
  { to: "/", label: "Sanctum", icon: Castle, auth: false },
  { to: "/create", label: "Lab", icon: FlaskConical, auth: true },
  { to: "/library", label: "Spellbook", icon: BookOpen, auth: true },
  { to: "/codex", label: "Codex", icon: ScrollText, auth: false },
  { to: "/reviews", label: "Reviews", icon: MessageSquareMore, auth: false },
  { to: "/feedback", label: "Feedback", icon: Feather, auth: true },
];
const ADMIN_NAV = [
  { to: "/admin/metrics", label: "Gate dashboard", icon: BarChart3 },
  { to: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { to: "/admin/feedback", label: "Feedback", icon: Inbox },
];

const COLLAPSED_KEY = "arc_sidebar_collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop: the sidebar folds to an icon rail. A per-browser convenience only.
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const location = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // Storage can be blocked; the toggle still works for this visit.
    }
  }, [collapsed]);

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card transition-[width] duration-300 lg:flex",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      </aside>

      {/* Below lg the logo, on the left, is the menu button. */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-card px-4 lg:hidden">
        <LogoButton onClick={() => setMobileOpen((v) => !v)} label={mobileOpen ? "Close navigation" : "Open navigation"} expanded={mobileOpen} />
        <WordmarkText />
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full w-56 flex-col border-r border-border bg-card pt-14"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <Onboarding />
      <ForgeQueueWatcher />
      <ResearchWatcher />

      <main className={cn("min-w-0 flex-1 pt-14 transition-[margin] duration-300 lg:pt-0", collapsed ? "lg:ml-16" : "lg:ml-56")}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

const MARK_CLASS = "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-primary/40 font-serif text-sm font-bold text-primary";

/** The gold "A": opens the menu on small screens and folds the sidebar on large ones. */
function LogoButton({ onClick, label, expanded }: { onClick: () => void; label: string; expanded: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      title={label}
      className={cn(MARK_CLASS, "transition-colors duration-300 hover:border-primary hover:bg-primary/10")}
    >
      A
    </button>
  );
}

function WordmarkText() {
  return (
    <Link to="/" className="font-serif text-lg font-semibold tracking-[0.2em] text-foreground">
      ARCANIS
    </Link>
  );
}

export function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className={MARK_CLASS}>A</span>
      <span className="font-serif text-lg font-semibold tracking-[0.2em] text-foreground">ARCANIS</span>
    </Link>
  );
}

function SidebarContent({ onNavigate, collapsed = false, onToggle }: { onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const { user, isAuthenticated } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const spark = trpc.spells.sparkBalance.useQuery(undefined, { enabled: isAuthenticated });
  const items = PLAYER_NAV.filter((i) => !i.auth || isAuthenticated);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-md py-2 text-sm transition-colors duration-300",
      collapsed ? "justify-center px-0" : "px-3",
      isActive ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
    );
  const displayName = user ? (user.nameChosen ? user.username : "Name your mage") : "";

  return (
    <>
      {/* Desktop only: the mobile drawer sits under the fixed header, which already carries the logo. */}
      {onToggle && (
        <>
          <div className={cn("flex items-center gap-2 pb-4 pt-6", collapsed ? "justify-center px-0" : "px-5")}>
            <LogoButton onClick={onToggle} label={collapsed ? "Expand sidebar" : "Collapse sidebar"} expanded={!collapsed} />
            {!collapsed && <WordmarkText />}
          </div>
          <div className="arc-rule mx-4" />
        </>
      )}

      <nav aria-label="Main" className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        <ul className="flex flex-col gap-0.5">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} end={to === "/"} onClick={onNavigate} className={linkClass} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined}>
                <Icon size={16} aria-hidden="true" />
                {!collapsed && label}
              </NavLink>
            </li>
          ))}
        </ul>
        {user?.role === "admin" && (
          <>
            {collapsed ? (
              <div className="arc-rule mx-2 my-4" />
            ) : (
              <p className="mt-6 px-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">Admin</p>
            )}
            <ul className="mt-1 flex flex-col gap-0.5">
              {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink to={to} onClick={onNavigate} className={linkClass} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined}>
                    <Icon size={16} aria-hidden="true" />
                    {!collapsed && label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className={cn("border-t border-border", collapsed ? "p-2" : "p-3")}>
        {user ? (
          <>
            {/* The profile block opens the floating profile window. */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md text-left transition-colors hover:bg-secondary/60",
                collapsed ? "justify-center p-1.5" : "p-2"
              )}
              aria-label="Open your profile"
              title={collapsed ? displayName : undefined}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 font-serif text-primary">
                {(user.nameChosen ? user.username : "M").slice(0, 1).toUpperCase()}
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{displayName}</span>
                    <span className="block text-[11px] text-muted-foreground">{spark.data ? `${spark.data.balance} Spark` : " "}</span>
                  </span>
                  <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
            <ProfileDialog open={profileOpen} onOpenChange={(open) => { setProfileOpen(open); if (!open) onNavigate?.(); }} />
          </>
        ) : (
          <Link to="/signin" onClick={onNavigate} title={collapsed ? "Sign in" : undefined} aria-label={collapsed ? "Sign in" : undefined}>
            <Button variant="outline" size="sm" className={cn("w-full", collapsed && "px-0")}>
              <LogIn /> {!collapsed && "Sign in"}
            </Button>
          </Link>
        )}
      </div>
    </>
  );
}
