import { Badge } from '../ui/badge';
import { PlayerChip } from '../game/PlayerChip';
import { Shield, CheckCircle2 } from 'lucide-react';

export function BankHeader() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">Oceanview Private Banking</div>
            <div className="text-xs text-muted-foreground">Secure Access Portal</div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Verification Status */}
          <Badge variant="outline" className="security-badge border gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            <span className="text-xs">2FA Verified</span>
          </Badge>

          {/* Player Count */}
          <PlayerChip />
        </div>
      </div>
    </header>
  );
}
