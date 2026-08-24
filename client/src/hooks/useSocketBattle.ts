import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface BattleEvent {
  type: "state_update" | "spell_cast" | "turn_changed" | "opponent_disconnected" | "battle_finished" | "error";
  data: any;
}

export function useSocketBattle(battleId: string, userId: number | undefined) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [battleState, setBattleState] = useState<any | null>(null);
  const [battleEvents, setBattleEvents] = useState<BattleEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!battleId || !userId) return;

    const token = localStorage.getItem("auth_token");

    // Create socket connection with JWT authentication token
    const newSocket = io(window.location.origin, {
      path: "/socket.io",
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      console.log("[Socket] Connected");
      setIsConnected(true);

      // Join battle room
      newSocket.emit("join_battle", { battleId, userId });
    });

    newSocket.on("battle_state", (state) => {
      console.log("[Socket] Received battle state:", state);
      setBattleState(state);
      setBattleEvents((prev) => [...prev, { type: "state_update" as const, data: state }].slice(-50));
    });

    newSocket.on("spell_cast", (data) => {
      setBattleEvents((prev) => [...prev, { type: "spell_cast" as const, data }].slice(-50));
    });

    newSocket.on("turn_changed", (data) => {
      setBattleEvents((prev) => [...prev, { type: "turn_changed" as const, data }].slice(-50));
    });

    newSocket.on("opponent_disconnected", (data) => {
      setBattleEvents((prev) => [...prev, { type: "opponent_disconnected" as const, data }].slice(-50));
    });

    newSocket.on("battle_finished", (data) => {
      setBattleEvents((prev) => [...prev, { type: "battle_finished" as const, data }].slice(-50));
    });

    newSocket.on("error", (error) => {
      console.error("[Socket] Error:", error);
      setBattleEvents((prev) => [...prev, { type: "error" as const, data: error }].slice(-50));
    });

    newSocket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [battleId, userId]);

  const castSpell = (spellId: string, accuracy: number) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("cast_spell", { battleId, spellId, accuracy });
    }
  };

  const endTurn = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("end_turn", { battleId });
    }
  };

  const forfeit = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("forfeit", { battleId, userId });
    }
  };

  return {
    socket,
    isConnected,
    battleState,
    battleEvents,
    castSpell,
    endTurn,
    forfeit,
  };
}
