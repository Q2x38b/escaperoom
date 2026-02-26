import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useRoom } from '../../hooks/useRoom';
import { useGameStore } from '../../stores/gameStore';
import {
  Receipt, AlertCircle, Lightbulb, FileText, Send, Loader2, ArrowRight
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
    encoded: 'U1VTUElDSU9VUy1DTElFTlRT',  // SUSPICIOUS-CLIENTS
    amount: '$125,000.00',
    type: 'Inbound',
    flagged: false,
  },
  {
    id: 'TXN-78293',
    date: '2024-03-12',
    encoded: 'T0ZGU0hPUkUtVFJBTlNGRVI=',  // OFFSHORE-TRANSFER
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

  const { submitPuzzleAnswer, syncInput } = useRoom();
  const sharedInputs = useGameStore((state) => state.sharedInputs);

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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Transaction Logs
            </CardTitle>
            <CardDescription>
              Encoded transaction records from the Jerla account
            </CardDescription>
          </div>
          <Badge variant="warning">ENCODED DATA</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <FileText className="w-4 h-4" />
          <AlertTitle>Transaction Analysis</AlertTitle>
          <AlertDescription>
            The transaction descriptions have been encoded using a common encoding scheme.
            Decode the flagged transaction (TXN-78291) to reveal important details about
            suspicious fund movements.
          </AlertDescription>
        </Alert>

        <div className="bg-black/30 rounded-lg overflow-hidden">
          <div className="grid grid-cols-5 gap-4 p-4 border-b border-border/50 text-xs font-medium text-muted-foreground">
            <div>TXN ID</div>
            <div>DATE</div>
            <div>DESCRIPTION (ENCODED)</div>
            <div>AMOUNT</div>
            <div>TYPE</div>
          </div>

          {TRANSACTIONS.map((txn) => (
            <div
              key={txn.id}
              className={`grid grid-cols-5 gap-4 p-4 border-b border-border/30 last:border-0 transition-colors ${
                txn.flagged ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : 'hover:bg-white/5'
              }`}
            >
              <div className="font-mono text-sm flex items-center gap-2">
                {txn.id}
                {txn.flagged && (
                  <Badge variant="warning" className="text-[10px] px-1">FLAG</Badge>
                )}
              </div>
              <div className="font-mono text-sm text-muted-foreground">{txn.date}</div>
              <div className="encrypted-text font-mono text-xs break-all">{txn.encoded}</div>
              <div className="font-mono text-sm text-green-400">{txn.amount}</div>
              <div>
                <Badge
                  variant={txn.type === 'Inbound' ? 'success' : txn.type === 'Transfer' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {txn.type}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/30 rounded-lg p-4 flex items-start gap-3">
          <ArrowRight className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <div className="font-medium mb-1">Encoding Pattern</div>
            <p className="text-muted-foreground">
              The description fields use a standard encoding commonly seen in email attachments
              and URL parameters. The encoded text consists of letters (A-Z, a-z), numbers (0-9),
              plus signs (+), slashes (/), and ends with equals signs (=) for padding.
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
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Decoded Transaction Description (TXN-78291)
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={answer}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Enter decoded description"
                  className="font-mono uppercase bg-black/30"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!answer.trim() || isSubmitting}
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
