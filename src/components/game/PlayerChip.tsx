import { useGameStore } from '../../stores/gameStore';
import { Badge } from '../ui/badge';
import { Users } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PlayerChipProps {
  className?: string;
  showMax?: boolean;
}

export function PlayerChip({ className, showMax = true }: PlayerChipProps) {
  const players = useGameStore((state) => state.players);
  const count = players.length;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 px-3 py-1 text-white/90',
        count >= 2 && 'border-green-500/50 text-green-400',
        className
      )}
    >
      <Users className="w-3 h-3" />
      <span className="font-mono">
        {count}
        {showMax && '/4'}
      </span>
      <span className="text-white/70 text-xs ml-1">
        Connected
      </span>
    </Badge>
  );
}
