import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, GamePhase, ChatMessage } from '../types/game';

interface GameStore {
  // Connection state
  isConnected: boolean;
  roomId: string | null;
  playerId: string | null;
  isHost: boolean;

  // Game phase
  phase: GamePhase;

  // Players
  players: Player[];

  // Progress
  currentPuzzle: number;
  solvedPuzzles: number[];
  startTime: number | null;

  // Victory
  finalPasscode: string | null;
  completionTime: number | null;

  // Chat
  chatMessages: ChatMessage[];

  // Shared inputs for collaboration
  sharedInputs: Record<string, string>;

  // Session restoration
  savedRoomId: string | null;
  savedNickname: string | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setPhase: (phase: GamePhase) => void;
  setRoom: (roomId: string, playerId: string, isHost: boolean) => void;
  setHost: (isHost: boolean) => void;
  updatePlayers: (players: Player[]) => void;
  startGame: (startTime: number) => void;
  solvePuzzle: (puzzleIndex: number) => void;
  setCurrentPuzzle: (puzzleIndex: number) => void;
  setVictory: (passcode: string, completionTime: number) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  updateSharedInput: (key: string, value: string) => void;
  saveSession: (roomId: string, nickname: string) => void;
  clearSession: () => void;
  reset: () => void;
}

const initialState = {
  isConnected: false,
  roomId: null,
  playerId: null,
  isHost: false,
  phase: 'entry' as GamePhase,
  players: [],
  currentPuzzle: 0,
  solvedPuzzles: [],
  startTime: null,
  finalPasscode: null,
  completionTime: null,
  chatMessages: [],
  sharedInputs: {},
  savedRoomId: null,
  savedNickname: null,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...initialState,

      setConnected: (isConnected) => set({ isConnected }),

      setPhase: (phase) => set({ phase }),

      setRoom: (roomId, playerId, isHost) => set({
        roomId,
        playerId,
        isHost,
        phase: 'waiting',
      }),

      setHost: (isHost) => set({ isHost }),

      updatePlayers: (players) => set({ players }),

      startGame: (startTime) => set({
        phase: 'playing',
        startTime,
        currentPuzzle: 0,
        solvedPuzzles: [],
      }),

      solvePuzzle: (puzzleIndex) => set((state) => ({
        solvedPuzzles: state.solvedPuzzles.includes(puzzleIndex)
          ? state.solvedPuzzles
          : [...state.solvedPuzzles, puzzleIndex],
        // Only advance currentPuzzle forward, never backward
        currentPuzzle: Math.max(state.currentPuzzle, puzzleIndex + 1),
      })),

      setCurrentPuzzle: (puzzleIndex) => set({ currentPuzzle: puzzleIndex }),

      setVictory: (passcode, completionTime) => set({
        phase: 'victory',
        finalPasscode: passcode,
        completionTime,
      }),

      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, message],
      })),

      setChatMessages: (messages) => set({ chatMessages: messages }),

      updateSharedInput: (key, value) => set((state) => ({
        sharedInputs: { ...state.sharedInputs, [key]: value },
      })),

      saveSession: (roomId, nickname) => set({
        savedRoomId: roomId,
        savedNickname: nickname,
      }),

      clearSession: () => set({
        savedRoomId: null,
        savedNickname: null,
      }),

      reset: () => set({
        ...initialState,
        // Keep savedRoomId and savedNickname null after reset
        savedRoomId: null,
        savedNickname: null,
      }),
    }),
    {
      name: 'escape-room-game-state',
      // Only persist specific fields needed for session restoration
      partialize: (state) => ({
        savedRoomId: state.savedRoomId,
        savedNickname: state.savedNickname,
        phase: state.phase,
      }),
    }
  )
);
