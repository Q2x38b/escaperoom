import { useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { BankHeader } from '../bank-ui/BankHeader';
import { ProgressTracker } from '../bank-ui/ProgressTracker';
import { ChatPanel } from '../game/ChatPanel';
import { HostMenu } from '../game/HostMenu';
import { RolePuzzle } from './RolePuzzle';
import { Eye, Key, UserCheck, X } from 'lucide-react';

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

          {/* Role-Based Collaboration Tip */}
          {showTip && (
            <div className="flex flex-col gap-2 px-3 sm:px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Role-Based Teamwork</span>
                <button
                  onClick={() => setShowTip(false)}
                  className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-3 text-white/80">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-blue-400">Analyst</span> sees data
                </span>
                <span className="flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-400">Decoder</span> has keys
                </span>
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Field Agent</span> submits
                </span>
              </div>
              <p className="text-white/60 text-xs">
                Share info via chat - no one can solve it alone!
              </p>
            </div>
          )}

          {/* Current Puzzle - Role-based */}
          <div key={currentPuzzle} className="animate-in fade-in duration-300">
            <RolePuzzle puzzleIndex={currentPuzzle} />
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
