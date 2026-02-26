import { create } from 'zustand';
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

  // Actions
  setConnected: (connected: boolean) => void;
  setPhase: (phase: GamePhase) => void;
  setRoom: (roomId: string, playerId: string, isHost: boolean) => void;
  updatePlayers: (players: Player[]) => void;
  startGame: (startTime: number) => void;
  solvePuzzle: (puzzleIndex: number) => void;
  setVictory: (passcode: string, completionTime: number) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateSharedInput: (key: string, value: string) => void;
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
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setConnected: (isConnected) => set({ isConnected }),

  setPhase: (phase) => set({ phase }),

  setRoom: (roomId, playerId, isHost) => set({
    roomId,
    playerId,
    isHost,
    phase: 'waiting',
  }),

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
    currentPuzzle: puzzleIndex + 1,
  })),

  setVictory: (passcode, completionTime) => set({
    phase: 'victory',
    finalPasscode: passcode,
    completionTime,
  }),

  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message],
  })),

  updateSharedInput: (key, value) => set((state) => ({
    sharedInputs: { ...state.sharedInputs, [key]: value },
  })),

  reset: () => set(initialState),
}));
