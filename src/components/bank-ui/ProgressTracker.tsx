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
    <div className="bg-card border border-white/20 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-white/80 font-medium tracking-wide">
          INVESTIGATION PROGRESS
        </span>
        <span className="text-xs text-white/80">
          {solvedPuzzles.length}/{TOTAL_PUZZLES}
        </span>
      </div>

      {/* Progress steps */}
      <div className="flex flex-col gap-2">
        {/* Circles and connectors row */}
        <div className="flex items-center">
          {PUZZLE_NAMES.map((_, index) => {
            const isSolved = solvedPuzzles.includes(index);
            const isCurrent = currentPuzzle === index;
            const isLocked = index > currentPuzzle;

            return (
              <div key={index} className="flex-1 flex items-center">
                <div className="flex-1 flex justify-center">
                  <div
                    className={cn(
                      'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all',
                      isSolved && 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30',
                      isCurrent && !isSolved && 'bg-white text-black ring-2 ring-white/30',
                      isLocked && 'bg-white/10 text-white/70'
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
                </div>
                {/* Connector */}
                {index < PUZZLE_NAMES.length - 1 && (
                  <div
                    className={cn(
                      'h-px w-full transition-colors',
                      isSolved ? 'bg-green-500/50' : 'bg-white/20'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        {/* Labels row */}
        <div className="flex">
          {PUZZLE_NAMES.map((name, index) => {
            const isSolved = solvedPuzzles.includes(index);
            const isCurrent = currentPuzzle === index;
            const isLocked = index > currentPuzzle;

            return (
              <div key={index} className="flex-1 text-center">
                <span
                  className={cn(
                    'text-[10px] sm:text-[11px]',
                    isSolved && 'text-green-400',
                    isCurrent && !isSolved && 'text-white font-medium',
                    isLocked && 'text-white/70'
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
      <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500 rounded-full"
          style={{ width: `${(solvedPuzzles.length / TOTAL_PUZZLES) * 100}%` }}
        />
      </div>
    </div>
  );
}
