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
  ArrowRight, AlertCircle, Lightbulb, Send, Loader2, Building, Lock, Info
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
  const isLocallyTypingRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { submitPuzzleAnswer, syncInput, claimTyping, releaseTyping, typingPlayer, currentPlayerId } = useRoom();
  const sharedInputs = useGameStore((state) => state.sharedInputs);

  // Check if another player is typing on this puzzle
  const otherPlayerTyping = !!(typingPlayer &&
    typingPlayer.odentifier !== currentPlayerId &&
    typingPlayer.puzzleIndex === PUZZLE_INDEX &&
    Date.now() - typingPlayer.timestamp < 3000);

  // Check if current player is the one typing
  const isCurrentPlayerTyping = !!(typingPlayer &&
    typingPlayer.odentifier === currentPlayerId &&
    typingPlayer.puzzleIndex === PUZZLE_INDEX);

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

  // Query hints from Convex
  const hint0 = useQuery(api.game.getHint, { puzzleIndex: PUZZLE_INDEX, hintIndex: 0 });
  const hint1 = useQuery(api.game.getHint, { puzzleIndex: PUZZLE_INDEX, hintIndex: 1 });
  const hint2 = useQuery(api.game.getHint, { puzzleIndex: PUZZLE_INDEX, hintIndex: 2 });
  const allHints = [hint0, hint1, hint2];

  // Sync from shared inputs only when another player is typing (not us)
  useEffect(() => {
    const sharedAnswer = sharedInputs[`puzzle${PUZZLE_INDEX}_answer`];
    // Only sync from remote if we're not the one typing
    if (sharedAnswer !== undefined && !isLocallyTypingRef.current && !isCurrentPlayerTyping) {
      setAnswer(sharedAnswer);
    }
  }, [sharedInputs, isCurrentPlayerTyping]);

  const handleInputChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setAnswer(upperValue);
    setError('');
    isLocallyTypingRef.current = true;

    // Debounce the sync to reduce race conditions
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncInput(`puzzle${PUZZLE_INDEX}_answer`, upperValue);
      // Allow remote updates after a brief delay
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
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Wire Transfer Details
            </CardTitle>
            <CardDescription className="mt-1">
              International wire transfer routing information
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            HEX ENCODED
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Mission brief */}
        <div className="flex gap-3 p-4 rounded-lg bg-white/5 border border-white/20">
          <Info className="w-5 h-5 text-white/90 shrink-0 mt-0.5" />
          <div className="text-sm text-white/90">
            <span className="text-white font-medium">Wire Transfer Intercept: </span>
            We've intercepted a wire transfer connected to the $50,000 aircraft donation.
            The destination routing appears to be encoded in hexadecimal. Decode the location.
          </div>
        </div>

        {/* Transfer details card */}
        <div className="rounded-xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/20 flex items-center justify-between bg-white/5">
            <span className="font-mono text-sm text-white/90">{WIRE_TRANSFER.id}</span>
            <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
              {WIRE_TRANSFER.status}
            </Badge>
          </div>

          {/* Origin & Destination */}
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/20">
            {/* Origin */}
            <div className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-white/90 mb-3">
                <Building className="w-3.5 h-3.5" />
                ORIGIN
              </div>
              <div className="space-y-2">
                <div className="data-row">
                  <span className="data-label">Bank</span>
                  <span className="data-value">{WIRE_TRANSFER.origin.bank}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Location</span>
                  <span className="data-value">{WIRE_TRANSFER.origin.location}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">SWIFT</span>
                  <span className="data-value">{WIRE_TRANSFER.origin.swift}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Routing</span>
                  <span className="data-value">{WIRE_TRANSFER.origin.routing}</span>
                </div>
              </div>
            </div>

            {/* Destination */}
            <div className="p-4 bg-amber-500/5">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-500 mb-3">
                <Building className="w-3.5 h-3.5" />
                DESTINATION (ENCODED)
              </div>
              <div className="space-y-2">
                <div className="data-row">
                  <span className="data-label">Bank</span>
                  <span className="data-value">{WIRE_TRANSFER.destination.bank}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Location</span>
                  <span className="encrypted-text font-mono text-sm">
                    {WIRE_TRANSFER.destination.routing}
                  </span>
                </div>
                <div className="data-row">
                  <span className="data-label">SWIFT</span>
                  <span className="encrypted-text font-mono text-sm">
                    {WIRE_TRANSFER.destination.swift}
                  </span>
                </div>
                <div className="data-row">
                  <span className="data-label">Reference</span>
                  <span className="encrypted-text font-mono text-sm">
                    {WIRE_TRANSFER.destination.reference}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transfer info footer */}
          <div className="px-4 py-3 border-t border-white/20 grid grid-cols-3 gap-4 bg-white/5">
            <div>
              <div className="text-xs text-white/90 mb-0.5">Amount</div>
              <div className="font-mono text-green-500">{WIRE_TRANSFER.amount}</div>
            </div>
            <div>
              <div className="text-xs text-white/90 mb-0.5">Purpose</div>
              <div className="text-sm text-white truncate">{WIRE_TRANSFER.purpose}</div>
            </div>
            <div>
              <div className="text-xs text-white/90 mb-0.5">Date</div>
              <div className="font-mono text-sm text-white">{WIRE_TRANSFER.date}</div>
            </div>
          </div>
        </div>

        {/* Encoding hint */}
        <div className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/20 text-sm">
          <AlertCircle className="w-4 h-4 text-white/90 shrink-0 mt-0.5" />
          <div className="text-white/90">
            <span className="text-white font-medium">Hex encoding: </span>
            Each pair = hex number (0-9, A-F) → decimal → ASCII. Example: 41 = 65 = 'A'
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
            <label className="text-sm font-medium text-white">Decoded Destination Location</label>
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
                placeholder={otherPlayerTyping ? `${typingPlayer?.nickname} is typing...` : "ENTER DECODED LOCATION"}
                className={`font-mono uppercase h-10 bg-white/10 border-white/40 text-white placeholder:text-white/60 ${otherPlayerTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              className="text-white/90 hover:text-white h-8"
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
