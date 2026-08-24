import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { battles } from "../../drizzle/schema";
import { eq, or, desc } from "drizzle-orm";
import { getRedisService } from "../redis-service";
import { getSpellById, getPlatformSpells } from "../spell-db";
import { getUserById } from "../auth-service";
import { TERRAINS, ALL_ELEMENTS } from "@shared/constants";
import type { Server as SocketIOServer } from "socket.io";

const redisService = getRedisService();

interface PlayerInfo {
  id: number;
  username: string;
  avatar: string;
  willCap: number;
}

interface BattleState {
  battleId: string;
  player1Id: number;
  player2Id: number;
  player1Hp: number;
  player2Hp: number;
  player1Mp: number;
  player2Mp: number;
  player1Will: number;
  player2Will: number;
  terrain: string;
  currentTurn: number;
  activePlayer: 1 | 2;
  status: "waiting" | "active" | "finished";
  winner?: number;
  battleLog: Array<{
    turn: number;
    action: string;
    timestamp: number;
    actor: number;
  }>;
  lastActivityAt: number;
  player1: PlayerInfo | null;
  player2: PlayerInfo | null;
}

async function createBattleState(
  player1Id: number,
  player2Id: number,
  terrain: string
): Promise<BattleState> {
  const battleId = nanoid();
  const now = Date.now();

  const p1 = await getUserById(player1Id);
  const p2 = player2Id === -1 ? { id: -1, username: "Bot Opponent", avatar: "ashen", hp: 100, mp: 100, willCap: 100 } : await getUserById(player2Id);

  const state: BattleState = {
    battleId,
    player1Id,
    player2Id,
    player1Hp: p1?.hp ?? 100,
    player2Hp: p2?.hp ?? 100,
    player1Mp: p1?.mp ?? 100,
    player2Mp: p2?.mp ?? 100,
    player1Will: 0,
    player2Will: 0,
    terrain,
    currentTurn: 1,
    activePlayer: 1,
    status: "active",
    battleLog: [],
    lastActivityAt: now,
    player1: p1 ? { id: p1.id, username: p1.username, avatar: p1.avatar, willCap: p1.willCap ?? 100 } : null,
    player2: p2 ? { id: p2.id, username: p2.username, avatar: p2.avatar, willCap: p2.willCap ?? 100 } : null,
  };

  await redisService.setBattleState(battleId, state);
  return state;
}

export async function persistBattleToDb(state: BattleState) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(battles).values({
      id: state.battleId,
      player1Id: state.player1Id,
      player2Id: state.player2Id,
      winnerId: state.winner,
      terrain: state.terrain,
      mode: "brawl",
      turnsPlayed: state.currentTurn,
      battleLog: state.battleLog,
      endedAt: state.status === "finished" ? new Date() : null,
    });
  } catch (error) {
    console.error("[Battle] Failed to persist battle:", error);
  }
}

// 12-element mapping to terrains
const elementToTerrain: Record<string, string> = {
  Fire: "Volcanic Wastes",
  Frost: "Frozen Tundra",
  Nature: "Verdant Grove",
  Earth: "Verdant Grove",
  Void: "Starlit Void",
  Arcane: "Starlit Void",
  Light: "Crystalline Cavern",
  Shadow: "Crystalline Cavern",
  Lightning: "Tempest Peak",
  Wind: "Tempest Peak",
  Water: "Frozen Tundra",
  Chaos: "Volcanic Wastes",
};

