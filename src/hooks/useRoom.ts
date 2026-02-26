import { useCallback, useEffect, useState, useRef } from "react";
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

export interface TypingPlayer {
  odentifier: string;
  nickname: string;
  puzzleIndex: number;
  timestamp: number;
}

export interface UseRoomReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isRestoring: boolean;
  connectionError: string | null;
  roomCode: string | null;
  isLocked: boolean;
  typingPlayer: TypingPlayer | null;
  currentPlayerId: string;
  createRoom: (nickname: string) => Promise<void>;
  joinRoom: (roomCode: string, nickname: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  clearError: () => void;
  startGame: () => Promise<void>;
  endGame: () => Promise<void>;
  setRoomLock: (isLocked: boolean) => Promise<void>;
  submitPuzzleAnswer: (
    puzzleIndex: number,
    answer: string
  ) => Promise<{ correct: boolean; finalPasscode?: string; completionTime?: number }>;
  syncInput: (key: string, value: string) => void;
  claimTyping: (puzzleIndex: number) => Promise<boolean>;
  releaseTyping: () => void;
  sendChatMessage: (message: string) => void;
  validateEntry: (passcode: string) => Promise<boolean>;
  deleteRoomData: () => Promise<void>;
  kickPlayer: (targetIdentifier: string) => Promise<{ success: boolean; kickedPlayer?: string }>;
  closeRoom: () => Promise<void>;
}

