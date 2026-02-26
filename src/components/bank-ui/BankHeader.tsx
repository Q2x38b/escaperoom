import { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { PlayerChip } from '../game/PlayerChip';
import { useRoom } from '../../hooks/useRoom';
import { Shield, Copy, Check } from 'lucide-react';

export function BankHeader() {
  const { roomCode } = useRoom();
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
      <div className="container mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="font-medium text-sm text-white">Oceanview Private Banking</div>
            <div className="text-xs text-white/80">Secure Access Portal</div>
          </div>
        </div>

        {/* Center - Room Code */}
        {roomCode && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/80 hidden sm:inline">Room:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-7 sm:h-8 px-2 sm:px-3 gap-1.5 sm:gap-2 font-mono text-xs sm:text-sm tracking-wider text-white hover:bg-white/10"
            >
              {roomCode}
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 text-white/80" />
              )}
            </Button>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Verification Status */}
          <Badge variant="outline" className="security-badge border gap-1.5 hidden sm:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span className="text-xs">Secure</span>
          </Badge>

          {/* Player Count */}
          <PlayerChip />
        </div>
      </div>
    </header>
  );
}
