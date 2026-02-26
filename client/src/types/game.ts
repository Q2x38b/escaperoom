export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  isReady?: boolean;
}

export interface GameState {
  currentPuzzle: number;
  solvedPuzzles: number[];
  startTime: number | null;
  endTime: number | null;
  sharedInputs: Record<string, string>;
}

export type GamePhase = 'entry' | 'lobby' | 'waiting' | 'playing' | 'victory';

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface PuzzleInfo {
  index: number;
  title: string;
  description: string;
  encryptedContent: string | string[];
  cipherType: 'base64' | 'hex' | 'binary';
  storyContext: string;
  inputPlaceholder: string;
}
