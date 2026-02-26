import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useRoom } from '../../hooks/useRoom';
import { useGameStore } from '../../stores/gameStore';
import { TypingIndicator } from '../game/TypingIndicator';
import {
  FileCode, AlertCircle, Lightbulb, Send, Loader2, Lock, Info
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
  const [hints, setHints] = useState<string[]>([]);
  const [hintIndex, setHintIndex] = useState(0);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { submitPuzzleAnswer, syncInput, claimTyping, releaseTyping, typingPlayer, currentPlayerId } = useRoom();
  const sharedInputs = useGameStore((state) => state.sharedInputs);

  const otherPlayerTyping = !!(typingPlayer &&
    typingPlayer.odentifier !== currentPlayerId &&
    typingPlayer.puzzleIndex === PUZZLE_INDEX &&
    Date.now() - typingPlayer.timestamp < 3000);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
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
    releaseTyping();
  }, [releaseTyping]);

  const hint0 = useQuery(api.game.getHint, { puzzleIndex: PUZZLE_INDEX, hintIndex: 0 });
  const hint1 = useQuery(api.game.getHint, { puzzleIndex: PUZZLE_INDEX, hintIndex: 1 });
  const hint2 = useQuery(api.game.getHint, { puzzleIndex: PUZZLE_INDEX, hintIndex: 2 });
  const allHints = [hint0, hint1, hint2];

  useEffect(() => {
    const sharedAnswer = sharedInputs[`puzzle${PUZZLE_INDEX}_answer`];
    if (sharedAnswer && sharedAnswer !== answer) {
      setAnswer(sharedAnswer);
    }
  }, [sharedInputs, answer]);

  const handleInputChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setAnswer(upperValue);
    setError('');
    syncInput(`puzzle${PUZZLE_INDEX}_answer`, upperValue);
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setIsSubmitting(true);
    setError('');

    const result = await submitPuzzleAnswer(PUZZLE_INDEX, answer);

    if (!result.correct) {
      setError('Incorrect. The decoded asset type does not match our records.');
    }

    setIsSubmitting(false);
  };

  const handleHint = () => {
    if (hintIndex < 3) {
      const hint = allHints[hintIndex];
      if (hint && !hints.includes(hint)) {
        setHints((prev) => [...prev, hint]);
      }
      setHintIndex((prev) => prev + 1);
    }
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
        <div className="flex gap-3 p-4 rounded-lg bg-muted/50 border border-border">
          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Hidden File Discovery: </span>
            Our forensic team found a hidden file on the Vance family's secure server.
            Decode the first line to identify the asset purchased with the offshore funds.
          </div>
        </div>

        {/* File viewer */}
        <div className="rounded-xl border border-border overflow-hidden">
          {/* File header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm">{BINARY_DATA.filename}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{BINARY_DATA.size}</span>
              <span>{BINARY_DATA.modified}</span>
            </div>
          </div>

          {/* Binary content */}
          <div className="p-4 font-mono text-sm space-y-2">
            <div className="text-xs text-muted-foreground mb-3">// Binary contents:</div>
            {BINARY_DATA.contents.map((line, index) => (
              <div
                key={index}
                className={`py-2.5 px-3 rounded-lg flex items-center gap-3 ${
                  index === 0
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : 'bg-muted/30'
                }`}
              >
                <span className="text-muted-foreground text-xs w-6">{String(index + 1).padStart(2, '0')}</span>
                <code className={`text-xs tracking-wide ${index === 0 ? 'encrypted-text' : 'text-muted-foreground'}`}>
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
        <div className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border text-sm">
          <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-muted-foreground">
            <span className="text-foreground font-medium">Binary encoding: </span>
            8 bits = 1 char. Convert to decimal, then ASCII. Example: 01000001 = 65 = 'A'
          </div>
        </div>

        {/* Hints */}
        {hints.length > 0 && (
          <div className="space-y-2">
            {hints.map((hint, i) => (
              <Alert key={i} className="border-amber-500/30 bg-amber-500/5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <AlertDescription className="text-sm">{hint}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Answer input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Decoded Asset Type (First Line)</label>
            {otherPlayerTyping && typingPlayer && (
              <TypingIndicator nickname={typingPlayer.nickname} />
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={answer}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={otherPlayerTyping ? `${typingPlayer?.nickname} is typing...` : "Enter decoded word"}
                className={`font-mono uppercase h-10 ${otherPlayerTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={otherPlayerTyping}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSubmitting && !otherPlayerTyping) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              {otherPlayerTyping && (
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!answer.trim() || isSubmitting || otherPlayerTyping}
              className="h-10 px-4"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHint}
              disabled={hintIndex >= 3}
              className="text-muted-foreground h-8"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Hint ({3 - hintIndex})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
