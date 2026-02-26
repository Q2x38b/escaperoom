import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useGameStore } from "../stores/gameStore";

// Generate a unique identifier for this browser session
function getOrCreateIdentifier(): string {
  const key = "escape-room-identifier";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export interface UseRoomReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  roomCode: string | null;
  createRoom: (nickname: string) => Promise<void>;
  joinRoom: (roomCode: string, nickname: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  clearError: () => void;
  startGame: () => Promise<void>;
  submitPuzzleAnswer: (
    puzzleIndex: number,
    answer: string
  ) => Promise<{ correct: boolean; finalPasscode?: string; completionTime?: number }>;
  syncInput: (key: string, value: string) => void;
  sendChatMessage: (message: string) => void;
  validateEntry: (passcode: string) => Promise<boolean>;
  deleteRoomData: () => Promise<void>;
}

export function useRoom(): UseRoomReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<Id<"rooms"> | null>(null);
  const [identifier] = useState(() => getOrCreateIdentifier());

  const {
    setRoom,
    updatePlayers,
    startGame: storeStartGame,
    solvePuzzle,
    setVictory,
    addChatMessage,
    updateSharedInput,
    setPhase,
  } = useGameStore();

  // Convex mutations
  const createRoomMutation = useMutation(api.rooms.createRoom);
  const joinRoomMutation = useMutation(api.rooms.joinRoom);
  const leaveRoomMutation = useMutation(api.rooms.leaveRoom);
  const startGameMutation = useMutation(api.game.startGame);
  const submitAnswerMutation = useMutation(api.game.submitPuzzleAnswer);
  const updateInputMutation = useMutation(api.game.updateSharedInput);
  const sendMessageMutation = useMutation(api.game.sendChatMessage);
  const validateEntryMutation = useMutation(api.game.validateEntry);
  const deleteRoomMutation = useMutation(api.game.deleteRoom);

  // Convex queries (reactive)
  const roomData = useQuery(
    api.rooms.getRoom,
    roomId ? { roomId } : "skip"
  );

  // Sync room data to store
  useEffect(() => {
    if (roomData) {
      // Update players
      const players = roomData.players.map((p) => ({
        id: p.odentifier,
        nickname: p.nickname,
        isHost: p.isHost,
        isReady: p.isReady,
      }));
      updatePlayers(players);

      // Update shared inputs
      Object.entries(roomData.sharedInputs).forEach(([key, value]) => {
        updateSharedInput(key, value);
      });

      // Update solved puzzles
      roomData.solvedPuzzles.forEach((idx) => solvePuzzle(idx));

      // Update game phase
      if (roomData.phase === "playing" && roomData.startTime) {
        storeStartGame(roomData.startTime);
      } else if (roomData.phase === "victory" && roomData.finalPasscode && roomData.completionTime) {
        setVictory(roomData.finalPasscode, roomData.completionTime);
      } else if (roomData.phase === "waiting") {
        setPhase("waiting");
      }
    }
  }, [roomData, updatePlayers, updateSharedInput, solvePuzzle, storeStartGame, setVictory, setPhase]);

  const clearError = useCallback(() => {
    setConnectionError(null);
  }, []);

  const createRoom = useCallback(
    async (nickname: string) => {
      setIsConnecting(true);
      setConnectionError(null);

      try {
        const result = await createRoomMutation({
          nickname,
          odentifier: identifier,
        });

        setRoomId(result.roomId);
        setRoom(result.code, identifier, true);
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : "Failed to create room"
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [createRoomMutation, identifier, setRoom]
  );

  const joinRoom = useCallback(
    async (code: string, nickname: string) => {
      setIsConnecting(true);
      setConnectionError(null);

      try {
        const result = await joinRoomMutation({
          code: code.toUpperCase(),
          nickname,
          odentifier: identifier,
        });

        setRoomId(result.roomId);
        setRoom(result.code, identifier, false);
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : "Failed to join room"
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [joinRoomMutation, identifier, setRoom]
  );

  const leaveRoom = useCallback(async () => {
    if (!roomId) return;

    try {
      await leaveRoomMutation({
        roomId,
        odentifier: identifier,
      });
      setRoomId(null);
    } catch (error) {
      console.error("Failed to leave room:", error);
    }
  }, [roomId, identifier, leaveRoomMutation]);

  const startGame = useCallback(async () => {
    if (!roomId) return;

    try {
      await startGameMutation({
        roomId,
        odentifier: identifier,
      });
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Failed to start game"
      );
    }
  }, [roomId, identifier, startGameMutation]);

  const submitPuzzleAnswer = useCallback(
    async (puzzleIndex: number, answer: string) => {
      if (!roomId) return { correct: false };

      try {
        const result = await submitAnswerMutation({
          roomId,
          puzzleIndex,
          answer,
        });

        return result;
      } catch (error) {
        console.error("Failed to submit answer:", error);
        return { correct: false };
      }
    },
    [roomId, submitAnswerMutation]
  );

  const syncInput = useCallback(
    (key: string, value: string) => {
      if (!roomId) return;

      // Update local state immediately
      updateSharedInput(key, value);

      // Sync to Convex
      updateInputMutation({
        roomId,
        key,
        value,
      }).catch((error) => {
        console.error("Failed to sync input:", error);
      });
    },
    [roomId, updateSharedInput, updateInputMutation]
  );

  const sendChatMessage = useCallback(
    (message: string) => {
      if (!roomId) return;

      const playerName =
        useGameStore.getState().players.find((p) => p.id === identifier)
          ?.nickname || "Unknown";

      // Add to local store immediately
      addChatMessage({
        id: crypto.randomUUID(),
        playerId: identifier,
        playerName,
        message,
        timestamp: Date.now(),
      });

      // Send to Convex
      sendMessageMutation({
        roomId,
        playerId: identifier,
        playerName,
        message,
      }).catch((error) => {
        console.error("Failed to send message:", error);
      });
    },
    [roomId, identifier, addChatMessage, sendMessageMutation]
  );

  const validateEntry = useCallback(
    async (passcode: string) => {
      try {
        return await validateEntryMutation({ passcode });
      } catch (error) {
        console.error("Failed to validate entry:", error);
        return false;
      }
    },
    [validateEntryMutation]
  );

  const deleteRoomData = useCallback(async () => {
    if (!roomId) return;

    try {
      await deleteRoomMutation({ roomId });
      setRoomId(null);
    } catch (error) {
      console.error("Failed to delete room:", error);
    }
  }, [roomId, deleteRoomMutation]);

  return {
    isConnected: roomId !== null && roomData !== undefined,
    isConnecting,
    connectionError,
    roomCode: roomData?.code || null,
    createRoom,
    joinRoom,
    leaveRoom,
    clearError,
    startGame,
    submitPuzzleAnswer,
    syncInput,
    sendChatMessage,
    validateEntry,
    deleteRoomData,
  };
}
