import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getRedisService } from "./redis-service";
import { persistBattleToDb } from "./routers/game";

interface BattleRoom {
  battleId: string;
  player1Id: number;
  player2Id: number;
  player1Socket: string;
  player2Socket: string;
  disconnectTimeouts: Record<string, NodeJS.Timeout>;
}

interface SocketUser {
  id: number;
  username: string;
  avatar: string;
  email: string;
}

interface BattleStateSnapshot {
  status: string;
  player1Id: number;
  player2Id: number;
  activePlayer: 1 | 2;
  winner?: number;
  [key: string]: unknown;
}

const battleRooms = new Map<string, BattleRoom>();

import { verifyTokenAndGetUser } from "./auth-service";
import { persistBattleToDb } from "./routers/game";

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
      (socket as Socket & { user: SocketUser }).user = user as SocketUser;
      next();
    } catch (err) {
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const socketUser = (socket as Socket & { user: SocketUser }).user;
    console.log(`[Socket.io] Authenticated user connected: ${socketUser?.username} (${socket.id})`);

    socket.on("join_battle", async (data: { battleId: string; userId: number }) => {
      try {
        const { battleId, userId } = data;
        const room = `battle:${battleId}`;

        socket.join(room);
        console.log(`[Socket.io] User ${userId} joined battle ${battleId}`);

        const battleState = (await redis.getBattleState(battleId)) as BattleStateSnapshot | null;
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
        if (battleState?.player1Id === userId) {
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
      socket.emit("error", { message: "Use the tRPC castSpell mutation instead of socket events" });
    });

    socket.on("end_turn", async (data: { battleId: string }) => {
      socket.emit("error", { message: "Use the tRPC endTurn mutation instead of socket events" });
    });

    socket.on("forfeit", async (data: { battleId: string }) => {
      socket.emit("error", { message: "Use the tRPC forfeit mutation instead of socket events" });
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
            const battleState = (await redis.getBattleState(battleId)) as BattleStateSnapshot | null;
            if (battleState && battleState.status === "active") {
              const disconnectedPlayerId = battleRoom.player1Socket === socket.id ? battleState.player1Id : battleState.player2Id;
              const winnerId = battleState.player1Id === disconnectedPlayerId ? battleState.player2Id : battleState.player1Id;

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
