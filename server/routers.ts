import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { labRouter } from "./routers/lab";
import { gameRouter } from "./routers/game";
import { authRouter } from "./routers/auth";
import { hearthRouter } from "./routers/hearth";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  lab: labRouter,
  game: gameRouter,
  hearth: hearthRouter,
});

export type AppRouter = typeof appRouter;

