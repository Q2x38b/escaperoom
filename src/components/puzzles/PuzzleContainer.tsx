import { useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { BankHeader } from '../bank-ui/BankHeader';
import { ProgressTracker } from '../bank-ui/ProgressTracker';
import { ChatPanel } from '../game/ChatPanel';
import { HostMenu } from '../game/HostMenu';
import { Puzzle1Hex } from './Puzzle1Hex';
import { Puzzle2Base64 } from './Puzzle2Base64';
import { Puzzle3Binary } from './Puzzle3Binary';
import { Users, X } from 'lucide-react';

export function PuzzleContainer() {
  const currentPuzzle = useGameStore((state) => state.currentPuzzle);
  const [showTip, setShowTip] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHostMenuOpen, setIsHostMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleChatToggle = useCallback(() => {
    setIsChatOpen(prev => !prev);
    // Close host menu when opening chat
    if (!isChatOpen) {
      setIsHostMenuOpen(false);
    }
  }, [isChatOpen]);

  const handleHostMenuToggle = useCallback(() => {
    setIsHostMenuOpen(prev => !prev);
    // Close chat when opening host menu
    if (!isHostMenuOpen) {
      setIsChatOpen(false);
    }
  }, [isHostMenuOpen]);

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
      <BankHeader
        isChatOpen={isChatOpen}
        onChatToggle={handleChatToggle}
        isHostMenuOpen={isHostMenuOpen}
        onHostMenuToggle={handleHostMenuToggle}
        unreadCount={unreadCount}
      />

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Progress */}
          <ProgressTracker />

          {/* Collaboration Tip */}
          {showTip && (
            <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white/5 border border-white/20 text-xs sm:text-sm">
              <div className="flex items-start sm:items-center gap-2 text-white/90">
                <Users className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  <span className="text-white font-medium">Team mode:</span>
                  <span className="hidden sm:inline"> Only one person can type at a time. Use chat to coordinate.</span>
                  <span className="sm:hidden"> One types, others chat.</span>
                </span>
              </div>
              <button
                onClick={() => setShowTip(false)}
                className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Current Puzzle */}
          <div key={currentPuzzle} className="animate-in fade-in duration-300">
            {renderPuzzle()}
          </div>
        </div>
      </main>

      {/* Team Chat */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />

      {/* Host Controls */}
      <HostMenu
        isOpen={isHostMenuOpen}
        onClose={() => setIsHostMenuOpen(false)}
      />
    </div>
  );
}
