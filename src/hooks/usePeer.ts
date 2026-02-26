import { useEffect, useRef, useCallback, useState } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '../stores/gameStore';
import type { Player, ChatMessage } from '../types/game';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface PeerMessage {
  type: 'player-joined' | 'player-left' | 'game-start' | 'puzzle-solved' | 'sync-input' | 'chat' | 'sync-state';
  payload: unknown;
}

interface UsePeerReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  roomCode: string | null;
  createRoom: (nickname: string) => void;
  joinRoom: (roomCode: string, nickname: string) => void;
  clearError: () => void;
  startGame: () => void;
  submitPuzzleAttempt: (puzzleIndex: number, answer: string) => Promise<{ correct: boolean; finalPasscode?: string }>;
  requestHint: (puzzleIndex: number, hintIndex: number) => Promise<string | null>;
  syncInput: (key: string, value: string) => void;
  sendChatMessage: (message: string) => void;
  validateEntry: (passcode: string) => Promise<boolean>;
}

export function usePeer(): UsePeerReturn {
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const hostConnectionRef = useRef<DataConnection | null>(null);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearError = useCallback(() => {
    setConnectionError(null);
  }, []);

  const {
    setRoom,
    updatePlayers,
    startGame: storeStartGame,
    solvePuzzle,
    setVictory,
    addChatMessage,
    updateSharedInput,
  } = useGameStore();

  // Broadcast message to all connected peers
  const broadcast = useCallback((message: PeerMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }, []);

  // Send current game state to a new player
  const sendGameState = useCallback((conn: DataConnection) => {
    conn.send({
      type: 'sync-state',
      payload: {
        players: useGameStore.getState().players,
        solvedPuzzles: useGameStore.getState().solvedPuzzles,
        currentPuzzle: useGameStore.getState().currentPuzzle,
        sharedInputs: useGameStore.getState().sharedInputs,
        startTime: useGameStore.getState().startTime,
        phase: useGameStore.getState().phase,
      },
    });
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((message: PeerMessage) => {
    switch (message.type) {
      case 'player-joined': {
        const { players: newPlayers } = message.payload as { players: Player[] };
        updatePlayers(newPlayers);
        break;
      }
      case 'player-left': {
        const { players: remainingPlayers } = message.payload as { players: Player[] };
        updatePlayers(remainingPlayers);
        break;
      }
      case 'game-start': {
        const { startTime: gameStartTime } = message.payload as { startTime: number };
        storeStartGame(gameStartTime);
        break;
      }
      case 'puzzle-solved': {
        const { puzzleIndex, finalPasscode, completionTime } = message.payload as {
          puzzleIndex: number;
          finalPasscode?: string;
          completionTime?: number;
        };
        solvePuzzle(puzzleIndex);
        if (finalPasscode && completionTime !== undefined) {
          setVictory(finalPasscode, completionTime);
        }
        break;
      }
      case 'sync-input': {
        const { key, value } = message.payload as { key: string; value: string };
        updateSharedInput(key, value);
        break;
      }
      case 'chat': {
        const chatMessage = message.payload as ChatMessage;
        addChatMessage(chatMessage);
        break;
      }
      case 'sync-state': {
        const state = message.payload as {
          players: Player[];
          solvedPuzzles: number[];
          currentPuzzle: number;
          sharedInputs: Record<string, string>;
          startTime: number | null;
          phase: string;
        };
        updatePlayers(state.players);
        state.solvedPuzzles.forEach((idx) => solvePuzzle(idx));
        Object.entries(state.sharedInputs).forEach(([key, value]) => {
          updateSharedInput(key, value);
        });
        if (state.startTime && state.phase === 'playing') {
          storeStartGame(state.startTime);
        }
        break;
      }
    }
  }, [updatePlayers, storeStartGame, solvePuzzle, setVictory, updateSharedInput, addChatMessage]);

  // Setup connection handlers
  const setupConnection = useCallback((conn: DataConnection, isIncoming: boolean) => {
    conn.on('open', () => {
      console.log('Connection opened with:', conn.peer);
      connectionsRef.current.set(conn.peer, conn);

      if (isIncoming && useGameStore.getState().isHost) {
        // Host sends current state to new player
        sendGameState(conn);
      }
    });

    conn.on('data', (data) => {
      handleMessage(data as PeerMessage);
    });

    conn.on('close', () => {
      console.log('Connection closed with:', conn.peer);
      connectionsRef.current.delete(conn.peer);

      if (useGameStore.getState().isHost) {
        // Remove player from list
        const currentPlayers = useGameStore.getState().players;
        const updatedPlayers = currentPlayers.filter((p) => p.id !== conn.peer);
        updatePlayers(updatedPlayers);
        broadcast({ type: 'player-left', payload: { players: updatedPlayers } });
      }
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }, [handleMessage, sendGameState, broadcast, updatePlayers]);

  // Create a room (become host)
  const createRoom = useCallback((nickname: string) => {
    // Clean up any existing connection
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    setIsConnecting(true);
    setConnectionError(null);

    const peerId = uuidv4().slice(0, 8).toUpperCase();
    const peer = new Peer(peerId);

    peer.on('open', (id) => {
      console.log('Peer opened with ID:', id);
      peerRef.current = peer;
      setRoomCode(id);
      setIsConnecting(false);
      setIsConnected(true);

      const player: Player = {
        id,
        nickname,
        isHost: true,
        isReady: true,
      };

      setRoom(id, id, true);
      updatePlayers([player]);
    });

    peer.on('connection', (conn) => {
      console.log('Incoming connection from:', conn.peer);
      setupConnection(conn, true);

      conn.on('open', () => {
        // Add new player when they connect
        const metadata = conn.metadata as { nickname: string };
        const newPlayer: Player = {
          id: conn.peer,
          nickname: metadata?.nickname || 'Player',
          isHost: false,
          isReady: true,
        };

        const currentPlayers = useGameStore.getState().players;
        const updatedPlayers = [...currentPlayers, newPlayer];
        updatePlayers(updatedPlayers);

        // Broadcast to all players including the new one
        broadcast({ type: 'player-joined', payload: { players: updatedPlayers } });
      });
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setIsConnecting(false);
      setIsConnected(false);

      const errorType = (err as { type?: string }).type;
      if (errorType === 'unavailable-id') {
        setConnectionError('Failed to create room. Please try again.');
      } else if (errorType === 'network') {
        setConnectionError('Network error. Please check your internet connection.');
      } else {
        setConnectionError('Failed to create room. Please try again.');
      }
    });
  }, [setRoom, updatePlayers, setupConnection, broadcast]);

  // Join an existing room
  const joinRoom = useCallback((code: string, nickname: string) => {
    // Clean up any existing connection
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    setIsConnecting(true);
    setConnectionError(null);

    const peerId = uuidv4().slice(0, 8).toUpperCase();
    const peer = new Peer(peerId);

    // Set connection timeout (10 seconds)
    connectionTimeoutRef.current = setTimeout(() => {
      if (!isConnected) {
        setIsConnecting(false);
        setConnectionError('Connection timed out. The room may not exist or the host may be offline.');
        peer.destroy();
      }
    }, 10000);

    peer.on('open', (id) => {
      console.log('Peer opened with ID:', id);
      peerRef.current = peer;

      // Connect to host
      const conn = peer.connect(code.toUpperCase(), {
        metadata: { nickname },
        reliable: true,
      });

      hostConnectionRef.current = conn;
      setupConnection(conn, false);

      conn.on('open', () => {
        console.log('Connected to host');
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        setIsConnecting(false);
        setIsConnected(true);
        setRoomCode(code.toUpperCase());
        setRoom(code.toUpperCase(), id, false);
        // Player list will be updated when we receive sync-state from host
      });

      conn.on('error', (err) => {
        console.error('Connection error:', err);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        setIsConnecting(false);
        setIsConnected(false);
        setConnectionError('Failed to connect to the room. Please check the room code and try again.');
      });
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      setIsConnecting(false);
      setIsConnected(false);

      // Provide user-friendly error messages
      const errorType = (err as { type?: string }).type;
      if (errorType === 'peer-unavailable') {
        setConnectionError('Room not found. The room code may be incorrect or the host may have left.');
      } else if (errorType === 'network') {
        setConnectionError('Network error. Please check your internet connection.');
      } else if (errorType === 'disconnected') {
        setConnectionError('Disconnected from signaling server. Please refresh and try again.');
      } else {
        setConnectionError('Could not connect to room. Please check the room code and try again.');
      }
    });
  }, [setRoom, setupConnection, isConnected]);

  // Start the game (host only)
  const startGame = useCallback(() => {
    if (!useGameStore.getState().isHost) return;

    const gameStartTime = Date.now();
    storeStartGame(gameStartTime);
    broadcast({ type: 'game-start', payload: { startTime: gameStartTime } });
  }, [storeStartGame, broadcast]);

  // Validate entry passcode via API
  const validateEntry = useCallback(async (passcode: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/validate-puzzle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'entry', answer: passcode }),
      });
      const data = await response.json();
      return data.correct;
    } catch (error) {
      console.error('Failed to validate entry:', error);
      return false;
    }
  }, []);

  // Submit puzzle attempt via API
  const submitPuzzleAttempt = useCallback(async (puzzleIndex: number, answer: string): Promise<{ correct: boolean; finalPasscode?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/validate-puzzle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'puzzle', puzzleIndex, answer }),
      });
      const data = await response.json();

      if (data.correct) {
        solvePuzzle(puzzleIndex);

        if (data.finalPasscode) {
          const completionTime = Date.now() - (useGameStore.getState().startTime || Date.now());
          setVictory(data.finalPasscode, completionTime);
          broadcast({
            type: 'puzzle-solved',
            payload: { puzzleIndex, finalPasscode: data.finalPasscode, completionTime },
          });
        } else {
          broadcast({ type: 'puzzle-solved', payload: { puzzleIndex } });
        }
      }

      return data;
    } catch (error) {
      console.error('Failed to submit puzzle:', error);
      return { correct: false };
    }
  }, [solvePuzzle, setVictory, broadcast]);

  // Request hint via API
  const requestHint = useCallback(async (puzzleIndex: number, hintIndex: number): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE}/validate-puzzle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'hint', puzzleIndex, hintIndex }),
      });
      const data = await response.json();
      return data.hint || null;
    } catch (error) {
      console.error('Failed to get hint:', error);
      return null;
    }
  }, []);

  // Sync input across all players
  const syncInput = useCallback((key: string, value: string) => {
    updateSharedInput(key, value);
    broadcast({ type: 'sync-input', payload: { key, value } });
  }, [updateSharedInput, broadcast]);

  // Send chat message
  const sendChatMessage = useCallback((message: string) => {
    const chatMessage: ChatMessage = {
      id: uuidv4(),
      playerId: useGameStore.getState().playerId || '',
      playerName: useGameStore.getState().players.find(p => p.id === useGameStore.getState().playerId)?.nickname || 'Unknown',
      message,
      timestamp: Date.now(),
    };
    addChatMessage(chatMessage);
    broadcast({ type: 'chat', payload: chatMessage });
  }, [addChatMessage, broadcast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      connectionsRef.current.forEach((conn) => conn.close());
      peerRef.current?.destroy();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    connectionError,
    roomCode,
    createRoom,
    joinRoom,
    clearError,
    startGame,
    submitPuzzleAttempt,
    requestHint,
    syncInput,
    sendChatMessage,
    validateEntry,
  };
}
