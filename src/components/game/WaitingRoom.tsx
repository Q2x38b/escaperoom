import { useGameStore } from '../../stores/gameStore';
import { useRoom } from '../../hooks/useRoom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
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
      <div className="w-full max-w-4xl">
        <Card className="bank-card">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Investigation Briefing Room</CardTitle>
            <CardDescription className="text-base">
              Share the room code with your team to join
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Main content grid - wider on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column - Room Code and Players */}
              <div className="space-y-6">
                {/* Room Code */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-6 text-center">
                  <div className="text-xs text-white/80 mb-3 font-mono tracking-wider">ROOM CODE</div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl sm:text-4xl font-mono tracking-[0.3em] text-white tabular-nums">
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
                </div>

                {/* Connected Players */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      Investigation Team
                    </span>
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
                          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium text-white">
                            {player.nickname.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-white">
                            {player.nickname}
                            {player.id === playerId && (
                              <span className="text-xs text-white/70 ml-2">(you)</span>
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
                              className="h-7 w-7 text-white/70 hover:text-red-400 hover:bg-red-500/10"
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
                      <div className="flex items-center justify-center bg-white/5 border border-dashed border-white/30 rounded-lg px-4 py-3 text-white/60">
                        <span className="text-sm">+ {6 - players.length} more can join...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column - Game Info and Controls */}
              <div className="space-y-6">
                {/* Mission Briefing */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5">
                  <div className="text-xs text-amber-400 font-mono mb-3 tracking-wider">MISSION BRIEFING</div>
                  <p className="text-sm text-white/90 leading-relaxed">
                    Intelligence suggests the Vance family has been moving large sums through
                    offshore accounts. Your team must trace the money trail and uncover their
                    secrets. Each agent will be sent to a different location to gather intel.
                  </p>
                </div>

                {/* How to Play */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-blue-400 text-sm">Split Operations</span>
                  </div>
                  <ul className="space-y-2 text-white/90 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-medium">1.</span>
                      <span>Each player is assigned a unique location to investigate</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-medium">2.</span>
                      <span>Solve 2 decoding puzzles at your location</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 font-medium">3.</span>
                      <span>All players must complete their puzzles to win</span>
                    </li>
                  </ul>
                </div>

                <Separator className="bg-white/20" />

                {/* Host Controls */}
                {isHost ? (
                  <div className="space-y-3">
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
                    {!canStart && (
                      <p className="text-xs text-center text-white/70">
                        Need at least 2 investigators to begin
                      </p>
                    )}

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
                        className="w-full text-white/80 border-white/30 hover:bg-white/10"
                        onClick={() => setShowCloseConfirm(true)}
                      >
                        <DoorClosed className="w-4 h-4 mr-2" />
                        Close Room
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin text-white/80" />
                    <p className="text-sm text-white/80">
                      Waiting for host to start the investigation...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
