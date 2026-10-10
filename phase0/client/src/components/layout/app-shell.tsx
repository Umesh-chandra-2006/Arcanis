import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Castle, FlaskConical, BookOpen, MessageSquareMore, BarChart3, ShieldAlert, Menu, X, LogOut, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { SparkDots } from "@/components/SparkDots";
import { Button } from "@/components/ui/button";

// Phase 1a navigation only (arcanis-ui shell, Build Plan 10). Battle and the
// other game areas arrive with their phases.
const PLAYER_NAV = [
  { to: "/", label: "Home", icon: Castle, auth: false },
  { to: "/create", label: "Lab", icon: FlaskConical, auth: true },
  { to: "/library", label: "Spellbook", icon: BookOpen, auth: true },
  { to: "/reviews", label: "Reviews", icon: MessageSquareMore, auth: false },
];
const ADMIN_NAV = [
  { to: "/admin/metrics", label: "Gate dashboard", icon: BarChart3 },
  { to: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-card lg:flex">
        <SidebarContent />
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Wordmark />
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
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

      <main className="min-w-0 flex-1 pt-14 lg:ml-56 lg:pt-0">
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

export function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-sm border border-primary/40 font-serif text-sm font-bold text-primary">A</span>
      <span className="font-serif text-lg font-semibold tracking-[0.2em] text-foreground">ARCANIS</span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const spark = trpc.spells.sparkBalance.useQuery(undefined, { enabled: isAuthenticated });
  const items = PLAYER_NAV.filter((i) => !i.auth || isAuthenticated);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-300",
      isActive ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
    );

  return (
    <>
      <div className="hidden px-5 pb-4 pt-6 lg:block">
        <Wordmark />
      </div>
      <div className="arc-rule mx-4 hidden lg:block" />

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} end={to === "/"} onClick={onNavigate} className={linkClass}>
                <Icon size={16} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        {user?.role === "admin" && (
          <>
            <p className="mt-6 px-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">Admin</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink to={to} onClick={onNavigate} className={linkClass}>
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-border p-4">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 font-serif text-primary">
                {user.username.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.nameChosen ? user.username : "Unnamed mage"}</p>
                {spark.data && <SparkDots balance={spark.data.balance} />}
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                onNavigate?.();
                await logout();
                navigate("/");
              }}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        ) : (
          <Link to="/signin" onClick={onNavigate}>
            <Button variant="outline" size="sm" className="w-full">
              <LogIn /> Sign in
            </Button>
          </Link>
        )}
      </div>
    </>
  );
}
