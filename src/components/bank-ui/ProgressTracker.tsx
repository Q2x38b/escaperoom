import { useGameStore } from '../../stores/gameStore';
import { Check, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

const PUZZLE_NAMES = [
  'Wire Transfers',
  'Transaction Logs',
  'Hidden Files',
];

const PUZZLE_NAMES_SHORT = [
  'Wire',
  'Logs',
  'Files',
];

const TOTAL_PUZZLES = 3;

export function ProgressTracker() {
  const { currentPuzzle, solvedPuzzles } = useGameStore();

  return (
    <div className="bg-card border border-white/20 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs text-white/80 font-medium tracking-wide">
          INVESTIGATION PROGRESS
        </span>
        <span className="text-xs text-white/80">
          {solvedPuzzles.length}/{TOTAL_PUZZLES}
        </span>
      </div>

      {/* Progress steps */}
      <div className="flex flex-col gap-3">
        {/* Circles and connectors row */}
        <div className="flex items-center justify-between px-2">
          {PUZZLE_NAMES.map((_, index) => {
            const isSolved = solvedPuzzles.includes(index);
            const isCurrent = currentPuzzle === index;
            const isLocked = index > currentPuzzle;
            const prevSolved = index > 0 && solvedPuzzles.includes(index - 1);

            return (
              <div key={index} className="flex items-center flex-1 last:flex-none">
                {/* Circle */}
                <div
                  className={cn(
                    'w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all shrink-0',
                    isSolved && 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30',
                    isCurrent && !isSolved && 'bg-white text-black ring-2 ring-white/30',
                    isLocked && 'bg-white/10 text-white/50'
                  )}
                >
                  {isSolved ? (
                    <Check className="w-4 h-4" />
                  ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {/* Connector line */}
                {index < PUZZLE_NAMES.length - 1 && (
                  <div
                    className={cn(
                      'h-[2px] flex-1 mx-3 transition-colors rounded-full',
                      isSolved ? 'bg-green-500/50' : 'bg-white/15'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        {/* Labels row */}
        <div className="flex justify-between px-2">
          {PUZZLE_NAMES.map((name, index) => {
            const isSolved = solvedPuzzles.includes(index);
            const isCurrent = currentPuzzle === index;
            const isLocked = index > currentPuzzle;

            // Calculate width based on position
            const isFirst = index === 0;
            const isLast = index === PUZZLE_NAMES.length - 1;

            return (
              <div
                key={index}
                className={cn(
                  'text-center',
                  isFirst && 'text-left w-20 sm:w-24',
                  isLast && 'text-right w-20 sm:w-24',
                  !isFirst && !isLast && 'flex-1'
                )}
              >
                <span
                  className={cn(
                    'text-[10px] sm:text-xs',
                    isSolved && 'text-green-400',
                    isCurrent && !isSolved && 'text-white font-medium',
                    isLocked && 'text-white/50'
                  )}
                >
                  <span className="hidden sm:inline">{name}</span>
                  <span className="sm:hidden">{PUZZLE_NAMES_SHORT[index]}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500 rounded-full"
          style={{ width: `${(solvedPuzzles.length / TOTAL_PUZZLES) * 100}%` }}
        />
      </div>
    </div>
  );
}