export function useRoom(): UseRoomReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<Id<"rooms"> | null>(null);
  const [identifier] = useState(() => getOrCreateIdentifier());
  const hasAttemptedRestore = useRef(false);

  const {
    setRoom,
    setHost,
    updatePlayers,
    startGame: storeStartGame,
    solvePuzzle,
    setCurrentPuzzle,
    setVictory,
    addChatMessage,
    setChatMessages,
    updateSharedInput,
    setPhase,
    saveSession,
    clearSession,
    savedRoomId,
    savedNickname,
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
  const heartbeatMutation = useMutation(api.rooms.heartbeat);
  const setTypingMutation = useMutation(api.game.setTypingStatus);
  const clearTypingMutation = useMutation(api.game.clearTypingStatus);
  const kickPlayerMutation = useMutation(api.rooms.kickPlayer);
  const closeRoomMutation = useMutation(api.rooms.closeRoom);
  const setRoomLockMutation = useMutation(api.rooms.setRoomLock);
  const endGameMutation = useMutation(api.rooms.endGame);

  // Convex queries (reactive)
  const roomData = useQuery(
    api.rooms.getRoom,
    roomId ? { roomId } : "skip"
  );

  // Query chat messages from Convex
  const chatMessagesData = useQuery(
    api.game.getChatMessages,
    roomId ? { roomId } : "skip"
  );

  // Attempt to restore session on mount
  useEffect(() => {
    if (hasAttemptedRestore.current) return;
    hasAttemptedRestore.current = true;

    const restoreSession = async () => {
      if (savedRoomId && savedNickname) {
        setIsRestoring(true);
        try {
          // Try to rejoin the room
          const result = await joinRoomMutation({
            code: savedRoomId,
            nickname: savedNickname,
            odentifier: identifier,
          });

          setRoomId(result.roomId);
          // Room data will sync via the query
        } catch (error) {
          // Room no longer exists, clear the saved session
          console.log("Could not restore session, room may no longer exist");
          clearSession();
          setPhase('entry');
        } finally {
          setIsRestoring(false);
        }
      }
    };

    restoreSession();
  }, [savedRoomId, savedNickname, joinRoomMutation, identifier, clearSession, setPhase]);

  // Heartbeat to keep player active
  useEffect(() => {
    if (!roomId) return;

    const sendHeartbeat = () => {
      heartbeatMutation({ roomId, odentifier: identifier }).catch(() => {
        // Room may no longer exist
      });
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [roomId, identifier, heartbeatMutation]);

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

      // Check if current player is still in the room
      const currentPlayer = roomData.players.find(p => p.odentifier === identifier);
      if (!currentPlayer && roomData.phase !== 'victory') {
        // Player was removed from room (kicked or room pruned)
        setRoomId(null);
        clearSession();
        setPhase('entry');
        return;
      }

      // Update host status from room data (fixes host status after reconnection)
      if (currentPlayer) {
        setHost(currentPlayer.isHost);
      }

      // Update shared inputs
      Object.entries(roomData.sharedInputs).forEach(([key, value]) => {
        updateSharedInput(key, value);
      });

      // Update solved puzzles
      roomData.solvedPuzzles.forEach((idx) => solvePuzzle(idx));

      // Sync current puzzle directly from room data to ensure all players see the same puzzle
      if (roomData.currentPuzzle !== undefined) {
        setCurrentPuzzle(roomData.currentPuzzle);
      }

      // Update game phase
      if (roomData.phase === "playing" && roomData.startTime) {
        storeStartGame(roomData.startTime);
      } else if (roomData.phase === "victory" && roomData.finalPasscode && roomData.completionTime) {
        setVictory(roomData.finalPasscode, roomData.completionTime);
      } else if (roomData.phase === "waiting") {
        setPhase("waiting");
      }
    } else if (roomData === null && roomId) {
      // Room was deleted
      setRoomId(null);
      clearSession();
      setPhase('entry');
    }
  }, [roomData, roomId, identifier, updatePlayers, updateSharedInput, solvePuzzle, setCurrentPuzzle, storeStartGame, setVictory, setPhase, clearSession, setHost]);

  // Sync chat messages from Convex
  useEffect(() => {
    if (chatMessagesData) {
      const messages = chatMessagesData.map((msg) => ({
        id: msg._id,
        playerId: msg.playerId,
        playerName: msg.playerName,
        message: msg.message,
        timestamp: msg.timestamp,
      }));
      setChatMessages(messages);
    }
  }, [chatMessagesData, setChatMessages]);

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
        saveSession(result.code, nickname);
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : "Failed to create room"
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [createRoomMutation, identifier, setRoom, saveSession]
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
        saveSession(result.code, nickname);
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : "Failed to join room"
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [joinRoomMutation, identifier, setRoom, saveSession]
  );

  const leaveRoom = useCallback(async () => {
    if (!roomId) return;

    try {
      await leaveRoomMutation({
        roomId,
        odentifier: identifier,
      });
      setRoomId(null);
      clearSession();
    } catch (error) {
      console.error("Failed to leave room:", error);
    }
  }, [roomId, identifier, leaveRoomMutation, clearSession]);

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

        // Immediately update local state on correct answer for instant feedback
        // Other players will sync via the reactive query
        if (result.correct) {
          solvePuzzle(puzzleIndex);

          // Clear shared inputs for this puzzle so next attempt starts fresh
          updateSharedInput(`puzzle${puzzleIndex}_answer`, '');

          // If victory, set the victory state immediately
          if (result.finalPasscode && result.completionTime) {
            setVictory(result.finalPasscode, result.completionTime);
          }
        }

        return result;
      } catch (error) {
        console.error("Failed to submit answer:", error);
        return { correct: false };
      }
    },
    [roomId, submitAnswerMutation, solvePuzzle, updateSharedInput, setVictory]
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
      clearSession();
    } catch (error) {
      console.error("Failed to delete room:", error);
    }
  }, [roomId, deleteRoomMutation, clearSession]);

  const claimTyping = useCallback(
    async (puzzleIndex: number) => {
      if (!roomId) return false;

      const playerName =
        useGameStore.getState().players.find((p) => p.id === identifier)
          ?.nickname || "Unknown";

      try {
        const result = await setTypingMutation({
          roomId,
          odentifier: identifier,
          nickname: playerName,
          puzzleIndex,
        });
        return !result.locked;
      } catch (error) {
        console.error("Failed to claim typing:", error);
        return false;
      }
    },
    [roomId, identifier, setTypingMutation]
  );

  const releaseTyping = useCallback(() => {
    if (!roomId) return;

    clearTypingMutation({
      roomId,
      odentifier: identifier,
    }).catch((error) => {
      console.error("Failed to release typing:", error);
    });
  }, [roomId, identifier, clearTypingMutation]);

  const kickPlayer = useCallback(
    async (targetIdentifier: string) => {
      if (!roomId) return { success: false };

      try {
        const result = await kickPlayerMutation({
          roomId,
          hostIdentifier: identifier,
          targetIdentifier,
        });
        return result;
      } catch (error) {
        console.error("Failed to kick player:", error);
        return { success: false };
      }
    },
    [roomId, identifier, kickPlayerMutation]
  );

  const closeRoom = useCallback(async () => {
    if (!roomId) return;

    try {
      await closeRoomMutation({
        roomId,
        hostIdentifier: identifier,
      });
      setRoomId(null);
      clearSession();
      setPhase("entry");
    } catch (error) {
      console.error("Failed to close room:", error);
    }
  }, [roomId, identifier, closeRoomMutation, clearSession, setPhase]);

  const endGame = useCallback(async () => {
    if (!roomId) return;

    try {
      await endGameMutation({
        roomId,
        hostIdentifier: identifier,
      });
      // Room state will update via the reactive query
    } catch (error) {
      console.error("Failed to end game:", error);
    }
  }, [roomId, identifier, endGameMutation]);

  const setRoomLock = useCallback(async (isLocked: boolean) => {
    if (!roomId) return;

    try {
      await setRoomLockMutation({
        roomId,
        hostIdentifier: identifier,
        isLocked,
      });
    } catch (error) {
      console.error("Failed to set room lock:", error);
    }
  }, [roomId, identifier, setRoomLockMutation]);

  // Get typing player from room data
  const typingPlayer = roomData?.typingPlayer || null;
  const isLocked = roomData?.isLocked || false;

  return {
    isConnected: roomId !== null && roomData !== undefined,
    isConnecting,
    isRestoring,
    connectionError,
    roomCode: roomData?.code || null,
    isLocked,
    typingPlayer,
    currentPlayerId: identifier,
    createRoom,
    joinRoom,
    leaveRoom,
    clearError,
    startGame,
    endGame,
    setRoomLock,
    submitPuzzleAnswer,
    syncInput,
    claimTyping,
    releaseTyping,
    sendChatMessage,
    validateEntry,
    deleteRoomData,
    kickPlayer,
    closeRoom,
  };
}
