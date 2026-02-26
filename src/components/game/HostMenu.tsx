import { useState } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Settings,
  X,
  StopCircle,
  Lock,
  Unlock,
  UserX,
  Crown,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export function HostMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [kickingPlayer, setKickingPlayer] = useState<string | null>(null);

  const { endGame, setRoomLock, kickPlayer, isLocked } = useRoom();
  const { players, isHost, playerId } = useGameStore();

  // Only show menu for host
  if (!isHost) return null;

  const handleEndGame = async () => {
    await endGame();
    setShowEndConfirm(false);
    setIsOpen(false);
  };

  const handleToggleLock = async () => {
    await setRoomLock(!isLocked);
  };

  const handleKickPlayer = async (targetId: string) => {
    setKickingPlayer(targetId);
    await kickPlayer(targetId);
    setKickingPlayer(null);
  };

  const otherPlayers = players.filter((p) => p.id !== playerId);

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full shadow-lg bg-white/10 border-white/30 hover:bg-white/20 text-white sm:h-12 sm:w-12"
      >
        {isOpen ? (
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        ) : (
          <div className="relative">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            <Crown className="absolute -top-1 -right-1 h-3 w-3 text-amber-400" />
          </div>
        )}
      </Button>

      {/* Menu Panel */}
      <div
        className={`fixed top-16 right-4 z-40 w-72 sm:w-80 transition-all duration-300 ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="glass-card rounded-xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-400" />
              <span className="font-medium text-sm text-white">Host Controls</span>
            </div>
            <Badge variant="outline" className="text-xs border-white/30 text-white/80">
              Room Leader
            </Badge>
          </div>

          {/* Menu Items */}
          <div className="p-3 space-y-2">
            {/* Lock/Unlock Room */}
            <button
              onClick={handleToggleLock}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left"
            >
              {isLocked ? (
                <Unlock className="h-4 w-4 text-green-400" />
              ) : (
                <Lock className="h-4 w-4 text-amber-400" />
              )}
              <div className="flex-1">
                <div className="text-sm text-white font-medium">
                  {isLocked ? 'Unlock Room' : 'Lock Room'}
                </div>
                <div className="text-xs text-white/60">
                  {isLocked
                    ? 'Allow new players to join'
                    : 'Prevent new players from joining'}
                </div>
              </div>
              {isLocked && (
                <Badge variant="warning" className="text-[10px]">
                  Locked
                </Badge>
              )}
            </button>

            {/* Divider */}
            <div className="h-px bg-white/20 my-2" />

            {/* Kick Players Section */}
            {otherPlayers.length > 0 && (
              <>
                <div className="px-3 py-1">
                  <span className="text-xs text-white/60 font-medium">
                    KICK PLAYER
                  </span>
                </div>
                {otherPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleKickPlayer(player.id)}
                    disabled={kickingPlayer === player.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-left group disabled:opacity-50"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium text-white">
                      {player.nickname.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm text-white/90 group-hover:text-white">
                      {player.nickname}
                    </span>
                    {kickingPlayer === player.id ? (
                      <Loader2 className="h-4 w-4 text-white/60 animate-spin" />
                    ) : (
                      <UserX className="h-4 w-4 text-white/40 group-hover:text-red-400" />
                    )}
                  </button>
                ))}
                <div className="h-px bg-white/20 my-2" />
              </>
            )}

            {/* End Game */}
            {!showEndConfirm ? (
              <button
                onClick={() => setShowEndConfirm(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-colors text-left group"
              >
                <StopCircle className="h-4 w-4 text-red-400" />
                <div className="flex-1">
                  <div className="text-sm text-white font-medium group-hover:text-red-400">
                    End Game
                  </div>
                  <div className="text-xs text-white/60">
                    Return everyone to the lobby
                  </div>
                </div>
              </button>
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-red-400 font-medium">
                      End the game?
                    </div>
                    <div className="text-xs text-white/70">
                      All progress will be lost.
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={handleEndGame}
                  >
                    End Game
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-white/30 text-white hover:bg-white/10"
                    onClick={() => setShowEndConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
