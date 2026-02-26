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
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-border flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="hidden sm:block">
            <div className="font-medium text-sm">Oceanview Private Banking</div>
            <div className="text-xs text-muted-foreground">Secure Access Portal</div>
          </div>
        </div>

        {/* Center - Room Code */}
        {roomCode && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Room:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-8 px-3 gap-2 font-mono text-sm tracking-wider hover:bg-muted"
            >
              {roomCode}
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
            </Button>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
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
