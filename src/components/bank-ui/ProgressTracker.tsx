import { useGameStore } from '../../stores/gameStore';
import { Check, Lock, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';

const PUZZLE_NAMES = [
  'Wire Transfers',
  'Transaction Logs',
  'Hidden Files',
];

const TOTAL_PUZZLES = 3;

export function ProgressTracker() {
  const { currentPuzzle, solvedPuzzles } = useGameStore();

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-xs text-muted-foreground mb-4 font-medium">
        INVESTIGATION PROGRESS
      </div>

      <div className="flex items-center justify-between gap-2">
        {PUZZLE_NAMES.map((name, index) => {
          const isSolved = solvedPuzzles.includes(index);
          const isCurrent = currentPuzzle === index;
          const isLocked = index > currentPuzzle;

          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              {/* Step indicator */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                  isSolved && 'bg-green-500/20 border-green-500 text-green-400',
                  isCurrent && !isSolved && 'border-primary bg-primary/20 text-primary animate-pulse',
                  isLocked && 'border-muted bg-muted/20 text-muted-foreground'
                )}
              >
                {isSolved ? (
                  <Check className="w-4 h-4" />
                ) : isLocked ? (
                  <Lock className="w-3 h-3" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </div>

              {/* Step name */}
              <span
                className={cn(
                  'text-[10px] mt-2 text-center leading-tight',
                  isSolved && 'text-green-400',
                  isCurrent && !isSolved && 'text-primary',
                  isLocked && 'text-muted-foreground/50'
                )}
              >
                {name}
              </span>

              {/* Connector line */}
              {index < PUZZLE_NAMES.length - 1 && (
                <div
                  className={cn(
                    'absolute h-0.5 w-full max-w-[60px] left-1/2 top-4 -translate-y-1/2',
                    isSolved ? 'bg-green-500/50' : 'bg-muted'
                  )}
                  style={{ marginLeft: '40px' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${(solvedPuzzles.length / TOTAL_PUZZLES) * 100}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-center">
        {solvedPuzzles.length} of {TOTAL_PUZZLES} puzzles solved
      </div>
    </div>
  );
}
