import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { labRouter } from "./routers/lab";
import { gameRouter } from "./routers/game";
import { authRouter } from "./routers/auth";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  lab: labRouter,
  game: gameRouter,
});

export type AppRouter = typeof appRouter;

