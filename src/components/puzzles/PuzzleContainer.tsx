import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { BankHeader } from '../bank-ui/BankHeader';
import { ProgressTracker } from '../bank-ui/ProgressTracker';
import { ChatPanel } from '../game/ChatPanel';
import { Puzzle1Hex } from './Puzzle1Hex';
import { Puzzle2Base64 } from './Puzzle2Base64';
import { Puzzle3Binary } from './Puzzle3Binary';
import { Users, X } from 'lucide-react';

export function PuzzleContainer() {
  const currentPuzzle = useGameStore((state) => state.currentPuzzle);
  const [showTip, setShowTip] = useState(true);

  const renderPuzzle = () => {
    switch (currentPuzzle) {
      case 0:
        return <Puzzle1Hex />;
      case 1:
        return <Puzzle2Base64 />;
      case 2:
        return <Puzzle3Binary />;
      default:
        return <Puzzle1Hex />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <BankHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Progress */}
          <ProgressTracker />

          {/* Collaboration Tip */}
          {showTip && (
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4 shrink-0" />
                <span>
                  <span className="text-foreground font-medium">Team mode:</span> Only one person can type at a time. Use chat to coordinate.
                </span>
              </div>
              <button
                onClick={() => setShowTip(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Current Puzzle */}
          <div className="animate-in fade-in duration-300">
            {renderPuzzle()}
          </div>
        </div>
      </main>

      {/* Team Chat */}
      <ChatPanel />
    </div>
  );
}
