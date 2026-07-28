import { useAuth } from "@/_core/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, LogOut, Wand2, FlaskConical, Swords, User } from "lucide-react";
import { toast } from "sonner";

export function Navbar() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const location = loc.pathname;
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Successfully logged out");
      navigate("/auth");
    } catch {
      toast.error("Logout failed");
    }
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-500/10 bg-slate-950/80 backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/60">
      <div className="container flex h-16 max-w-6xl items-center justify-between px-4 mx-auto">
        {/* Brand Logo */}
        <div 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20 group-hover:border-purple-500/40 transition-colors">
            <Wand2 className="h-5 w-5 text-purple-400" />
          </div>
          <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            ARCANIS
          </span>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => navigate("/dashboard")}
            className={`text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              location === "/dashboard" ? "text-purple-300" : "text-gray-400 hover:text-white"
            }`}
          >
            <User className="h-4 w-4" />
            Dashboard
          </button>
          <button
            onClick={() => navigate("/lab")}
            className={`text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              location === "/lab" ? "text-purple-300" : "text-gray-400 hover:text-white"
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            Lab
          </button>
          <button
            onClick={() => navigate("/battle-select")}
            className={`text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              location === "/battle-select" ? "text-purple-300" : "text-gray-400 hover:text-white"
            }`}
          >
            <Swords className="h-4 w-4" />
            Arena
          </button>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          {/* Mobile Quick Navigation */}
          <div className="flex md:hidden gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className={`p-1.5 rounded-lg border transition-colors ${
                location === "/dashboard" ? "border-purple-500/30 text-purple-300 bg-purple-500/10" : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <User className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate("/lab")}
              className={`p-1.5 rounded-lg border transition-colors ${
                location === "/lab" ? "border-purple-500/30 text-purple-300 bg-purple-500/10" : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <FlaskConical className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate("/battle-select")}
              className={`p-1.5 rounded-lg border transition-colors ${
                location === "/battle-select" ? "border-purple-500/30 text-purple-300 bg-purple-500/10" : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Swords className="h-4 w-4" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-purple-500/10 hidden md:block" />

          {/* Theme Toggle Button */}
          {toggleTheme && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-gray-400 hover:text-white hover:bg-slate-800/50"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4 text-purple-400" />
              ) : (
                <Sun className="h-4 w-4 text-yellow-400" />
              )}
            </Button>
          )}

          {/* Logged in User Profile Info & Logout */}
          <div className="flex items-center gap-3 bg-slate-900/60 pl-3 pr-2 py-1.5 rounded-full border border-purple-500/10">
            <span className="text-xs font-semibold text-gray-300 max-w-[80px] truncate hidden sm:inline-block">
              {user.username}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full"
              title="Log Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
