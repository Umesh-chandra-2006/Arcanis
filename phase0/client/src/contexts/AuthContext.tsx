import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: "user" | "admin";
  nameChosen: boolean;
  hasPassword: boolean;
  /** This session was just opened by an emailed code or link: a new password needs no current one. */
  canResetPassword: boolean;
  updatesOptIn: boolean;
  onboarded: boolean;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the first session check returns. */
  isLoading: boolean;
  /**
   * Call after a successful sign-in; the session cookie is already set.
   * `viaEmail` marks a sign-in by emailed code or link, which is also the
   * forgot-password path, so the player is offered a new password.
   */
  login: (user: AuthUser, options?: { viaEmail?: boolean }) => void;
  logout: () => Promise<void>;
  /** True right after an emailed sign-in to an account that already has a password. */
  resetOffer: boolean;
  dismissResetOffer: () => void;
  /** The Lab sets this while a spell is forging or on show, so the welcome dialog (v7.8) waits until the player moves on. */
  holdWelcome: boolean;
  setHoldWelcome: (hold: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The session lives in an httpOnly cookie; the client never sees a token.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, { staleTime: 5 * 60_000, retry: false });
  const logoutMutation = trpc.auth.logout.useMutation();
  const [resetOffer, setResetOffer] = useState(false);
  const [holdWelcome, setHoldWelcome] = useState(false);

  const login = useCallback(
    (user: AuthUser, options?: { viaEmail?: boolean }) => {
      utils.auth.me.setData(undefined, user);
      if (options?.viaEmail && user.hasPassword && user.canResetPassword) setResetOffer(true);
    },
    [utils]
  );

  const dismissResetOffer = useCallback(() => setResetOffer(false), []);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync().catch(() => {});
    setResetOffer(false);
    utils.auth.me.setData(undefined, null);
    await utils.invalidate();
  }, [logoutMutation, utils]);

  const user = (me.data ?? null) as AuthUser | null;
  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, isLoading: me.isLoading, login, logout, resetOffer, dismissResetOffer, holdWelcome, setHoldWelcome }),
    [user, me.isLoading, login, logout, resetOffer, dismissResetOffer, holdWelcome]
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