async function resolveCast(
  state: BattleState,
  casterId: number,
  spellId: string,
  minigameAccuracy: number
): Promise<BattleState> {
  const spell = await getSpellById(spellId);
  if (!spell) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Spell not found" });
  }

  const isPlayer1 = state.player1Id === casterId;
  const currentMp = isPlayer1 ? state.player1Mp : state.player2Mp;

  // 1. MP and Will check
  let finalMpCost = spell.mpCost;
  const matchingTerrain = elementToTerrain[spell.element];
  if (matchingTerrain && state.terrain === matchingTerrain) {
    finalMpCost = Math.round(finalMpCost * 0.9);
  }

  if (currentMp < finalMpCost) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient MP" });
  }

  // Deduct MP and calculate interpolated Will cost
  const willCostRange = spell.willCostMax - spell.willCostMin;
  const willCost = spell.willCostMin + Math.floor(willCostRange * minigameAccuracy);

  const casterWillCap = isPlayer1 ? (state.player1?.willCap ?? 100) : (state.player2?.willCap ?? 100);

  if (isPlayer1) {
    state.player1Mp = Math.max(0, state.player1Mp - finalMpCost);
    state.player1Will = Math.min(casterWillCap, state.player1Will + willCost);
  } else {
    state.player2Mp = Math.max(0, state.player2Mp - finalMpCost);
    state.player2Will = Math.min(casterWillCap, state.player2Will + willCost);
  }

  // 2. Damage Calculation
  const damageRange = spell.damageMax - spell.damageMin;
  let damage = spell.damageMin + Math.floor(damageRange * minigameAccuracy);

  // Apply terrain damage bonus (+15%)
  if (matchingTerrain && state.terrain === matchingTerrain) {
    damage = Math.round(damage * 1.15);
  }

  // Deduct opponent HP (or heal if Regen, drain if Drain, etc.)
  let actionText = "";
  if (spell.primaryCategory === "Regen") {
    if (isPlayer1) {
      state.player1Hp = Math.min(100, state.player1Hp + damage);
    } else {
      state.player2Hp = Math.min(100, state.player2Hp + damage);
    }
    actionText = `Cast ${spell.name} (Healed: ${damage} HP)`;
  } else if (spell.primaryCategory === "Drain") {
    if (isPlayer1) {
      state.player2Hp = Math.max(0, state.player2Hp - damage);
      state.player1Hp = Math.min(100, state.player1Hp + Math.round(damage * 0.5));
    } else {
      state.player1Hp = Math.max(0, state.player1Hp - damage);
      state.player2Hp = Math.min(100, state.player2Hp + Math.round(damage * 0.5));
    }
    actionText = `Cast ${spell.name} (Drained: ${damage} HP, Restored: ${Math.round(damage * 0.5)} HP)`;
  } else {
    if (isPlayer1) {
      state.player2Hp = Math.max(0, state.player2Hp - damage);
    } else {
      state.player1Hp = Math.max(0, state.player1Hp - damage);
    }
    actionText = `Cast ${spell.name} (damage: ${damage})`;
  }

  // Check Will threshold warnings
  const casterWill = isPlayer1 ? state.player1Will : state.player2Will;
  const willRatio = casterWill / casterWillCap;
  let willStatusText = "";
  if (willRatio >= 0.9) {
    willStatusText = " — Will is Broken!";
  } else if (willRatio >= 0.7) {
    willStatusText = " — Will is Failing";
  } else if (willRatio >= 0.4) {
    willStatusText = " — Will is Strained";
  }

  // 3. Log the action
  const actorName = isPlayer1 ? "Player 1" : "Player 2";
  const logEntry = {
    turn: state.currentTurn,
    action: `${actorName}: ${actionText}${willStatusText} (accuracy: ${(minigameAccuracy * 100).toFixed(0)}%)`,
    timestamp: Date.now(),
    actor: casterId,
  };
  state.battleLog.push(logEntry);

  // 4. Check win conditions
  if (state.player1Hp === 0) {
    state.status = "finished";
    state.winner = state.player2Id;
  } else if (state.player2Hp === 0) {
    state.status = "finished";
    state.winner = state.player1Id;
  }

  // 5. Flip active player and increment turn
  state.activePlayer = state.activePlayer === 1 ? 2 : 1;
  state.currentTurn += 1;
  state.lastActivityAt = Date.now();

  return state;
}

function checkAndTriggerBotTurn(state: BattleState, io: SocketIOServer | null) {
  if (state.activePlayer === 2 && state.player2Id === -1 && state.status === "active") {
    setTimeout(async () => {
      try {
        const battleId = state.battleId;
        const freshState = (await redisService.getBattleState(battleId)) as BattleState | null;
        if (!freshState || freshState.activePlayer !== 2 || freshState.status !== "active") {
          return;
        }

        const botSpells = await getPlatformSpells();
        const affordableSpells = botSpells.filter((s) => s.mpCost <= freshState.player2Mp);

        if (affordableSpells.length > 0) {
          const selectedSpell = affordableSpells[Math.floor(Math.random() * affordableSpells.length)];
          const accuracy = 0.5 + Math.random() * 0.3; // 50-80% mid-accuracy
          await resolveCast(freshState, -1, selectedSpell.id, accuracy);
        } else {
          freshState.battleLog.push({
            turn: freshState.currentTurn,
            action: "Bot Opponent: Passed turn (insufficient MP)",
            timestamp: Date.now(),
            actor: -1,
          });
          freshState.activePlayer = 1;
          freshState.currentTurn += 1;
          freshState.lastActivityAt = Date.now();
        }

        await redisService.setBattleState(battleId, freshState);
        if ((freshState.status as string) === "finished") {
          await persistBattleToDb(freshState);
        }

        if (io) {
          io.to(`battle:${battleId}`).emit("battle_state", freshState);
        }
      } catch (error) {
        console.error("[Bot AI] Turn error:", error);
      }
    }, 1500);
  }
}

