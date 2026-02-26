import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useRoom } from '../../hooks/useRoom';
import { useGameStore } from '../../stores/gameStore';
import { TypingIndicator } from '../game/TypingIndicator';
import {
  ArrowLeftRight, AlertCircle, Lightbulb, Globe, Send, Loader2, Building, Lock
} from 'lucide-react';

// CAYMAN in hex: 43 41 59 4D 41 4E
const WIRE_TRANSFER = {
  id: 'WIR-2024-0315-7829',
  origin: {
    bank: 'First National Bank',
    location: 'New York, NY',
    swift: 'FNBKUS33',
    routing: '021000089',
  },
  destination: {
    bank: 'Caribbean Trust Holdings',
    routing: '43 41 59 4D 41 4E', // CAYMAN in hex
    swift: '4F 43 45 41 4E', // OCEAN
    reference: '56 41 4E 43 45', // VANCE
  },
  amount: '$50,000.00',
  purpose: 'Aircraft Purchase Deposit',
  date: '2024-03-15',
  status: 'Completed',
};

const PUZZLE_INDEX = 0;

export function Puzzle1Hex() {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [hintIndex, setHintIndex] = useState(0);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { submitPuzzleAnswer, syncInput, claimTyping, releaseTyping, typingPlayer, currentPlayerId } = useRoom();
  const sharedInputs = useGameStore((state) => state.sharedInputs);

  // Check if another player is typing on this puzzle
  const otherPlayerTyping = !!(typingPlayer &&
    typingPlayer.odentifier !== currentPlayerId &&
    typingPlayer.puzzleIndex === PUZZLE_INDEX &&
    Date.now() - typingPlayer.timestamp < 3000);

  // Cleanup typing lock on unmount
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
      // Refresh typing lock every 2 seconds while focused
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

  // Query hints from Convex
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
      setError('Incorrect. The decoded location does not match our records.');
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Wire Transfer Details
            </CardTitle>
            <CardDescription>
              International wire transfer routing information
            </CardDescription>
          </div>
          <Badge variant="warning">HEX ENCODED</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <Globe className="w-4 h-4" />
          <AlertTitle>Wire Transfer Intercept</AlertTitle>
          <AlertDescription>
            We've intercepted a wire transfer connected to the $50,000 aircraft donation.
            The destination routing information appears to be encoded in hexadecimal.
            Decode the destination location to trace where the funds were sent.
          </AlertDescription>
        </Alert>

        <div className="bg-black/30 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-sm text-muted-foreground">{WIRE_TRANSFER.id}</span>
              <Badge variant="success">{WIRE_TRANSFER.status}</Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Building className="w-3 h-3" />
                  ORIGIN
                </div>
                <div className="bg-black/30 rounded p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Bank</span>
                    <span className="text-sm">{WIRE_TRANSFER.origin.bank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Location</span>
                    <span className="text-sm">{WIRE_TRANSFER.origin.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">SWIFT</span>
                    <span className="text-sm font-mono">{WIRE_TRANSFER.origin.swift}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Routing</span>
                    <span className="text-sm font-mono">{WIRE_TRANSFER.origin.routing}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-medium text-amber-400 flex items-center gap-2">
                  <Building className="w-3 h-3" />
                  DESTINATION (ENCODED)
                </div>
                <div className="bg-amber-500/5 border border-amber-500/30 rounded p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Bank</span>
                    <span className="text-sm">{WIRE_TRANSFER.destination.bank}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Location</span>
                    <span className="encrypted-text font-mono text-sm">
                      {WIRE_TRANSFER.destination.routing}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">SWIFT</span>
                    <span className="encrypted-text font-mono text-sm">
                      {WIRE_TRANSFER.destination.swift}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Reference</span>
                    <span className="encrypted-text font-mono text-sm">
                      {WIRE_TRANSFER.destination.reference}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Amount</div>
              <div className="font-mono text-lg text-green-400">{WIRE_TRANSFER.amount}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Purpose</div>
              <div className="text-sm">{WIRE_TRANSFER.purpose}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Date</div>
              <div className="font-mono text-sm">{WIRE_TRANSFER.date}</div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <div className="font-medium mb-1">Hexadecimal Encoding</div>
            <p className="text-muted-foreground">
              Each pair of characters represents a hexadecimal number (0-9, A-F).
              Converting hex to decimal gives you ASCII character codes.
              For example: 41 hex = 65 decimal = 'A'.
            </p>
          </div>
        </div>

        {hints.length > 0 && (
          <div className="space-y-2">
            {hints.map((hint, i) => (
              <Alert key={i} variant="warning">
                <Lightbulb className="w-4 h-4" />
                <AlertDescription>{hint}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Decoded Destination Location
                </label>
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
                    placeholder={otherPlayerTyping ? `${typingPlayer?.nickname} is typing...` : "Enter decoded location"}
                    className={`font-mono uppercase bg-black/30 ${otherPlayerTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                  )}
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!answer.trim() || isSubmitting || otherPlayerTyping}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHint}
              disabled={hintIndex >= 3}
              className="text-muted-foreground"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Request Hint ({3 - hintIndex} remaining)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
