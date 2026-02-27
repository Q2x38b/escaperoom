import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { useRoom } from '../../hooks/useRoom';
import { useGameStore } from '../../stores/gameStore';
import { TypingIndicator } from '../game/TypingIndicator';
import {
  AlertCircle, Send, Loader2, Lock, Eye, FileCode, Key, UserCheck,
  FileText, AlertTriangle, Target
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
  missionBrief?: {
    title: string;
    objective: string;
    context: string;
  };
  documentInfo?: {
    type: string;
    id: string;
    status: string;
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

const STATUS_COLORS: Record<string, string> = {
  'INTERCEPTED': 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  'FLAGGED': 'text-red-400 bg-red-400/10 border-red-400/30',
  'RECOVERED': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
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
    <div className="space-y-4">
      {/* Mission Brief Card - Visible to ALL players */}
      {puzzleData.missionBrief && (
        <Card className="bank-card border-amber-500/30">
          <CardContent className="p-4 space-y-3">
            {/* Mission Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span className="font-mono text-amber-400 text-sm font-bold tracking-wider">
                  {puzzleData.missionBrief.title}
                </span>
              </div>
              {puzzleData.documentInfo && (
                <Badge
                  variant="outline"
                  className={`text-xs font-mono shrink-0 ${STATUS_COLORS[puzzleData.documentInfo.status] || 'text-white/60'}`}
                >
                  {puzzleData.documentInfo.status}
                </Badge>
              )}
            </div>

            {/* Document Info */}
            {puzzleData.documentInfo && (
              <div className="flex flex-wrap gap-3 text-xs text-white/60 font-mono">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {puzzleData.documentInfo.type}
                </span>
                <span className="text-white/40">|</span>
                <span>ID: {puzzleData.documentInfo.id}</span>
              </div>
            )}

            {/* Objective */}
            <div className="flex gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <Target className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-amber-400/80 uppercase tracking-wider">Objective:</span>
                <p className="text-sm text-white mt-0.5">{puzzleData.missionBrief.objective}</p>
              </div>
            </div>

            {/* Context */}
            <p className="text-sm text-white/70 leading-relaxed">
              {puzzleData.missionBrief.context}
            </p>

            {/* Team Roles Display */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              <span className="text-xs text-white/50 w-full mb-1">Investigation Team:</span>
              {/* Current player's roles - show both if fieldAgent has decoder access (2-player mode) */}
              {currentPlayerRole === 'fieldAgent' && puzzleData.decoderData ? (
                <div className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className={`text-xs ${ROLE_COLORS.fieldAgent}`}
                  >
                    You: {ROLE_LABELS.fieldAgent}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${ROLE_COLORS.decoder}`}
                  >
                    + {ROLE_LABELS.decoder}
                  </Badge>
                </div>
              ) : (
                <Badge
                  variant="outline"
                  className={`text-xs ${ROLE_COLORS[currentPlayerRole]}`}
                >
                  You: {ROLE_LABELS[currentPlayerRole]}
                </Badge>
              )}
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
          </CardContent>
        </Card>
      )}

      {/* Role-Specific Data Card */}
      <Card className="bank-card">
        <CardContent className="p-4 space-y-4">
          {/* Role Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RoleIcon className={`w-5 h-5 ${currentPlayerRole === 'analyst' ? 'text-blue-400' : currentPlayerRole === 'decoder' ? 'text-purple-400' : 'text-green-400'}`} />
              <span className="font-medium text-white">{puzzleData.title}</span>
            </div>
            {/* Show multiple role badges in 2-player mode */}
            {currentPlayerRole === 'fieldAgent' && puzzleData.decoderData ? (
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className={`font-medium text-xs ${ROLE_COLORS.fieldAgent}`}
                >
                  {ROLE_LABELS.fieldAgent}
                </Badge>
                <Badge
                  variant="outline"
                  className={`font-medium text-xs ${ROLE_COLORS.decoder}`}
                >
                  {ROLE_LABELS.decoder}
                </Badge>
              </div>
            ) : (
              <Badge
                variant="outline"
                className={`font-medium text-xs ${ROLE_COLORS[currentPlayerRole]}`}
              >
                {ROLE_LABELS[currentPlayerRole]}
              </Badge>
            )}
          </div>

          {/* Role Description */}
          <p className="text-sm text-white/70">{puzzleData.description}</p>

          {/* Role-specific data for Analyst */}
          {currentPlayerRole === 'analyst' && puzzleData.data && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-blue-500/20 bg-blue-500/10">
                <span className="text-xs font-medium text-blue-400 flex items-center gap-2 uppercase tracking-wider">
                  <Eye className="w-3.5 h-3.5" />
                  Classified Data - Share via Chat
                </span>
              </div>
              <div className="p-3 space-y-1.5">
                {puzzleData.data.map((line: string, idx: number) => (
                  <div
                    key={idx}
                    className={`font-mono text-sm py-1.5 px-3 rounded ${
                      line.startsWith('━') ? 'text-blue-400/70 text-xs' : 'text-white bg-white/5'
                    }`}
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
              <div className="px-4 py-2.5 border-b border-purple-500/20 bg-purple-500/10">
                <span className="text-xs font-medium text-purple-400 flex items-center gap-2 uppercase tracking-wider">
                  <Key className="w-3.5 h-3.5" />
                  Decryption Reference
                </span>
              </div>
              <div className="p-3 space-y-1.5">
                {puzzleData.data.map((line: string, idx: number) => (
                  <div
                    key={idx}
                    className={`font-mono text-xs py-1.5 px-3 rounded ${
                      line.startsWith('━') ? 'text-purple-400/70' : 'text-white/90 bg-white/5'
                    }`}
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
              <div className="flex gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/30">
                <UserCheck className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div className="text-sm text-white/90">
                  <span className="text-green-400 font-medium">Authorized to Submit: </span>
                  Coordinate with your team via chat. They have the data you need.
                </div>
              </div>

              {/* 2-player mode: Field Agent also sees decoder data */}
              {puzzleData.decoderData && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-purple-500/20 bg-purple-500/10">
                    <span className="text-xs font-medium text-purple-400 flex items-center gap-2 uppercase tracking-wider">
                      <Key className="w-3.5 h-3.5" />
                      {puzzleData.decoderData.title}
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {puzzleData.decoderData.data.map((line: string, idx: number) => (
                      <div
                        key={idx}
                        className={`font-mono text-xs py-1.5 px-3 rounded ${
                          line.startsWith('━') ? 'text-purple-400/70' : 'text-white/90 bg-white/5'
                        }`}
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
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label htmlFor={`puzzle${puzzleIndex}-answer`} className="text-sm font-medium text-white cursor-pointer">
                  Submit Answer
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
                    placeholder={otherPlayerTyping ? `${typingPlayer?.nickname} is typing...` : "ENTER DECODED ANSWER"}
                    className={`font-mono uppercase h-11 bg-white/10 border-white/40 text-white placeholder:text-white/50 ${otherPlayerTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  className="h-11 px-5"
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
              <Lock className="w-5 h-5 mx-auto mb-2 text-white/50" />
              <p className="text-sm text-white/70">
                Only the <span className="text-green-400 font-medium">Field Agent</span> can submit answers.
              </p>
              <p className="text-xs text-white/50 mt-1">
                Share your data via chat to help them solve the puzzle!
              </p>
            </div>
          )}

          {/* Current answer display for non-field agents */}
          {!puzzleData.canSubmit && answer && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/20">
              <span className="text-xs text-white/60">Team answer in progress: </span>
              <span className="font-mono text-white">{answer}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