export const gameRouter = router({
  createBotBattle: protectedProcedure
    .input(z.object({ terrain: z.enum(TERRAINS as unknown as [string, ...string[]]) }))
    .mutation(async ({ ctx, input }) => {
      const botId = -1;
      const state = await createBattleState(ctx.user.id, botId, input.terrain);

      checkAndTriggerBotTurn(state, ctx.io);

      return {
        battleId: state.battleId,
        terrain: state.terrain,
        player1Id: state.player1Id,
        player2Id: state.player2Id,
      };
    }),

  getBattleState: protectedProcedure
    .input(z.object({ battleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const state = (await redisService.getBattleState(input.battleId)) as BattleState | null;

      if (!state) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Battle not found" });
      }

      if (state.player1Id !== ctx.user.id && state.player2Id !== ctx.user.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }

      return state;
    }),

  castSpell: protectedProcedure
    .input(
      z.object({
        battleId: z.string(),
        spellId: z.string(),
        minigameAccuracy: z.number().min(0).max(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const state = (await redisService.getBattleState(input.battleId)) as BattleState | null;

      if (!state) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Battle not found" });
      }

      const isPlayer1 = state.player1Id === ctx.user.id;
      const isPlayer2 = state.player2Id === ctx.user.id;

      if (!isPlayer1 && !isPlayer2) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }

      const activePlayerId = state.activePlayer === 1 ? state.player1Id : state.player2Id;
      if (activePlayerId !== ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not your turn" });
      }

      const updatedState = await resolveCast(state, ctx.user.id, input.spellId, input.minigameAccuracy);

      await redisService.setBattleState(input.battleId, updatedState);

      if (updatedState.status === "finished") {
        await persistBattleToDb(updatedState);
      }

      // Broadcast new state via Socket
      if (ctx.io) {
        ctx.io.to(`battle:${input.battleId}`).emit("battle_state", updatedState);
      }

      // Trigger bot turn if next player is bot
      checkAndTriggerBotTurn(updatedState, ctx.io);

      return {
        success: true,
        battleState: updatedState,
      };
    }),

  endTurn: protectedProcedure
    .input(z.object({ battleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const state = (await redisService.getBattleState(input.battleId)) as BattleState | null;

      if (!state) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Battle not found" });
      }

      const activePlayerId = state.activePlayer === 1 ? state.player1Id : state.player2Id;
      if (activePlayerId !== ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not your turn" });
      }

      const actorName = state.player1Id === ctx.user.id ? "Player 1" : "Player 2";
      const logEntry = {
        turn: state.currentTurn,
        action: `${actorName}: Passed turn`,
        timestamp: Date.now(),
        actor: ctx.user.id,
      };

      state.battleLog.push(logEntry);

      state.activePlayer = state.activePlayer === 1 ? 2 : 1;
      state.currentTurn += 1;
      state.lastActivityAt = Date.now();

      await redisService.setBattleState(input.battleId, state);

      if (ctx.io) {
        ctx.io.to(`battle:${input.battleId}`).emit("battle_state", state);
      }

      checkAndTriggerBotTurn(state, ctx.io);

      return { success: true, battleState: state };
    }),

  forfeit: protectedProcedure
    .input(z.object({ battleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const state = (await redisService.getBattleState(input.battleId)) as BattleState | null;

      if (!state) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Battle not found" });
      }

      const isPlayer1 = state.player1Id === ctx.user.id;
      const isPlayer2 = state.player2Id === ctx.user.id;

      if (!isPlayer1 && !isPlayer2) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }

      state.status = "finished";
      state.winner = isPlayer1 ? state.player2Id : state.player1Id;

      const actorName = isPlayer1 ? "Player 1" : "Player 2";
      const logEntry = {
        turn: state.currentTurn,
        action: `${actorName}: Forfeited`,
        timestamp: Date.now(),
        actor: ctx.user.id,
      };

      state.battleLog.push(logEntry);

      await redisService.setBattleState(input.battleId, state);
      await persistBattleToDb(state);

      if (ctx.io) {
        ctx.io.to(`battle:${input.battleId}`).emit("battle_state", state);
      }

      return { success: true, battleState: state };
    }),

  getRecentBattles: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    try {
      const userBattles = await db
        .select()
        .from(battles)
        .where(
          or(
            eq(battles.player1Id, ctx.user.id),
            eq(battles.player2Id, ctx.user.id)
          )
        )
        .orderBy(desc(battles.createdAt))
        .limit(10);

      return userBattles;
    } catch (error) {
      console.error("[Battle] Failed to fetch recent battles:", error);
      return [];
    }
  }),
});

