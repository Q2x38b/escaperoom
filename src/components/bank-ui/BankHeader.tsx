import { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { PlayerChip } from '../game/PlayerChip';
import { useRoom } from '../../hooks/useRoom';
import { useGameStore } from '../../stores/gameStore';
import { Copy, Check, MessageSquare, Settings, Crown } from 'lucide-react';

interface BankHeaderProps {
  isChatOpen?: boolean;
  onChatToggle?: () => void;
  isHostMenuOpen?: boolean;
  onHostMenuToggle?: () => void;
  unreadCount?: number;
}

export function BankHeader({
  isChatOpen,
  onChatToggle,
  isHostMenuOpen,
  onHostMenuToggle,
  unreadCount = 0,
}: BankHeaderProps) {
  const { roomCode } = useRoom();
  const isHost = useGameStore((state) => state.isHost);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="border-b border-white/20 bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 h-12 sm:h-14 flex items-center justify-between">
        {/* Left - Room Code */}
        {roomCode && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60 hidden sm:inline">Room:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              aria-label={copied ? "Room code copied" : `Copy room code ${roomCode}`}
              className="h-7 sm:h-8 px-2 sm:px-3 gap-1.5 sm:gap-2 font-mono text-xs sm:text-sm tracking-wider text-white hover:bg-white/10"
            >
              <span aria-hidden="true">{roomCode}</span>
              {copied ? (
                <Check className="w-3 h-3 text-green-500" aria-hidden="true" />
              ) : (
                <Copy className="w-3 h-3 text-white/60" aria-hidden="true" />
              )}
            </Button>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Player Count */}
          <PlayerChip showMax={false} />

          {/* Chat Button */}
          {onChatToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onChatToggle}
              aria-label={isChatOpen ? "Close chat" : `Open chat${unreadCount > 0 ? `, ${unreadCount} unread messages` : ''}`}
              aria-expanded={isChatOpen}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 text-white relative"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {unreadCount > 0 && !isChatOpen && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] pointer-events-none"
                  aria-hidden="true"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          )}

          {/* Host Menu Button - only visible to host */}
          {isHost && onHostMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onHostMenuToggle}
              aria-label={isHostMenuOpen ? "Close host menu" : "Open host menu"}
              aria-expanded={isHostMenuOpen}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 text-white"
            >
              <div className="relative">
                <Settings className="h-4 w-4" aria-hidden="true" />
                <Crown className="absolute -top-1 -right-1 h-2.5 w-2.5 text-amber-400" aria-hidden="true" />
              </div>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
