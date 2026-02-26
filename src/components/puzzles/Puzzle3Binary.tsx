import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { useRoom } from '../../hooks/useRoom';
import { useGameStore } from '../../stores/gameStore';
import { TypingIndicator } from '../game/TypingIndicator';
import {
  FileCode, AlertCircle, Send, Loader2, Lock, Info, CheckCircle
} from 'lucide-react';

// PLANE in binary:
// P = 80 = 01010000, L = 76 = 01001100, A = 65 = 01000001, N = 78 = 01001110, E = 69 = 01000101
const BINARY_DATA = {
  filename: 'secret_asset.bin',
  size: '256 bytes',
  modified: '2024-03-10 03:42:18',
  contents: [
    '01010000 01001100 01000001 01001110 01000101',  // PLANE
    '01010010 01000101 01000111 01001001 01010011 01010100 01010010 01011001', // REGISTRY
    '01001110 00110111 00110011 00111000 01010110 01001110', // N738VN
  ],
};

const PUZZLE_INDEX = 2;

export function Puzzle3Binary() {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLocallyTypingRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { submitPuzzleAnswer, syncInput, claimTyping, releaseTyping, typingPlayer, currentPlayerId } = useRoom();
  const sharedInputs = useGameStore((state) => state.sharedInputs);

  const otherPlayerTyping = !!(typingPlayer &&
    typingPlayer.odentifier !== currentPlayerId &&
    typingPlayer.puzzleIndex === PUZZLE_INDEX &&
    Date.now() - typingPlayer.timestamp < 3000);

  const isCurrentPlayerTyping = !!(typingPlayer &&
    typingPlayer.odentifier === currentPlayerId &&
    typingPlayer.puzzleIndex === PUZZLE_INDEX);

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

    const claimed = await claimTyping(PUZZLE_INDEX);

    if (claimed) {
      typingIntervalRef.current = setInterval(async () => {
        await claimTyping(PUZZLE_INDEX);
      }, 2000);
    }
  }, [claimTyping, otherPlayerTyping]);

  const handleBlur = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    isLocallyTypingRef.current = false;
    releaseTyping();
  }, [releaseTyping]);

  // Sync from shared inputs only when another player is typing (not us)
  useEffect(() => {
    const sharedAnswer = sharedInputs[`puzzle${PUZZLE_INDEX}_answer`];
    if (sharedAnswer !== undefined && !isLocallyTypingRef.current && !isCurrentPlayerTyping) {
      setAnswer(sharedAnswer);
    }
  }, [sharedInputs, isCurrentPlayerTyping]);

  const handleInputChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setAnswer(upperValue);
    setError('');
    isLocallyTypingRef.current = true;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncInput(`puzzle${PUZZLE_INDEX}_answer`, upperValue);
      setTimeout(() => {
        isLocallyTypingRef.current = false;
      }, 500);
    }, 100);
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setIsSubmitting(true);
    setError('');

    const result = await submitPuzzleAnswer(PUZZLE_INDEX, answer);

    if (result.correct) {
      setShowSuccess(true);
      // The room state will automatically update and switch to victory
    } else {
      setError('Incorrect. The decoded asset type does not match our records.');
    }

    setIsSubmitting(false);
  };

  return (
    <Card className="bank-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              Hidden Files
            </CardTitle>
            <CardDescription className="mt-1">
              Encrypted binary data from the secure server
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            BINARY DATA
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Mission brief */}
        <div className="flex gap-3 p-4 rounded-lg bg-white/5 border border-white/20">
          <Info className="w-5 h-5 text-white/90 shrink-0 mt-0.5" />
          <div className="text-sm text-white/90">
            <span className="text-white font-medium">Hidden File Discovery: </span>
            Our forensic team found a hidden file on the Vance family's secure server.
            Decode the first line to identify the asset purchased with the offshore funds.
          </div>
        </div>

        {/* File viewer */}
        <div className="rounded-xl border border-white/20 overflow-hidden">
          {/* File header */}
          <div className="px-4 py-3 border-b border-white/20 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-white/90" />
              <span className="font-mono text-sm text-white">{BINARY_DATA.filename}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/80">
              <span>{BINARY_DATA.size}</span>
              <span>{BINARY_DATA.modified}</span>
            </div>
          </div>

          {/* Binary content */}
          <div className="p-4 font-mono text-sm space-y-2">
            <div className="text-xs text-white/80 mb-3">// Binary contents:</div>
            {BINARY_DATA.contents.map((line, index) => (
              <div
                key={index}
                className={`py-2.5 px-3 rounded-lg flex items-center gap-3 ${
                  index === 0
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : 'bg-white/5'
                }`}
              >
                <span className="text-white/70 text-xs w-6">{String(index + 1).padStart(2, '0')}</span>
                <code className={`text-xs tracking-wide ${index === 0 ? 'encrypted-text' : 'text-white/80'}`}>
                  {line}
                </code>
                {index === 0 && (
                  <Badge variant="outline" className="ml-auto text-amber-500 border-amber-500/30 text-[10px]">
                    DECODE
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Encoding hint */}
        <div className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/20 text-sm">
          <AlertCircle className="w-4 h-4 text-white/90 shrink-0 mt-0.5" />
          <div className="text-white/90">
            <span className="text-white font-medium">Binary encoding: </span>
            8 bits = 1 char. Convert to decimal, then ASCII. Example: 01000001 = 65 = 'A'
          </div>
        </div>

        {/* Success message */}
        {showSuccess && (
          <Alert className="border-green-500/30 bg-green-500/10">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <AlertDescription className="text-sm text-green-400">
              Correct! Investigation complete...
            </AlertDescription>
          </Alert>
        )}

        {/* Answer input */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="puzzle3-answer" className="text-sm font-medium text-white cursor-pointer">
              Decoded Asset Type (First Line)
            </label>
            {otherPlayerTyping && typingPlayer && (
              <TypingIndicator nickname={typingPlayer.nickname} />
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="puzzle3-answer"
                type="text"
                value={answer}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={otherPlayerTyping ? `${typingPlayer?.nickname} is typing...` : "ENTER DECODED WORD"}
                className={`font-mono uppercase h-10 bg-white/10 border-white/40 text-white placeholder:text-white/60 ${otherPlayerTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={otherPlayerTyping || showSuccess}
                onFocus={handleFocus}
                onBlur={handleBlur}
                aria-describedby={error ? "puzzle3-error" : undefined}
              />
              {otherPlayerTyping && (
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" aria-hidden="true" />
              )}
            </div>
            <Button
              type="submit"
              disabled={!answer.trim() || isSubmitting || otherPlayerTyping || showSuccess}
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
            <Alert id="puzzle3-error" variant="destructive" className="py-2" role="alert">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
