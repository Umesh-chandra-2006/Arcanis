import { useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  Castle,
  LayoutDashboard,
  Swords,
  FlaskConical,
  Landmark,
  ScrollText,
  Feather,
  Users,
  UserRound,
  Sparkles,
  Shield,
  Settings,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/_core/hooks/useAuth"

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Castle },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/battle-select", label: "Arena", icon: Swords },
  { to: "/lab", label: "Lab", icon: FlaskConical },
  { to: "/tower", label: "Magic Tower", icon: Landmark },
  { to: "/quests", label: "Quests", icon: ScrollText },
  { to: "/freestyle", label: "Freestyle", icon: Feather },
  { to: "/community", label: "Community", icon: Users },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/avatar", label: "Avatar", icon: Sparkles },
  { to: "/hall", label: "Hall", icon: Shield },
  { to: "/settings", label: "Settings", icon: Settings },
]

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-card lg:flex">
        <SidebarContent user={user} onNavigate={() => setMobileOpen(false)} />
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
              <SidebarContent user={user} onNavigate={() => setMobileOpen(false)} />
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
  )
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-sm border border-primary/40 font-serif text-sm font-bold text-primary">
        A
      </span>
      <span className="font-serif text-lg font-semibold tracking-[0.2em] text-foreground">ARCANIS</span>
    </div>
  )
}

function SidebarContent({ user, onNavigate }: { user: { username?: string; avatar?: string; circle?: number } | null; onNavigate?: () => void }) {
  return (
    <>
      <div className="hidden px-5 pb-4 pt-6 lg:block">
        <Wordmark />
      </div>
      <div className="arc-rule mx-4 hidden lg:block" />

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-300",
                    isActive
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )
                }
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {user && (
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-secondary text-sm font-medium text-primary">
              {user.username?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.username || "Mage"}</p>
              {user.circle && (
                <p className="truncate text-[11px] text-muted-foreground">Circle {user.circle}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
