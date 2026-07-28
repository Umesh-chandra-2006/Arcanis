import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getDb } from "./db";
import { getRedisService } from "./redis-service";

interface BattleRoom {
  battleId: string;
  player1Id: number;
  player2Id: number;
  player1Socket: string;
  player2Socket: string;
  disconnectTimeouts: Record<string, NodeJS.Timeout>;
}

const battleRooms = new Map<string, BattleRoom>();

import { verifyTokenAndGetUser } from "./auth-service";

export function initializeSocketIO(httpServer: HTTPServer) {
  const redis = getRedisService();

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }
      const user = await verifyTokenAndGetUser(token);
      if (!user) {
        return next(new Error("Authentication error: Invalid token"));
      }
      (socket as any).user = user;
      next();
    } catch (err) {
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const socketUser = (socket as any).user;
    console.log(`[Socket.io] Authenticated user connected: ${socketUser?.username} (${socket.id})`);

    socket.on("join_battle", async (data: { battleId: string; userId: number }) => {
      try {
        const { battleId, userId } = data;
        const room = `battle:${battleId}`;

        socket.join(room);
        console.log(`[Socket.io] User ${userId} joined battle ${battleId}`);

        const battleState = await redis.getBattleState(battleId);
        if (battleState) {
          socket.emit("battle_state", battleState);
        }

        socket.to(room).emit("opponent_connected");

        if (!battleRooms.has(battleId)) {
          battleRooms.set(battleId, {
            battleId,
            player1Id: 0,
            player2Id: 0,
            player1Socket: "",
            player2Socket: "",
            disconnectTimeouts: {},
          });
        }

        const battleRoom = battleRooms.get(battleId)!;
        if ((battleState as any)?.player1Id === userId) {
          battleRoom.player1Socket = socket.id;
        } else {
          battleRoom.player2Socket = socket.id;
        }

        if (battleRoom.disconnectTimeouts[socket.id]) {
          clearTimeout(battleRoom.disconnectTimeouts[socket.id]);
          delete battleRoom.disconnectTimeouts[socket.id];
        }
      } catch (error) {
        console.error("[Socket.io] Error joining battle:", error);
        socket.emit("error", { message: "Failed to join battle" });
      }
    });

    socket.on("cast_spell", async (data: { battleId: string; spellId: string; accuracy: number }) => {
      try {
        const { battleId, spellId, accuracy } = data;
        const room = `battle:${battleId}`;

        const battleState = await redis.getBattleState(battleId);
        if (!battleState) {
          socket.emit("error", { message: "Battle not found" });
          return;
        }

        io.to(room).emit("spell_cast", {
          playerId: (battleState as any).currentTurnPlayerId,
          spellId,
          accuracy,
        });
      } catch (error) {
        console.error("[Socket.io] Error casting spell:", error);
        socket.emit("error", { message: "Failed to cast spell" });
      }
    });

    socket.on("end_turn", async (data: { battleId: string }) => {
      try {
        const { battleId } = data;
        const room = `battle:${battleId}`;

        const battleState = await redis.getBattleState(battleId);
        if (!battleState) {
          socket.emit("error", { message: "Battle not found" });
          return;
        }

        const updatedState = {
          ...battleState,
          currentTurnPlayerId: (battleState as any).currentTurnPlayerId === (battleState as any).player1Id ? (battleState as any).player2Id : (battleState as any).player1Id,
          turnCount: ((battleState as any).turnCount || 0) + 1,
        };

        await redis.setBattleState(battleId, updatedState);

        io.to(room).emit("battle_state", updatedState);
        io.to(room).emit("turn_changed", {
          currentPlayerId: (updatedState as any).currentTurnPlayerId,
          turnCount: (updatedState as any).turnCount,
        });
      } catch (error) {
        console.error("[Socket.io] Error ending turn:", error);
        socket.emit("error", { message: "Failed to end turn" });
      }
    });

    socket.on("forfeit", async (data: { battleId: string; userId: number }) => {
      try {
        const { battleId, userId } = data;
        const room = `battle:${battleId}`;

        const battleState = await redis.getBattleState(battleId);
        if (!battleState) {
          socket.emit("error", { message: "Battle not found" });
          return;
        }

        const winnerId = (battleState as any).player1Id === userId ? (battleState as any).player2Id : (battleState as any).player1Id;

        const updatedState = {
          ...battleState,
          status: "finished",
          winnerId,
          endedAt: new Date(),
        };

        await redis.deleteBattleState(battleId);

        io.to(room).emit("battle_finished", {
          winnerId,
          status: "finished",
        });

        io.to(room).disconnectSockets();
      } catch (error) {
        console.error("[Socket.io] Error forfeiting:", error);
        socket.emit("error", { message: "Failed to forfeit" });
      }
    });

    socket.on("disconnect", async () => {
      console.log(`[Socket.io] User disconnected: ${socket.id}`);

      const battleIds = Array.from(battleRooms.keys());
      for (const battleId of battleIds) {
        const battleRoom = battleRooms.get(battleId);
        if (!battleRoom) continue;

        if (battleRoom.player1Socket === socket.id || battleRoom.player2Socket === socket.id) {
          const room = `battle:${battleId}`;

          const timeoutId = setTimeout(async () => {
            const battleState = await redis.getBattleState(battleId);
            if (battleState && (battleState as any).status === "active") {
              const disconnectedPlayerId = battleRoom.player1Socket === socket.id ? (battleState as any).player1Id : (battleState as any).player2Id;
              const winnerId = (battleState as any).player1Id === disconnectedPlayerId ? (battleState as any).player2Id : (battleState as any).player1Id;

              await redis.deleteBattleState(battleId);
              io.to(room).emit("battle_finished", {
                winnerId,
                status: "finished",
                reason: "opponent_disconnected",
              });

              io.to(room).disconnectSockets();
            }

            battleRooms.delete(battleId);
          }, 60000);

          battleRoom.disconnectTimeouts[socket.id] = timeoutId;

          io.to(room).emit("opponent_disconnected", {
            timeoutMs: 60000,
          });

          break;
        }
      }
    });
  });

  return io;
}
