import { useGameStore } from '../../stores/gameStore';
import { useRoom } from '../../hooks/useRoom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Users, Copy, Check, Play, Crown, Loader2, X, DoorClosed, MapPin } from 'lucide-react';
import { useState } from 'react';

export function WaitingRoom() {
  const { roomId, players, isHost, playerId } = useGameStore();
  const { startGameWithLocations, roomCode, kickPlayer, closeRoom } = useRoom();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [kickingPlayer, setKickingPlayer] = useState<string | null>(null);

  const canStart = players.length >= 2;
  const displayCode = roomCode || roomId;

  const handleKickPlayer = async (targetId: string) => {
    setKickingPlayer(targetId);
    await kickPlayer(targetId);
    setKickingPlayer(null);
  };

  const handleCloseRoom = async () => {
    await closeRoom();
  };

  const handleCopyCode = async () => {
    if (displayCode) {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    await startGameWithLocations();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <Card className="bank-card">
          {/* Header with title and host controls on desktop */}
          <div className="p-6 pb-0">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="text-center lg:text-left">
                <h1 className="text-2xl font-semibold text-white">Investigation Briefing Room</h1>
                <p className="text-white/60 mt-1">Share the room code with your team to join</p>
              </div>

              {/* Host controls - shown in header on desktop */}
              {isHost && (
                <div className="hidden lg:flex items-center gap-3">
                  {showCloseConfirm ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCloseRoom}
                      >
                        Confirm Close
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/30 text-white hover:bg-white/10"
                        onClick={() => setShowCloseConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-white/70 border-white/20 hover:bg-white/10"
                      onClick={() => setShowCloseConfirm(true)}
                    >
                      <DoorClosed className="w-4 h-4 mr-2" />
                      Close Room
                    </Button>
                  )}
                  <Button
                    onClick={handleStartGame}
                    disabled={!canStart || isStarting}
                    className="bg-white text-black hover:bg-white/90 px-6"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Begin Investigation
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <CardContent className="p-6 pt-6">
            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column - Room Code */}
              <div className="lg:col-span-1">
                <div className="bg-white/5 border border-white/20 rounded-xl p-6 text-center h-full flex flex-col justify-center">
                  <div className="text-xs text-white/60 mb-3 font-mono tracking-wider">ROOM CODE</div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl sm:text-4xl font-mono tracking-[0.2em] text-white tabular-nums">
                      {displayCode}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyCode}
                      aria-label={copied ? "Room code copied" : `Copy room code ${displayCode}`}
                      className="h-9 w-9"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                  {!canStart && isHost && (
                    <p className="text-xs text-amber-400/80 mt-4">
                      Need at least 2 investigators to begin
                    </p>
                  )}
                </div>
              </div>

              {/* Middle column - Players */}
              <div className="lg:col-span-1">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Investigation Team</span>
                    <Badge variant={canStart ? 'success' : 'warning'} className="tabular-nums">
                      <Users className="w-3 h-3 mr-1" />
                      <span>{players.length}/6</span>
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between bg-white/10 rounded-lg px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium text-white">
                            {player.nickname.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-white text-sm">
                            {player.nickname}
                            {player.id === playerId && (
                              <span className="text-xs text-white/50 ml-1.5">(you)</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {player.isHost && (
                            <Crown className="w-4 h-4 text-amber-400" />
                          )}
                          {isHost && !player.isHost && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${player.nickname} from room`}
                              className="h-7 w-7 text-white/50 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => handleKickPlayer(player.id)}
                              disabled={kickingPlayer === player.id}
                            >
                              {kickingPlayer === player.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <X className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {players.length < 6 && (
                      <div className="flex items-center justify-center bg-white/5 border border-dashed border-white/20 rounded-lg px-4 py-3 text-white/40">
                        <span className="text-sm">+ {6 - players.length} more can join</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column - Mission Info */}
              <div className="lg:col-span-1 space-y-4">
                {/* Mission Briefing */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="text-xs text-amber-400 font-mono mb-2 tracking-wider">MISSION BRIEFING</div>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Intelligence suggests the Vance family has been moving large sums through
                    offshore accounts. Trace the money trail and uncover their secrets.
                  </p>
                </div>

                {/* How to Play */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-medium text-blue-400 text-xs uppercase tracking-wider">Split Operations</span>
                  </div>
                  <ul className="space-y-1.5 text-white/70 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-medium text-xs mt-0.5">1.</span>
                      <span>Each player investigates a unique location</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-medium text-xs mt-0.5">2.</span>
                      <span>Solve 2 decoding puzzles at your location</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-medium text-xs mt-0.5">3.</span>
                      <span>All players must complete to win</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Mobile-only host controls */}
            {isHost && (
              <div className="lg:hidden mt-6 pt-6 border-t border-white/10 space-y-3">
                <Button
                  onClick={handleStartGame}
                  disabled={!canStart || isStarting}
                  className="w-full bg-white text-black hover:bg-white/90 h-12 text-base"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Begin Investigation
                    </>
                  )}
                </Button>

                {showCloseConfirm ? (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={handleCloseRoom}
                    >
                      Confirm Close
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-white/30 text-white hover:bg-white/10"
                      onClick={() => setShowCloseConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-white/70 border-white/20 hover:bg-white/10"
                    onClick={() => setShowCloseConfirm(true)}
                  >
                    <DoorClosed className="w-4 h-4 mr-2" />
                    Close Room
                  </Button>
                )}
              </div>
            )}

            {/* Non-host waiting message */}
            {!isHost && (
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-white/60" />
                <p className="text-sm text-white/60">
                  Waiting for host to start the investigation...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
