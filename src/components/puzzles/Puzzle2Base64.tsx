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
  Receipt, AlertCircle, Lightbulb, Send, Loader2, Lock, Info
} from 'lucide-react';

// Base64 encoded: "DONATION-50000-AIRCRAFT" = "RE9OQVRJT04tNTAwMDAtQUlSQ1JBRlQ="
const TRANSACTIONS = [
  {
    id: 'TXN-78291',
    date: '2024-03-15',
    encoded: 'RE9OQVRJT04tNTAwMDAtQUlSQ1JBRlQ=',
    amount: '$50,000.00',
    type: 'Outbound',
    flagged: true,
  },
  {
    id: 'TXN-78292',
    date: '2024-03-14',
    encoded: 'U1VTUElDSU9VUy1DTElFTlRT',
    amount: '$125,000.00',
    type: 'Inbound',
    flagged: false,
  },
  {
    id: 'TXN-78293',
    date: '2024-03-12',
    encoded: 'T0ZGU0hPUkUtVFJBTlNGRVI=',
    amount: '$890,000.00',
    type: 'Transfer',
    flagged: true,
  },
];

const PUZZLE_INDEX = 1;

export function Puzzle2Base64() {
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

  const hint0 = useQuery(api.game.getHint, { puzzleIndex: PUZZLE_INDEX, hintIndex: 0 });
  const hint1 = useQuery(api.game.getHint, { puzzleIndex: PUZZLE_INDEX, hintIndex: 1 });
  const hint2 = useQuery(api.game.getHint, { puzzleIndex: PUZZLE_INDEX, hintIndex: 2 });
  const allHints = [hint0, hint1, hint2];

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

    if (!result.correct) {
      setError('Incorrect. The decoded transaction does not match our records.');
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
              <Receipt className="w-5 h-5" />
              Transaction Logs
            </CardTitle>
            <CardDescription className="mt-1">
              Encoded transaction records from the Vance account
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            BASE64 ENCODED
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Mission brief */}
        <div className="flex gap-3 p-4 rounded-lg bg-white/5 border border-white/20">
          <Info className="w-5 h-5 text-white/90 shrink-0 mt-0.5" />
          <div className="text-sm text-white/90">
            <span className="text-white font-medium">Transaction Analysis: </span>
            The transaction descriptions have been encoded. Decode the flagged transaction
            (TXN-78291) to reveal important details about suspicious fund movements.
          </div>
        </div>

        {/* Transaction table - Desktop */}
        <div className="rounded-xl border border-white/20 overflow-hidden hidden md:block">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 border-b border-white/20 text-xs font-medium text-white/90">
            <div className="col-span-2">TXN ID</div>
            <div className="col-span-2">DATE</div>
            <div className="col-span-4">DESCRIPTION (ENCODED)</div>
            <div className="col-span-2">AMOUNT</div>
            <div className="col-span-2">TYPE</div>
          </div>

          {/* Rows */}
          {TRANSACTIONS.map((txn) => (
            <div
              key={txn.id}
              className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/20 last:border-0 items-center ${
                txn.flagged ? 'bg-amber-500/5' : ''
              }`}
            >
              <div className="col-span-2 flex items-center gap-2">
                <span className="font-mono text-sm text-white">{txn.id}</span>
                {txn.flagged && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px] px-1.5">
                    FLAG
                  </Badge>
                )}
              </div>
              <div className="col-span-2 font-mono text-sm text-white/90">{txn.date}</div>
              <div className="col-span-4">
                <code className={`text-xs break-all ${txn.flagged ? 'encrypted-text' : 'text-white/80'}`}>
                  {txn.encoded}
                </code>
              </div>
              <div className="col-span-2 font-mono text-sm text-green-500">{txn.amount}</div>
              <div className="col-span-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    txn.type === 'Inbound'
                      ? 'text-green-500 border-green-500/30'
                      : txn.type === 'Transfer'
                        ? 'text-blue-500 border-blue-500/30'
                        : 'text-white/90'
                  }`}
                >
                  {txn.type}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Transaction cards - Mobile */}
        <div className="space-y-3 md:hidden">
          {TRANSACTIONS.map((txn) => (
            <div
              key={txn.id}
              className={`rounded-xl border border-white/20 p-4 space-y-3 ${
                txn.flagged ? 'bg-amber-500/5 border-amber-500/30' : 'bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white">{txn.id}</span>
                  {txn.flagged && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px] px-1.5">
                      FLAG
                    </Badge>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    txn.type === 'Inbound'
                      ? 'text-green-500 border-green-500/30'
                      : txn.type === 'Transfer'
                        ? 'text-blue-500 border-blue-500/30'
                        : 'text-white/90'
                  }`}
                >
                  {txn.type}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">{txn.date}</span>
                <span className="font-mono text-green-500">{txn.amount}</span>
              </div>
              <div className="pt-2 border-t border-white/10">
                <div className="text-xs text-white/60 mb-1">Encoded Description:</div>
                <code className={`text-xs break-all ${txn.flagged ? 'encrypted-text' : 'text-white/80'}`}>
                  {txn.encoded}
                </code>
              </div>
            </div>
          ))}
        </div>

        {/* Encoding hint */}
        <div className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/20 text-sm">
          <AlertCircle className="w-4 h-4 text-white/90 shrink-0 mt-0.5" />
          <div className="text-white/90">
            <span className="text-white font-medium">Base64 encoding: </span>
            Uses A-Z, a-z, 0-9, +, / and = for padding. Common in emails and URLs.
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
            <label className="text-sm font-medium text-white">Decoded Transaction Description (TXN-78291)</label>
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
                placeholder={otherPlayerTyping ? `${typingPlayer?.nickname} is typing...` : "ENTER DECODED DESCRIPTION"}
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
