import { useGameStore } from '../../stores/gameStore';
import { BankHeader } from '../bank-ui/BankHeader';
import { ProgressTracker } from '../bank-ui/ProgressTracker';
import { Puzzle1Hex } from './Puzzle1Hex';
import { Puzzle2Base64 } from './Puzzle2Base64';
import { Puzzle3Binary } from './Puzzle3Binary';

export function PuzzleContainer() {
  const currentPuzzle = useGameStore((state) => state.currentPuzzle);

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

          {/* Current Puzzle */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderPuzzle()}
          </div>
        </div>
      </main>
    </div>
  );
}
