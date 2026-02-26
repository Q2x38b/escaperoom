import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { useRoom } from '../../hooks/useRoom';
import { useGameStore } from '../../stores/gameStore';
import { TypingIndicator } from '../game/TypingIndicator';
import {
  AlertCircle, Send, Loader2, Lock, Eye, FileCode, Key, UserCheck
} from 'lucide-react';

interface RolePuzzleProps {
  puzzleIndex: number;
}

// Type for the role puzzle data from Convex
interface RolePuzzleData {
  role: 'analyst' | 'decoder' | 'fieldAgent';
  title: string;
  description: string;
  canSubmit: boolean;
  data?: string[];
  decoderData?: {
    title: string;
    data: string[];
    description: string;
  };
}

const ROLE_ICONS = {
  analyst: Eye,
  decoder: Key,
  fieldAgent: UserCheck,
};

const ROLE_LABELS = {
  analyst: 'Analyst',
  decoder: 'Decoder',
  fieldAgent: 'Field Agent',
};

const ROLE_COLORS = {
  analyst: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  decoder: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  fieldAgent: 'text-green-400 border-green-400/30 bg-green-400/10',
};

export function RolePuzzle({ puzzleIndex }: RolePuzzleProps) {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLocallyTypingRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    submitPuzzleAnswer,
    syncInput,
    claimTyping,
    releaseTyping,
    typingPlayer,
    currentPlayerId,
    currentPlayerRole,
    roomId
  } = useRoom();

  const sharedInputs = useGameStore((state) => state.sharedInputs);
  const players = useGameStore((state) => state.players);

  // Query role-specific puzzle data from Convex
  const rolePuzzleData = useQuery(
    api.game.getRolePuzzleData,
    roomId ? {
      roomId,
      odentifier: currentPlayerId,
      puzzleIndex
    } : "skip"
  );

  const otherPlayerTyping = !!(typingPlayer &&
    typingPlayer.odentifier !== currentPlayerId &&
    typingPlayer.puzzleIndex === puzzleIndex &&
    Date.now() - typingPlayer.timestamp < 3000);

  const isCurrentPlayerTyping = !!(typingPlayer &&
    typingPlayer.odentifier === currentPlayerId &&
    typingPlayer.puzzleIndex === puzzleIndex);

  // Cleanup typing lock on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      releaseTyping();
    };
  }, [releaseTyping]);

  const handleFocus = useCallback(async () => {
    if (otherPlayerTyping) return;

    const claimed = await claimTyping(puzzleIndex);

    if (claimed) {
      typingIntervalRef.current = setInterval(async () => {
        await claimTyping(puzzleIndex);
      }, 2000);
    }
  }, [claimTyping, otherPlayerTyping, puzzleIndex]);

  const handleBlur = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    isLocallyTypingRef.current = false;
    releaseTyping();
  }, [releaseTyping]);

  // Sync from shared inputs
  useEffect(() => {
    const sharedAnswer = sharedInputs[`puzzle${puzzleIndex}_answer`];
    if (sharedAnswer !== undefined && !isLocallyTypingRef.current && !isCurrentPlayerTyping) {
      setAnswer(sharedAnswer);
    }
  }, [sharedInputs, isCurrentPlayerTyping, puzzleIndex]);

  const handleInputChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setAnswer(upperValue);
    setError('');
    isLocallyTypingRef.current = true;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncInput(`puzzle${puzzleIndex}_answer`, upperValue);
      setTimeout(() => {
        isLocallyTypingRef.current = false;
      }, 500);
    }, 100);
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setIsSubmitting(true);
    setError('');

    const result = await submitPuzzleAnswer(puzzleIndex, answer);

    if (!result.correct) {
      setError('Incorrect. Try again.');
      setIsSubmitting(false);
    }
  };

  // Get role icon
  const RoleIcon = currentPlayerRole ? ROLE_ICONS[currentPlayerRole] : FileCode;

  // Get teammates with their roles
  const teammates = players.filter(p => p.id !== currentPlayerId && p.role);

  if (!rolePuzzleData || !currentPlayerRole) {
    return (
      <Card className="bank-card">
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-white/60" />
          <p className="text-white/60 text-sm">Loading your role assignment...</p>
        </CardContent>
      </Card>
    );
  }

  // Cast to our typed interface
  const puzzleData = rolePuzzleData as RolePuzzleData;

  return (
    <Card className="bank-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <RoleIcon className="w-5 h-5" />
              {puzzleData.title}
            </CardTitle>
            <CardDescription className="mt-1">
              {puzzleData.description}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`font-medium text-xs ${ROLE_COLORS[currentPlayerRole]}`}
          >
            {ROLE_LABELS[currentPlayerRole]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Team Roles Display */}
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-white/5 border border-white/20">
          <span className="text-xs text-white/70 w-full mb-1">Your Team:</span>
          <Badge
            variant="outline"
            className={`text-xs ${ROLE_COLORS[currentPlayerRole]}`}
          >
            You: {ROLE_LABELS[currentPlayerRole]}
          </Badge>
          {teammates.map(teammate => (
            <Badge
              key={teammate.id}
              variant="outline"
              className={`text-xs ${teammate.role ? ROLE_COLORS[teammate.role] : 'text-white/60'}`}
            >
              {teammate.nickname}: {teammate.role ? ROLE_LABELS[teammate.role] : 'Unassigned'}
            </Badge>
          ))}
        </div>

        {/* Role-specific data for Analyst */}
        {currentPlayerRole === 'analyst' && puzzleData.data && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-blue-500/20 bg-blue-500/10">
              <span className="text-sm font-medium text-blue-400 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                CLASSIFIED DATA - SHARE WITH YOUR TEAM
              </span>
            </div>
            <div className="p-4 space-y-2">
              {puzzleData.data.map((line: string, idx: number) => (
                <div
                  key={idx}
                  className="font-mono text-sm text-white py-1.5 px-3 bg-white/5 rounded"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Role-specific data for Decoder */}
        {currentPlayerRole === 'decoder' && puzzleData.data && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-purple-500/20 bg-purple-500/10">
              <span className="text-sm font-medium text-purple-400 flex items-center gap-2">
                <Key className="w-4 h-4" />
                DECRYPTION REFERENCE - HELP YOUR TEAM DECODE
              </span>
            </div>
            <div className="p-4 space-y-2">
              {puzzleData.data.map((line: string, idx: number) => (
                <div
                  key={idx}
                  className="font-mono text-xs text-white/90 py-1.5 px-3 bg-white/5 rounded"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Field Agent - has submit access, and in 2-player mode also sees decoder info */}
        {currentPlayerRole === 'fieldAgent' && (
          <>
            {/* Info box for field agent */}
            <div className="flex gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/30">
              <UserCheck className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div className="text-sm text-white/90">
                <span className="text-green-400 font-medium">Field Agent: </span>
                You have authorization to submit answers. Coordinate with your Analyst and Decoder to get the information you need.
              </div>
            </div>

            {/* 2-player mode: Field Agent also sees decoder data */}
            {puzzleData.decoderData && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-purple-500/20 bg-purple-500/10">
                  <span className="text-sm font-medium text-purple-400 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    {puzzleData.decoderData.title}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  {puzzleData.decoderData.data.map((line: string, idx: number) => (
                    <div
                      key={idx}
                      className="font-mono text-xs text-white/90 py-1.5 px-3 bg-white/5 rounded"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Answer input - only field agent can submit */}
        {puzzleData.canSubmit ? (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor={`puzzle${puzzleIndex}-answer`} className="text-sm font-medium text-white cursor-pointer">
                Enter Decoded Answer
              </label>
              {otherPlayerTyping && typingPlayer && (
                <TypingIndicator nickname={typingPlayer.nickname} />
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id={`puzzle${puzzleIndex}-answer`}
                  type="text"
                  value={answer}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={otherPlayerTyping ? `${typingPlayer?.nickname} is typing...` : "ENTER ANSWER"}
                  className={`font-mono uppercase h-10 bg-white/10 border-white/40 text-white placeholder:text-white/60 ${otherPlayerTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={otherPlayerTyping || isSubmitting}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  aria-describedby={error ? `puzzle${puzzleIndex}-error` : undefined}
                />
                {otherPlayerTyping && (
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" aria-hidden="true" />
                )}
              </div>
              <Button
                type="submit"
                disabled={!answer.trim() || isSubmitting || otherPlayerTyping}
                aria-label="Submit answer"
                className="h-10 px-4"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="w-4 h-4" aria-hidden="true" />
                )}
              </Button>
            </div>

            {error && (
              <Alert id={`puzzle${puzzleIndex}-error`} variant="destructive" className="py-2" role="alert">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
          </form>
        ) : (
          <div className="p-4 rounded-lg bg-white/5 border border-white/20 text-center">
            <Lock className="w-5 h-5 mx-auto mb-2 text-white/60" />
            <p className="text-sm text-white/70">
              Only the <span className="text-green-400 font-medium">Field Agent</span> can submit answers.
            </p>
            <p className="text-xs text-white/50 mt-1">
              Share your information via chat to help them solve the puzzle!
            </p>
          </div>
        )}

        {/* Current answer display for non-field agents */}
        {!puzzleData.canSubmit && answer && (
          <div className="p-3 rounded-lg bg-white/5 border border-white/20">
            <span className="text-xs text-white/60">Current team answer: </span>
            <span className="font-mono text-white">{answer}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
