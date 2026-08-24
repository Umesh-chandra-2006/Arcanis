import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { spellsRouter } from "./routers/spells";
import { analyticsRouter } from "./routers/analytics";

export const appRouter = router({
  auth: authRouter,
  spells: spellsRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;