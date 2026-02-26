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
  FileCode, AlertCircle, Lightbulb, Binary, Send, Loader2, FolderOpen
} from 'lucide-react';

// PLANE in binary:
// P = 80 = 01010000
// L = 76 = 01001100
// A = 65 = 01000001
// N = 78 = 01001110
// E = 69 = 01000101
const BINARY_DATA = {
  filename: 'secret_asset.bin',
  size: '256 bytes',
  modified: '2024-03-10 03:42:18',
  contents: [
    '01010000 01001100 01000001 01001110 01000101',  // PLANE
    '01010010 01000101 01000111 01001001 01010011 01010100 01010010 01011001', // REGISTRY
    '01001110 00110111 00110011 00111000 01010110 01001110', // N738VN (hidden hint)
  ],
};

const PUZZLE_INDEX = 2;

export function Puzzle3Binary() {
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
      setError('Incorrect. The decoded asset type does not match our records.');
    }
    // Victory is handled by the store when finalPasscode is received

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
              <FileCode className="w-5 h-5" />
              Hidden Files
            </CardTitle>
            <CardDescription>
              Encrypted binary data from the secure server
            </CardDescription>
          </div>
          <Badge variant="warning">BINARY DATA</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <FolderOpen className="w-4 h-4" />
          <AlertTitle>Hidden File Discovery</AlertTitle>
          <AlertDescription>
            Our forensic team discovered a hidden file on the Vance family's secure server.
            The file contains binary-encoded text. Decode the first line to identify
            the asset purchased with the offshore funds.
          </AlertDescription>
        </Alert>

        <div className="bg-black rounded-lg overflow-hidden border border-border/50">
          <div className="bg-muted/30 px-4 py-2 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-sm">{BINARY_DATA.filename}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{BINARY_DATA.size}</span>
              <span>{BINARY_DATA.modified}</span>
            </div>
          </div>

          <div className="p-4 font-mono text-sm">
            <div className="text-xs text-muted-foreground mb-2">// Binary contents:</div>
            {BINARY_DATA.contents.map((line, index) => (
              <div
                key={index}
                className={`py-2 px-3 rounded ${
                  index === 0
                    ? 'bg-amber-500/10 border border-amber-500/30 mb-2'
                    : 'text-muted-foreground/50'
                }`}
              >
                <span className="text-muted-foreground/50 mr-4">{String(index + 1).padStart(2, '0')}:</span>
                <span className={index === 0 ? 'encrypted-text' : ''}>
                  {line}
                </span>
                {index === 0 && (
                  <Badge variant="warning" className="ml-3 text-[10px]">DECODE THIS</Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-4 flex items-start gap-3">
          <Binary className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <div className="font-medium mb-1">Binary to ASCII</div>
            <p className="text-muted-foreground mb-2">
              Each group of 8 bits (binary digits) represents one ASCII character.
              Convert binary to decimal, then look up the ASCII character.
            </p>
            <div className="bg-black/30 rounded p-3 font-mono text-xs space-y-1">
              <div>Example: 01000001 = 65 (decimal) = 'A'</div>
              <div>Example: 01000010 = 66 (decimal) = 'B'</div>
            </div>
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
                Decoded Asset Type (First Line)
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={answer}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Enter decoded word"
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
