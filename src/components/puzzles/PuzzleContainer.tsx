import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { BankHeader } from '../bank-ui/BankHeader';
import { ProgressTracker } from '../bank-ui/ProgressTracker';
import { ChatPanel } from '../game/ChatPanel';
import { Puzzle1Hex } from './Puzzle1Hex';
import { Puzzle2Base64 } from './Puzzle2Base64';
import { Puzzle3Binary } from './Puzzle3Binary';
import { MessageSquare, Users, X } from 'lucide-react';

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
    <div className="min-h-screen bg-background grid-bg">
      <BankHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress */}
          <ProgressTracker />

          {/* Collaboration Tip */}
          {showTip && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 flex items-center justify-between animate-in fade-in duration-300">
              <div className="flex items-center gap-3 text-sm">
                <Users className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-muted-foreground">
                  <span className="text-blue-400 font-medium">Team mode:</span> Only one person can type at a time. Use the
                  <MessageSquare className="w-3 h-3 inline mx-1 text-blue-400" />
                  chat (bottom right) to coordinate!
                </span>
              </div>
              <button
                onClick={() => setShowTip(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Current Puzzle */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderPuzzle()}
          </div>
        </div>
      </main>

      {/* Team Chat */}
      <ChatPanel />
    </div>
  );
}
