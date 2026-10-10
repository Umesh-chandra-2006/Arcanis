import { createContext, useCallback, useContext, useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: "user" | "admin";
  nameChosen: boolean;
  hasPassword: boolean;
  updatesOptIn: boolean;
  onboarded: boolean;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the first session check returns. */
  isLoading: boolean;
  /** Call after a successful sign-in; the session cookie is already set. */
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The session lives in an httpOnly cookie; the client never sees a token.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, { staleTime: 5 * 60_000, retry: false });
  const logoutMutation = trpc.auth.logout.useMutation();

  const login = useCallback(
    (user: AuthUser) => {
      utils.auth.me.setData(undefined, user);
    },
    [utils]
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync().catch(() => {});
    utils.auth.me.setData(undefined, null);
    await utils.invalidate();
  }, [logoutMutation, utils]);

  const user = (me.data ?? null) as AuthUser | null;
  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, isLoading: me.isLoading, login, logout }),
    [user, me.isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
